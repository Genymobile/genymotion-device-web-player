'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

/**
 * Instance phone plugin.
 * Provides phone call and SMS support.
 */
module.exports = class Phone extends OverlayPlugin {
    static get name() {
        return 'Phone';
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
        this.instance.phone = this;

        // Render components
        this.registerToolbarButton();
        this.renderWidget();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-phone-button',
            title: this.i18n.PHONE_TITLE || 'Phone',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {modal, container} = this.createTemplateModal({
            title: this.i18n.PHONE_TITLE || 'Phone',
            classes: 'gm-phone-plugin',
        });

        // TODO delete this line in the PR which will refacto this plugin, keep for css compatibility
        modal.classList.add('gm-overlay');

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        // Phone group
        const phoneGroup = document.createElement('div');
        this.phoneInput = document.createElement('input');
        this.phoneBtn = document.createElement('button');
        this.phoneInput.type = 'text';
        this.phoneInput.className = 'gm-phone-number';
        this.phoneInput.placeholder = this.i18n.PHONE_CALL_PLACEHOLDER || 'Please enter the phone number';
        this.instance.addListener(this.phoneInput, 'keyup', this.validate.bind(this));
        this.phoneBtn.className = 'gm-phone-call';
        this.phoneBtn.innerHTML = this.i18n.PHONE_CALL || 'Call';
        this.phoneBtn.onclick = this.sendPhoneCallToInstance.bind(this);
        this.phoneBtn.disabled = true;

        const incomingPhoneLabel = this.i18n.PHONE_INCOMING || 'Incoming phone number';

        phoneGroup.innerHTML = '<label>' + incomingPhoneLabel + '</label>';
        phoneGroup.className = 'gm-phone-group';
        phoneGroup.appendChild(this.phoneInput);
        phoneGroup.appendChild(this.phoneBtn);
        inputs.appendChild(phoneGroup);

        // Text group
        const textGroup = document.createElement('div');
        this.textInput = document.createElement('textarea');
        this.textBtn = document.createElement('button');
        this.textInput.className = 'gm-phone-message';
        this.textInput.placeholder = this.i18n.PHONE_MESSAGE_PLACEHOLDER || 'Please enter the incoming message';
        this.textInput.rows = 5;
        this.instance.addListener(this.textInput, 'keyup', this.validate.bind(this));
        this.textBtn.className = 'gm-phone-send';
        this.textBtn.innerHTML = this.i18n.PHONE_MESSAGE || 'Send message';
        this.textBtn.onclick = this.sendSMSToInstance.bind(this);
        this.textBtn.disabled = true;

        const messageLabel = this.i18n.PHONE_MESSAGE_VALUE || 'Message';
        textGroup.innerHTML = '<label>' + messageLabel + '</label>';
        textGroup.className = 'gm-phone-group';
        textGroup.appendChild(this.textInput);
        textGroup.appendChild(this.textBtn);
        inputs.appendChild(textGroup);

        container.appendChild(inputs);
    }

    /**
     * Validate phone number format.
     *
     * @return {boolean} Whether or not phone number format is valid.
     */
    validatePhoneNumber() {
        const phoneRegex = /^(\+[0-9]{1,14}|[0-9]{1,16})$/g;
        return this.phoneInput.value.match(phoneRegex);
    }

    /**
     * Send phone call event to the instance.
     *
     * @param {Event} event Event.
     */
    sendPhoneCallToInstance(event) {
        if (event) {
            event.preventDefault();
        }

        if (!this.validatePhoneNumber()) {
            return;
        }

        const json = {channel: 'baseband', messages: ['gsm call ' + this.phoneInput.value]};
        this.instance.sendEvent(json);
        this.toggleWidget();
    }

    /**
     * Validate SMS text format.
     *
     * @return {boolean} Whether or not SMS text format is valid.
     */
    validateSMSText() {
        return this.textInput.value.length > 0;
    }

    /**
     * Send SMS event to the instance.
     *
     * @param {Event} event Event.
     */
    sendSMSToInstance(event) {
        if (event) {
            event.preventDefault();
        }

        if (!this.validatePhoneNumber() || !this.validateSMSText()) {
            return;
        }

        const json = {
            channel: 'baseband',
            messages: ['sms send ' + this.phoneInput.value + ' ' + this.textInput.value],
        };
        this.instance.sendEvent(json);
        this.toggleWidget();
    }

    /**
     * Validate all widget inputs.
     *
     * @return {boolean} Whether or not inputs are valid.
     */
    validate() {
        const phoneIsValid = this.validatePhoneNumber();
        const textIsValid = this.validateSMSText();
        const valid = textIsValid && phoneIsValid;

        this.phoneBtn.disabled = !phoneIsValid;
        this.textBtn.disabled = !valid;

        return valid;
    }
};
