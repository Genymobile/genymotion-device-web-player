'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Instance clipboard plugin.
 * Provides clipboard data exchange capability between client and instance.
 */
module.exports = class Clipboard extends OverlayPlugin {
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
        this.renderToolbarButton();
        this.renderWidget();

        // Listen for framework messages: "clipboard <from_android|from_renderer> <base64>"
        this.instance.registerEventCallback('framework', (message) => {
            const values = message.split(' ');
            if (values.length !== 3 || values[0] !== 'clipboard') {
                return;
            }

            try {
                this.clipboard = decodeURIComponent(escape(window.atob(values[2])));
            } catch (error) {
                log.warn('Malformed clipboard content');
            }
        });

        // Listen for initial clipboard status
        this.instance.registerEventCallback('CLIPBOARD', (text) => {
            this.clipboard = text;
        });
    }

    /**
     * Add the button to the renderer toolbar.
     */
    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-clipboard-button';
        this.toolbarBtnImage.title = this.i18n.CLIPBOARD_TITLE || 'Clipboard';
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        this.toolbarBtn.onclick = this.toggleWidget.bind(this);
        toolbar.appendChild(this.toolbarBtn);
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        this.widget = document.createElement('div');
        this.container = document.createElement('div');

        // Generate title
        const title = document.createElement('div');
        title.className = 'gm-title';
        title.innerHTML = this.i18n.CLIPBOARD_TITLE || 'Device Clipboard';
        this.container.appendChild(title);

        this.clipboardInput = document.createElement('textarea');
        this.clipboardInput.className = 'gm-clipboard-input';

        // Setup
        this.container.appendChild(this.clipboardInput);
        this.widget.className = 'gm-overlay gm-clipboard-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.className = 'gm-close-btn';
        close.onclick = this.toggleWidget.bind(this);

        this.widget.appendChild(close);
        this.widget.appendChild(this.container);

        this.widget.onclose = () => {
            this.clipboard = this.clipboardInput.value;
            this.sendDataToInstance();
        };

        // Render into document
        this.instance.root.appendChild(this.widget);
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
     * Copy the instance clipboard (reflected to the text input field) into the client clipboard.
     *
     * @param {HTMLElement} clipboardInput         Clipboard value (text input).
     * @param {HTMLElement} clipboardCopyIndicator Clipboard copy indicator.
     */
    copyInstanceClipboardToClient(clipboardInput, clipboardCopyIndicator) {
        try {
            navigator.clipboard.writeText(this.clipboardInput.value);
        } catch (error) {
            // Old, deprecated fallback
            clipboardInput.focus();
            clipboardInput.select();
            document.execCommand('copy');
        }

        clipboardCopyIndicator.classList.remove('gm-invisible');
        clipboardCopyIndicator.classList.remove('gm-hidden');
        setTimeout(() => {
            clipboardCopyIndicator.classList.add('gm-invisible');
            setTimeout(() => {
                clipboardCopyIndicator.classList.add('gm-hidden');
            }, 500);
        }, 2000);
    }

    /**
     * Send information to instance.
     */
    sendDataToInstance() {
        const json = {
            channel: 'framework',
            messages: ['set_device_clipboard ' + window.btoa(unescape(encodeURIComponent(this.clipboard)))],
        };
        this.instance.sendEvent(json);
    }
};
