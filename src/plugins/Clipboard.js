import OverlayPlugin from './util/OverlayPlugin';
import '@/components/GmChip.js';

import log from 'loglevel';
log.setDefaultLevel('debug');

// This is the moderne way (baseline 2020) to handle utf8 base64 conversion.
const b64ToUtf8 = (str) => {
    return new TextDecoder('utf-8', { fatal: true }).decode(
        Uint8Array.from(window.atob(str), (c) => c.charCodeAt(0)),
    );
};

const utf8ToB64 = (str) => {
    return window.btoa(
        Array.from(new TextEncoder().encode(str), (c) =>
            String.fromCharCode(c),
        ).join(''),
    );
};

const QT_PASTE_KEYCODE = parseInt('0x010000e2', 16);

/**
 * Instance clipboard plugin.
 * Provides clipboard data exchange capability between client and instance.
 */
export default class Clipboard extends OverlayPlugin {
    static get name() {
        return 'Clipboard';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     * @param {Object} i18n     Translations keys for the UI.
     */
    constructor(instance, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};

        // Register plugin
        this.instance.clipboard = this;

        // clipboard text
        this.clipboard = '';

        // Display widget
        this.registerToolbarButton();
        this.renderWidget();

        // Listen for framework messages: "clipboard <from_android|from_renderer> <base64>"
        this.instance.registerEventCallback('framework', (message) => {
            const values = message.split(' ');
            if (values.length !== 3 || values[0] !== 'clipboard') {
                return;
            }

            try {
                this.clipboard = b64ToUtf8(values[2]);
                if (this.clipboard !== this.clipboardInput.value) {
                    if (this.appliedTag) {
                        this.appliedTag.visible = false;
                    }
                }
                this.clipboardInput.value = this.clipboard;
                // Write to system clipboard if the message is from the instance
                this.writeToSystemClipboard(this.clipboard);
            } catch (error) {
                log.warn('Malformed clipboard content');
            }
        });

        this.instance.store.dispatch({type: 'AUTO_PASTE_ACTIVE', payload: true});
        this.activeAutoClipboard();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-clipboard-button',
            title: this.i18n.CLIPBOARD_TITLE || 'Clipboard',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.CLIPBOARD_TITLE || 'Device Clipboard',
            classes: 'gm-clipboard-plugin',
            width: 378,
            height: 484,
        });
        this.container = container;

        const text = document.createElement('div');
        text.className = 'gm-clipboard-text';
        text.innerHTML =
            this.i18n.CLIPBOARD_TEXT ||
            // eslint-disable-next-line max-len
            "The text you enter here will be copied to your virtual device's clipboard. Likewise, any text you copy from your virtual device will appear here.";

        this.clipboardInput = document.createElement('textarea');
        this.clipboardInput.className = 'gm-clipboard-input';
        this.clipboardInput.placeholder = this.i18n.CLIPBOARD_PLACEHOLDER || 'Write your content here';
        this.clipboardInput.oninput = (event) => {
            this.appliedTag.visible = false;
            if (event.target.value.length > 0) {
                this.submitBtn.disabled = false;
            } else {
                this.submitBtn.disabled = true;
            }
        };

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gm-actions';
        const appliedTag = document.createElement('gm-chip');
        appliedTag.value = this.i18n.CLIPBOARD_COPIED || 'Copied';
        appliedTag.visible = false;
        this.appliedTag = appliedTag;

        this.submitBtn = document.createElement('button');
        this.submitBtn.innerHTML = this.i18n.CLIPBOARD_COPY || 'Copy to device';
        this.submitBtn.className = 'gm-btn gm-clipboard-apply';
        this.submitBtn.onclick = () => {
            this.appliedTag.visible = true;
            this.sendDataToInstance();
        };

        actionsDiv.appendChild(appliedTag);
        actionsDiv.appendChild(this.submitBtn);

        // Setup
        this.container.appendChild(text);
        this.container.appendChild(this.clipboardInput);
        this.container.appendChild(actionsDiv);
    }

    /**
     * Display or hide the widget.
     */
    toggleWidget() {
        super.toggleWidget();
        if (this.instance.store.getters.isWidgetOpened(this.overlayID)) {
            this.clipboardInput.value = this.clipboard;
            // put focus on the input field
            this.clipboardInput.focus();
        }
    }

    /**
     * Send information to instance.
     */
    sendDataToInstance() {
        const json = {
            channel: 'framework',
            messages: ['set_device_clipboard ' + utf8ToB64(this.clipboardInput.value)],
        };
        this.instance.sendEvent(json);
    }

    writeToSystemClipboard(text) {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            return;
        }

        navigator.clipboard.writeText(text).catch((error) => {
            if (error?.name === 'NotAllowedError') {
                log.debug('Clipboard write denied by browser permissions policy');
                return;
            }
            log.warn('Failed to write clipboard:', error);
        });
    }

    activeAutoClipboard() {
        if (!this.instance.video) {
            return;
        }

        this.removeKeyboardListener = this.instance.addListener(this.instance.video, 'keydown', async (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
                event.preventDefault();
                event.stopPropagation();

                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        const json = {
                            channel: 'framework',
                            messages: ['set_device_clipboard ' + utf8ToB64(text)],
                        };
                        this.instance.sendEvent(json);
                        // Send the corresponding key events to trigger paste in the instance and release
                        let keyboardEvent = {
                            type: 'KEYBOARD_PRESS',
                            keychar: '',
                            keycode: QT_PASTE_KEYCODE,
                        };
                        this.instance.sendEvent(keyboardEvent);
                        keyboardEvent = {
                            type: 'KEYBOARD_RELEASE',
                            keychar: '',
                            keycode: QT_PASTE_KEYCODE,
                        };
                        this.instance.sendEvent(keyboardEvent);
                    }
                } catch (error) {
                    log.warn('Failed to read clipboard:', error);
                }
            }
        });
    }

    destroy() {
        if (this.removeKeyboardListener) {
            this.removeKeyboardListener();
        }
        this.instance.store.dispatch({type: 'AUTO_PASTE_ACTIVE', payload: false});
    }
}
