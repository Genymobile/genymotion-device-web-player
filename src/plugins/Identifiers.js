'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const HEX = '0123456789abcdef';
const DIGITS = '0123456789';

/**
 * Instance identifiers plugin.
 * Provides device ID (IMEI) and Android ID control.
 */
module.exports = class Identifiers extends OverlayPlugin {
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
        this.instance.identifiers = this;

        // Initial state
        this.invalidAndroidId = false;
        this.invalidDeviceId = false;

        // Render components
        this.renderToolbarButton();
        this.renderWidget();

        // Listen for IDs from renderer
        this.instance.registerEventCallback('ANDROID_ID', (payload) => {
            this.androidInput.value = payload;
        });
        this.instance.registerEventCallback('IMEI', (payload) => {
            this.deviceInput.value = payload;
        });

        // Listen for settings messages: "parameter <device_id/android_id>:<id>"
        this.instance.registerEventCallback('settings', (message) => {
            const values = message.split(' ');
            if (values[0] !== 'parameter' || values.length < 2) {
                return;
            }

            const deviceId = values[1].match(/(device_id:)(\w+)/);
            if (deviceId) {
                this.deviceInput.value = deviceId[2];
            }
            const androidId = values[1].match(/(android_id:)(\w+)/);
            if (androidId) {
                this.androidInput.value = androidId[2];
            }
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
        this.toolbarBtnImage.className = 'gm-icon-button gm-identifiers-button';
        this.toolbarBtnImage.title = this.i18n.IDENTIFIERS_TITLE || 'Identifiers';
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
        title.innerHTML = this.i18n.IDENTIFIERS_TITLE || 'Identifiers';
        this.container.appendChild(title);

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        // Build field list
        const android = this.generateInput(
            'android',
            'Android ID',
            '',
            this.generateRandomAndroidId.bind(this),
            this.validateAndroidId.bind(this),
        );
        const device = this.generateInput(
            'device',
            'Device ID',
            '(IMEI/MEID)',
            this.generateRandomDeviceId.bind(this),
            this.validateDeviceId.bind(this),
        );
        inputs.appendChild(android);
        inputs.appendChild(device);

        this.submitBtn = document.createElement('button');
        this.submitBtn.innerHTML = this.i18n.IDENTIFIERS_UPDATE || 'Update';
        this.submitBtn.className = 'gm-action gm-identifiers-update';
        inputs.appendChild(this.submitBtn);
        this.submitBtn.onclick = this.sendDataToInstance.bind(this);

        this.container.appendChild(inputs);

        // Setup
        this.widget.className = 'gm-overlay gm-identifiers-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.className = 'gm-close-btn';
        close.onclick = this.toggleWidget.bind(this);

        this.widget.appendChild(close);
        this.widget.appendChild(this.container);

        // Render into document
        this.instance.root.appendChild(this.widget);
    }

    /**
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        const androidId = this.androidInput.value;
        const deviceId = this.deviceInput.value;

        if (androidId && this.androidInput.checkValidity()) {
            const json = {
                channel: 'framework',
                messages: ['set parameter android_id:' + androidId],
            };
            this.instance.sendEvent(json);
        }

        if (deviceId && this.deviceInput.checkValidity()) {
            const json = {
                channel: 'settings',
                messages: ['set parameter device_id:' + deviceId],
            };
            this.instance.sendEvent(json);
        }
        this.toggleWidget();
    }

    /**
     * Generate a new random Android ID.
     *
     * @param {Event} event Event.
     */
    generateRandomAndroidId(event) {
        if (event) {
            event.preventDefault();
        }

        this.androidInput.value = this.generateHash(16, HEX);
        this.invalidAndroidId = false;
        this.checkErrors();
    }

    /**
     * Validate Android ID input value.
     */
    validateAndroidId() {
        this.invalidAndroidId = !this.androidInput.checkValidity();
        this.checkErrors();
    }

    /**
     * Generate a new random Device ID.
     *
     * @param {Event} event Event.
     */
    generateRandomDeviceId(event) {
        if (event) {
            event.preventDefault();
        }

        this.deviceInput.value = this.generateHash(15, DIGITS);
        this.invalidDeviceId = false;
        this.checkErrors();
    }

    /**
     * Validate Device ID input value.
     */
    validateDeviceId() {
        this.invalidDeviceId = !this.deviceInput.checkValidity();
        this.checkErrors();
    }

    /**
     * Input form validation.
     */
    checkErrors() {
        this.androidInput.classList[this.invalidAndroidId ? 'add' : 'remove']('gm-error');
        this.deviceInput.classList[this.invalidDeviceId ? 'add' : 'remove']('gm-error');

        this.submitBtn.disabled = this.invalidAndroidId || this.invalidDeviceId;
    }

    /**
     * Create a form field element.
     *
     * @param  {string}      type             Input type.
     * @param  {string}      label            Input label.
     * @param  {string}      description      Input description.
     * @param  {string}      generationMethod Input random value generation method.
     * @param  {string}      validationMethod Input value validation method.
     * @return {HTMLElement}                  The created input.
     */
    generateInput(type, label, description, generationMethod, validationMethod) {
        const field = document.createElement('div');
        const inputWrap = document.createElement('div');
        const input = document.createElement('input');
        const button = document.createElement('button');

        inputWrap.className = 'gm-input-group';
        input.className = 'gm-identifier-' + type + '-input';
        input.type = 'text';
        input.required = true;
        this.instance.addListener(input, 'keyup', validationMethod);
        inputWrap.appendChild(input);

        // Some customization
        if (type === 'device') {
            input.maxLength = 15;
            input.pattern = '[' + HEX + ']{14,15}';
        } else if (type === 'android') {
            input.maxLength = 16;
            input.pattern = '[' + HEX + ']{16}';
        }

        button.className = 'gm-identifier-' + type + '-generate';
        button.innerHTML = this.i18n.IDENTIFIERS_GENERATE || 'Generate';
        button.onclick = generationMethod;
        inputWrap.appendChild(button);

        field.className = 'gm-identifier-' + type;
        field.innerHTML = '<label>' + label + '<i class="gm-description">' + description + '</i>' + '</label>';
        field.appendChild(inputWrap);

        this[type + 'Input'] = input;
        this[type + 'Gen'] = button;

        return field;
    }

    /**
     * Generate random 16 chars hash.
     *
     * @param  {number} length   Hash length.
     * @param  {string} alphabet Characters to use in for hash.
     * @return {string}          The generated hash.
     */
    generateHash(length, alphabet) {
        let hash = '';

        for (let i = 0; i < length; i++) {
            hash += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }

        return hash;
    }
};
