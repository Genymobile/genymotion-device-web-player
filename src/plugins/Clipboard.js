'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {chipTag} = require('./util/components');

const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Instance clipboard plugin.
 * Provides clipboard data exchange capability between client and instance.
 */
module.exports = class Clipboard extends OverlayPlugin {
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
                this.clipboard = decodeURIComponent(escape(window.atob(values[2])));
                if (this.clipboard !== this.clipboardInput.value) {
                    this.container.classList.remove('gm-clipboard-saved');
                }
                if (!this.instance.store.getters.isWidgetOpened(this.overlayID)) {
                    // if the widget is not opened, we update the clipboard input
                    this.clipboardInput.value = this.clipboard;
                }
            } catch (error) {
                log.warn('Malformed clipboard content');
            }
        });
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
        text.innerHTML =
            this.i18n.CLIPBOARD_TEXT ||
            "The content you type below will be copied directly to your virtual device's clipboard.";

        this.clipboardInput = document.createElement('textarea');
        this.clipboardInput.className = 'gm-clipboard-input';
        this.clipboardInput.placeholder = this.i18n.CLIPBOARD_PLACEHOLDER || 'Write your content here';
        this.clipboardInput.oninput = (event) => {
            this.container.classList.remove('gm-clipboard-saved');
            if (event.target.value.length > 0) {
                this.submitBtn.disabled = false;
            } else {
                this.submitBtn.disabled = true;
            }
        };

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gm-actions';
        const appliedTag = chipTag.createChip({
            text: this.i18n.CLIPBOARD_COPIED || 'Copied',
        });

        this.submitBtn = document.createElement('button');
        this.submitBtn.innerHTML = this.i18n.CLIPBOARD_COPY || 'Copy to device';
        this.submitBtn.className = 'gm-btn gm-clipboard-apply';
        this.submitBtn.onclick = () => {
            this.container.classList.add('gm-clipboard-saved');
            this.sendDataToInstance();
        };

        actionsDiv.appendChild(appliedTag.element);
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
            messages: ['set_device_clipboard ' + window.btoa(unescape(encodeURIComponent(this.clipboardInput.value)))],
        };
        this.instance.sendEvent(json);
    }
};
