'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {textInput, chipTag} = require('./util/components');

const HEX = '0123456789abcdef';
const DIGITS = '0123456789';

/**
 * Instance identifiers plugin.
 * Provides device ID (IMEI) and Android ID control.
 */
module.exports = class Identifiers extends OverlayPlugin {
    static get name() {
        return 'Identifiers';
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
        this.instance.identifiers = this;

        // Render components
        this.registerToolbarButton();
        this.renderWidget();

        // Listen for settings messages: "parameter <device_id/android_id>:<id>"
        this.instance.registerEventCallback('settings', (message) => {
            const values = message.split(' ');
            if (values[0] !== 'parameter' || values.length < 2) {
                return;
            }

            const deviceId = values[1].match(/(device_id:)(\w+)/);
            if (deviceId) {
                this.deviceInput.setValue(deviceId[2]);
            }
            const androidId = values[1].match(/(android_id:)(\w+)/);
            if (androidId) {
                this.androidInput.setValue(androidId[2]);
            }
            this.container.classList.add('gm-identifiers-saved');
        });
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-identifiers-button',
            title: this.i18n.IDENTIFIERS_TITLE || 'Identifiers',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.IDENTIFIERS_TITLE || 'Identifiers',
            classes: 'gm-identifiers-plugin',
            width: 378,
            height: 446,
        });
        this.container = container;

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        // Build field list
        const androidInputDiv = document.createElement('div');
        androidInputDiv.className = 'gm-identifier-android';
        const labelAndroidId = document.createElement('label');
        labelAndroidId.innerHTML = 'Android ID';
        this.androidInput = textInput.createTextInput({
            regexFilter: new RegExp(`^[${HEX}]{0,16}$`),
            regexValidField: new RegExp(`^[${HEX}]{16}$`),
            placeholder: 'e.g. 2b76129a48d5eb49',
            classes: 'gm-identifiers-android-input',
            messageField: true,
            onChange: () => {
                this.container.classList.remove('gm-identifiers-saved');
                this.checkIDsValidity();
                if (!this.androidInput.checkValidity()) {
                    this.androidInput.setErrorMessage('16 characters (0-9, A-F)');
                } else {
                    this.androidInput.setErrorMessage('');
                }
            },
        });
        const generateAndroidIdBtn = document.createElement('div');
        generateAndroidIdBtn.className = 'gm-icon-button gm-identifiers-android-generate';
        generateAndroidIdBtn.onclick = () => {
            this.container.classList.remove('gm-identifiers-saved');
            this.generateRandomAndroidId();
        };

        this.generateRandomAndroidId.bind(this);
        androidInputDiv.appendChild(this.androidInput.element);
        androidInputDiv.appendChild(generateAndroidIdBtn);
        inputs.appendChild(labelAndroidId);
        inputs.appendChild(androidInputDiv);

        const deviceInputDiv = document.createElement('div');
        deviceInputDiv.className = 'gm-identifier-device';
        const labelDeviceId = document.createElement('label');
        labelDeviceId.innerHTML = 'Device ID (IMEI/MEID)';
        this.deviceInput = textInput.createTextInput({
            regexFilter: new RegExp(`^[${HEX}]{0,15}$`),
            regexValidField: new RegExp(`^[${HEX}]{14,15}$`),
            placeholder: 'e.g. 194197097729256',
            classes: 'gm-identifiers-device-input',
            messageField: true,
            onChange: () => {
                this.container.classList.remove('gm-identifiers-saved');
                this.checkIDsValidity();
                if (!this.deviceInput.checkValidity()) {
                    this.deviceInput.setErrorMessage('14-15 characters (0-9, A-F)');
                } else {
                    this.deviceInput.setErrorMessage('');
                }
            },
        });
        const generateDeviceIdBtn = document.createElement('div');
        generateDeviceIdBtn.className = 'gm-icon-button gm-identifiers-device-generate';
        generateDeviceIdBtn.onclick = () => {
            this.container.classList.remove('gm-identifiers-saved');
            this.generateRandomDeviceId();
        };
        deviceInputDiv.appendChild(this.deviceInput.element);
        deviceInputDiv.appendChild(generateDeviceIdBtn);
        inputs.appendChild(labelDeviceId);
        inputs.appendChild(deviceInputDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gm-actions';
        const separator = document.createElement('div');
        separator.className = 'gm-separator';

        const appliedTag = chipTag.createChip();
        actionsDiv.appendChild(appliedTag.element);

        this.submitBtn = document.createElement('button');
        this.submitBtn.innerHTML = this.i18n.IDENTIFIERS_APPLY || 'Apply';
        this.submitBtn.className = 'gm-btn gm-identifiers-update';
        actionsDiv.appendChild(this.submitBtn);
        this.submitBtn.disabled = true;
        this.submitBtn.onclick = this.sendDataToInstance.bind(this);

        this.container.appendChild(inputs);
        this.container.appendChild(separator);
        this.container.appendChild(actionsDiv);
    }

    /**
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        const androidId = this.androidInput.getValue();
        const deviceId = this.deviceInput.getValue();

        if (androidId) {
            const json = {
                channel: 'framework',
                messages: ['set parameter android_id:' + androidId],
            };
            this.instance.sendEvent(json);
        }

        if (deviceId) {
            const json = {
                channel: 'settings',
                messages: ['set parameter device_id:' + deviceId],
            };
            this.instance.sendEvent(json);
        }
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

        this.androidInput.setValue(this.generateHash(16, HEX));
        this.checkIDsValidity();
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

        this.deviceInput.setValue(this.generateHash(15, DIGITS));
        this.checkIDsValidity();
    }

    /**
     * Check if the IDs are valid.
     */
    checkIDsValidity() {
        if (this.androidInput.checkValidity() && this.deviceInput.checkValidity()) {
            this.submitBtn.disabled = false;
        } else {
            this.submitBtn.disabled = true;
        }
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
