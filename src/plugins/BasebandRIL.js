'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {textInput, chipTag} = require('./util/components');

/**
 * Instance Baseband/RIL plugin.
 * Provides Baseband and RIL informations control.
 */
module.exports = class BasebandRIL extends OverlayPlugin {
    static get name() {
        return 'BasebandRIL';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object}  instance        Associated instance.
     * @param {Object}  i18n            Translations keys for the UI.
     */
    constructor(instance, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.baseband = this;
        this.i18n = i18n || {};

        this.formValid = false;
        // Render components
        this.registerToolbarButton();
        this.renderWidget();

        // Listen for baseband messages: "<sim/network> <operator/operator_name/imsi_id/phone_number> <value>"
        this.instance.registerEventCallback('baseband', (message) => {
            this.handleBasebandEvent(message);
        });
    }

    /**
     * Handle the baseband channel events.
     *
     * @param {String} message the received message.
     */
    handleBasebandEvent(message) {
        const values = message.split(' ');
        if (values.length < 3) {
            return;
        }

        if (values[0] === 'network' && values[1] === 'operator') {
            this.networkOperatorMMC.setValue(values[2]);
        }
        if (values[0] === 'network' && values[1] === 'operator_name') {
            this.networkOperatorName.setValue(values.slice(2).join(' '));
        }
        if (values[0] === 'sim' && values[1] === 'operator') {
            this.simOperatorMMC.setValue(values[2]);
        }
        if (values[0] === 'sim' && values[1] === 'operator_name') {
            this.simOperatorName.setValue(values.slice(2).join(' '));
        }
        if (values[0] === 'sim' && values[1] === 'imsi_id') {
            this.simMSIN.setValue(values[2]);
        }
        if (values[0] === 'sim' && values[1] === 'phone_number') {
            this.simOperatorPhoneNumber.setValue(values[2]);
        }
        this.checkIfFormIsValid();
        this.container.classList.add('gm-baseband-saved');
    }

    /**
     * Add the button to the player toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-sim-button',
            title: this.i18n.BASEBAND_TITLE || 'Baseband',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.BASEBAND_TITLE || 'Baseband',
            classes: 'gm-baseband-plugin',
            width: 378,
            height: 551,
        });

        this.container = container;

        // nextworkOperatorSectionDiv
        const nextworkOperatorSectionDiv = document.createElement('div');
        nextworkOperatorSectionDiv.className = 'gm-section';
        const networkOperatorTitleDiv = document.createElement('div');
        networkOperatorTitleDiv.innerHTML = this.i18n.NETWORK_OPERATOR || 'Network Operator';
        networkOperatorTitleDiv.className = 'gm-network-operator-section-title';
        nextworkOperatorSectionDiv.appendChild(networkOperatorTitleDiv);

        const networkOperatorFirstLineDiv = document.createElement('div');
        networkOperatorFirstLineDiv.className = 'gm-network-operator-section-line';

        const networkOperatorMMCDiv = document.createElement('div');
        const networkOperatorMMCLabel = document.createElement('label');
        networkOperatorMMCLabel.innerHTML = 'MCC/MNC';
        this.networkOperatorMMC = textInput.createTextInput({
            classes: 'gm-network-mmc',
            regexFilter: /^[0-9]{0,6}$/,
            regexValidField: /^[0-9]{5,6}$/,
            placeholder: 'eg: 20814',
            onChange: () => {
                this.checkIfFormIsValid();
                this.container.classList.remove('gm-baseband-saved');
            },
        });
        networkOperatorMMCDiv.appendChild(networkOperatorMMCLabel);
        networkOperatorMMCDiv.appendChild(this.networkOperatorMMC.element);

        const networkOperatorNameDiv = document.createElement('div');
        const networkOperatorNameLabel = document.createElement('label');
        networkOperatorNameLabel.innerHTML = 'Name';
        this.networkOperatorName = textInput.createTextInput({
            classes: 'gm-network-name',
            placeholder: 'eg: Verizon',
            onChange: () => {
                this.container.classList.remove('gm-baseband-saved');
            },
        });
        networkOperatorNameDiv.appendChild(networkOperatorNameLabel);
        networkOperatorNameDiv.appendChild(this.networkOperatorName.element);

        networkOperatorFirstLineDiv.appendChild(networkOperatorMMCDiv);
        networkOperatorFirstLineDiv.appendChild(networkOperatorNameDiv);
        nextworkOperatorSectionDiv.appendChild(networkOperatorFirstLineDiv);

        // simOperatorSectionDiv
        const simOperatorSectionDiv = document.createElement('div');
        simOperatorSectionDiv.className = 'gm-section';
        const simOperatorTitleDiv = document.createElement('div');
        simOperatorTitleDiv.innerHTML = this.i18n.NETWORK_SIM_OPERATOR || 'SIM Operator';
        simOperatorTitleDiv.className = 'gm-sim-operator-section-title';
        simOperatorSectionDiv.appendChild(simOperatorTitleDiv);

        const simOperatorFirstLineDiv = document.createElement('div');
        simOperatorFirstLineDiv.className = 'gm-sim-operator-section-line';
        const simOperatorSecondLineDiv = document.createElement('div');
        simOperatorSecondLineDiv.className = 'gm-sim-operator-section-line';

        const simOperatorMMCDiv = document.createElement('div');
        const simOperatorMMCLabel = document.createElement('label');
        simOperatorMMCLabel.innerHTML = 'MCC/MNC';
        this.simOperatorMMC = textInput.createTextInput({
            classes: 'gm-sim-name',
            placeholder: 'eg: 20814',
            regexFilter: /^[0-9]{0,6}$/,
            regexValidField: /^[0-9]{5,6}$/,
            onChange: () => {
                this.checkIfFormIsValid();
                this.container.classList.remove('gm-baseband-saved');
            },
        });
        simOperatorMMCDiv.appendChild(simOperatorMMCLabel);
        simOperatorMMCDiv.appendChild(this.simOperatorMMC.element);

        const simOperatorNameDiv = document.createElement('div');
        const simOperatorNameLabel = document.createElement('label');
        simOperatorNameLabel.innerHTML = 'Name';
        this.simOperatorName = textInput.createTextInput({
            classes: 'gm-sim-name',
            placeholder: 'eg: AT&T',
            onChange: () => {
                this.container.classList.remove('gm-baseband-saved');
            },
        });
        simOperatorNameDiv.appendChild(simOperatorNameLabel);
        simOperatorNameDiv.appendChild(this.simOperatorName.element);

        simOperatorFirstLineDiv.appendChild(simOperatorMMCDiv);
        simOperatorFirstLineDiv.appendChild(simOperatorNameDiv);
        simOperatorSectionDiv.appendChild(simOperatorFirstLineDiv);

        const simMSINDiv = document.createElement('div');
        const simMSINLabel = document.createElement('label');
        simMSINLabel.innerHTML = 'MSIN';
        this.simMSIN = textInput.createTextInput({
            classes: 'gm-sim-msin',
            placeholder: 'eg: 2176510739',
            regexFilter: /^[0-9]{0,10}$/,
            regexValidField: /^[0-9]{9,10}$/,
            onChange: () => {
                this.checkIfFormIsValid();
                this.container.classList.remove('f');
            },
        });
        simMSINDiv.appendChild(simMSINLabel);
        simMSINDiv.appendChild(this.simMSIN.element);

        const simOperatorPhoneDiv = document.createElement('div');
        const simOperatorPhoneLabel = document.createElement('label');
        simOperatorPhoneLabel.innerHTML = 'Phone Number';
        this.simOperatorPhoneNumber = textInput.createTextInput({
            classes: 'gm-sim-phone',
            placeholder: 'eg: 8004337300',
            regexFilter: /^[0-9+\-().\s]{0,25}$/,
            regexValidField: /^[0-9+\-().\s]+$/,
            onChange: () => {
                this.checkIfFormIsValid();
                this.container.classList.remove('gm-baseband-saved');
            },
        });
        simOperatorPhoneDiv.appendChild(simOperatorPhoneLabel);
        simOperatorPhoneDiv.appendChild(this.simOperatorPhoneNumber.element);

        simOperatorSecondLineDiv.appendChild(simMSINDiv);
        simOperatorSecondLineDiv.appendChild(simOperatorPhoneDiv);
        simOperatorSectionDiv.appendChild(simOperatorSecondLineDiv);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gm-actions';
        const separator = document.createElement('div');
        separator.className = 'gm-separator';

        const appliedTag = chipTag.createChip();
        actionsDiv.appendChild(appliedTag.element);

        this.submitBtn = document.createElement('button');
        this.submitBtn.innerHTML = this.i18n.BASEBAND_APPLY || 'Apply';
        this.submitBtn.className = 'gm-btn gm-baseband-update';
        actionsDiv.appendChild(this.submitBtn);
        this.submitBtn.disabled = true;
        this.submitBtn.onclick = this.sendDataToInstance.bind(this);

        // Container
        container.appendChild(nextworkOperatorSectionDiv);
        // Separator
        const sep1 = document.createElement('div');
        sep1.className = 'gm-separator';
        container.appendChild(sep1);
        container.appendChild(simOperatorSectionDiv);
        // Separator
        const sep2 = document.createElement('div');
        sep2.className = 'gm-separator';
        container.appendChild(sep2);
        container.appendChild(actionsDiv);

        return;
    }

    /**
     * MSIN verification according to MCC/MNC length:
     * - MCC/MNC is 5 digits => MSIN should be 10 digits
     * - MCC/MNC is 6 digits => MSIN should be 9 digits
     * Only do the check if both are not empty: we might set one and not the other
     * (We can't handle the case where one was set previously and the other is now
     * beeing configured.)
     *
     * @returns {boolean} True if there is an error, false otherwise.
     */
    checkSimImsiErrors() {
        let isError = false;
        if (!this.simOperatorMMC.getValue().length) {
            this.simMSIN.setErrorMessage('');
            return isError;
        }
        if (!this.simMSIN.getValue().length) {
            this.simOperatorMMC.setErrorMessage('');
            return isError;
        }
        if (this.simOperatorMMC.getValue().length === 6 && this.simMSIN.getValue().length !== 9) {
            this.simMSIN.setErrorMessage('9 digits required');
            isError = true;
        } else if (this.simOperatorMMC.getValue().length === 5 && this.simMSIN.getValue().length !== 10) {
            this.simMSIN.setErrorMessage('10 digits required');
            isError = true;
        }
        return isError;
    }

    /**
     * Validates the form fields related to network and SIM operator information.
     *
     * This method checks the validity of the following fields:
     * - networkOperatorMMC
     * - simOperatorMMC
     * - simMSIN
     * - simOperatorPhoneNumber
     *
     * It sets error messages for invalid fields and disables the submit button if any field is invalid.
     *
     * @returns {void}
     */
    checkIfFormIsValid() {
        let isValid = true;

        this.networkOperatorMMC.setErrorMessage('');
        this.simOperatorMMC.setErrorMessage('');
        this.simMSIN.setErrorMessage('');
        this.simOperatorPhoneNumber.setErrorMessage('');

        isValid = !this.checkSimImsiErrors();

        if (this.networkOperatorMMC.getValue().length && !this.networkOperatorMMC.checkValidity()) {
            this.networkOperatorMMC.setErrorMessage('Invalid value');
            isValid = false;
        }
        if (this.simOperatorMMC.getValue().length && !this.simOperatorMMC.checkValidity()) {
            this.simOperatorMMC.setErrorMessage('Invalid value');
            isValid = false;
        }
        if (this.simMSIN.getValue().length && !this.simMSIN.checkValidity()) {
            this.simMSIN.setErrorMessage('Invalid value');
            isValid = false;
        }
        if (this.simOperatorPhoneNumber.getValue().length && !this.simOperatorPhoneNumber.checkValidity()) {
            this.simOperatorPhoneNumber.setErrorMessage('Invalid value');
            isValid = false;
        }

        this.submitBtn.disabled = !isValid;
        return isValid;
    }

    /**
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        if (!this.checkIfFormIsValid()) {
            return;
        }

        const msgs = [];
        if (this.networkOperatorMMC.getValue().length) {
            msgs.push('network operator ' + this.networkOperatorMMC.getValue());
        }
        if (this.networkOperatorName.getValue().length) {
            msgs.push('network operator_name ' + this.networkOperatorName.getValue());
        }

        if (this.simOperatorMMC.getValue().length) {
            msgs.push('sim operator ' + this.simOperatorMMC.getValue());
        }

        if (this.simOperatorName.getValue().length) {
            msgs.push('sim operator_name ' + this.simOperatorName.getValue());
        }

        if (this.simMSIN.getValue().length) {
            msgs.push('sim imsi_id ' + this.simMSIN.getValue());
        }

        if (this.simOperatorPhoneNumber.getValue().length) {
            msgs.push('sim phone_number ' + this.simOperatorPhoneNumber.getValue());
        }

        if (msgs.length > 0) {
            const json = {channel: 'baseband', messages: msgs};
            this.instance.sendEvent(json);
        }

        this.container.classList.add('gm-baseband-saved');
    }
};
