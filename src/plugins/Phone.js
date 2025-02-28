'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {textInput} = require('./util/components');

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
        const {container} = this.createTemplateModal({
            title: this.i18n.PHONE_TITLE || 'Phone',
            classes: 'gm-phone-plugin',
            width: 378,
            height: 617,
        });

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        // Phone group
        const phoneGroup = document.createElement('div');

        this.phoneInput = textInput.createTextInput({
            classes: 'gm-phone-number',
            placeholder: this.i18n.PHONE_CALL_PLACEHOLDER || 'Please enter the phone number',
            regexFilter: /^[0-9+\-().\s]{1,25}$/,
            regexValidField:
                // eslint-disable-next-line max-len
                /^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$/,
            onChange: () => {
                if (this.phoneInput.checkValidity()) {
                    this.phoneBtn.disabled = false;
                } else {
                    this.phoneBtn.disabled = true;
                }
                if (this.textInput.value.length > 0 && this.phoneInput.checkValidity()) {
                    this.textBtn.disabled = false;
                } else {
                    this.textBtn.disabled = true;
                }
            },
        });

        this.phoneBtn = document.createElement('button');
        this.phoneBtn.className = 'gm-btn gm-phone-call';
        this.phoneBtn.innerHTML = this.i18n.PHONE_CALL || 'Call';
        this.phoneBtn.onclick = this.sendPhoneCallToInstance.bind(this);
        this.phoneBtn.disabled = true;

        const incomingPhoneLabel = this.i18n.PHONE_INCOMING || 'Incoming phone number';

        phoneGroup.innerHTML = '<label>' + incomingPhoneLabel + '</label>';
        phoneGroup.className = 'gm-phone-group';
        phoneGroup.appendChild(this.phoneInput.element);
        phoneGroup.appendChild(this.phoneBtn);
        inputs.appendChild(phoneGroup);

        // Text group
        const textGroup = document.createElement('div');
        this.textInput = document.createElement('textarea');
        this.textInput.className = 'gm-phone-message';
        this.textInput.placeholder = this.i18n.PHONE_MESSAGE_PLACEHOLDER || 'Please enter the incoming message';
        this.textInput.rows = 5;
        this.instance.addListener(this.textInput, 'keyup', (event) => {
            if (event.target.value.length > 0 && this.phoneInput.checkValidity()) {
                this.textBtn.disabled = false;
            } else {
                this.textBtn.disabled = true;
            }
        });

        this.textBtn = document.createElement('button');
        this.textBtn.className = 'gm-btn gm-phone-send';
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
     * Send phone call event to the instance.
     *
     * @param {Event} event Event.
     */
    sendPhoneCallToInstance(event) {
        if (event) {
            event.preventDefault();
        }

        const json = {channel: 'baseband', messages: ['gsm call ' + this.phoneInput.getValue()]};
        this.instance.sendEvent(json);
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

        const json = {
            channel: 'baseband',
            messages: ['sms send ' + this.phoneInput.getValue() + ' ' + this.textInput.value],
        };
        this.instance.sendEvent(json);
    }
};
