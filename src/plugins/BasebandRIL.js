import OverlayPlugin from './util/OverlayPlugin';
import '@/components/GmChip.js';
import '@/components/GmTextInput.js';

/**
 * Instance Baseband/RIL plugin.
 * Provides Baseband and RIL informations control.
 */
export default class BasebandRIL extends OverlayPlugin {
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
            this.networkOperatorMMC.value = values[2];
        }
        if (values[0] === 'network' && values[1] === 'operator_name') {
            this.networkOperatorName.value = values.slice(2).join(' ');
        }
        if (values[0] === 'sim' && values[1] === 'operator') {
            this.simOperatorMMC.value = values[2];
        }
        if (values[0] === 'sim' && values[1] === 'operator_name') {
            this.simOperatorName.value = values.slice(2).join(' ');
        }
        if (values[0] === 'sim' && values[1] === 'imsi_id') {
            this.simMSIN.value = values[2];
        }
        if (values[0] === 'sim' && values[1] === 'phone_number') {
            this.simOperatorPhoneNumber.value = values[2];
        }
        this.checkIfFormIsValid();
        this.appliedTag.visible = true;
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
            height: 611,
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
        this.networkOperatorMMC = document.createElement('gm-text-input');
        this.networkOperatorMMC.classList.add('gm-network-mmc');
        this.networkOperatorMMC.setAttribute('placeholder', 'eg: 20814');
        this.networkOperatorMMC.setAttribute('regex-filter', '^[0-9]{0,6}$');
        this.networkOperatorMMC.setAttribute('regex-valid', '^[0-9]{5,6}$');

        this.networkOperatorMMC.addEventListener('gm-text-input-change', () => {
            this.checkIfFormIsValid();
            this.appliedTag.visible = false;
        });
        networkOperatorMMCDiv.appendChild(networkOperatorMMCLabel);
        networkOperatorMMCDiv.appendChild(this.networkOperatorMMC);

        const networkOperatorNameDiv = document.createElement('div');
        const networkOperatorNameLabel = document.createElement('label');
        networkOperatorNameLabel.innerHTML = 'Name';
        this.networkOperatorName = document.createElement('gm-text-input');
        this.networkOperatorName.classList.add('gm-network-name');
        this.networkOperatorName.setAttribute('placeholder', 'eg: Verizon');

        this.networkOperatorName.addEventListener('gm-text-input-change', () => {
            this.checkIfFormIsValid();
            this.appliedTag.visible = false;
        });
        networkOperatorNameDiv.appendChild(networkOperatorNameLabel);
        networkOperatorNameDiv.appendChild(this.networkOperatorName);

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
        this.simOperatorMMC = document.createElement('gm-text-input');
        this.simOperatorMMC.classList.add('gm-sim-mmc');
        this.simOperatorMMC.setAttribute('placeholder', 'eg: 20814');
        this.simOperatorMMC.setAttribute('regex-filter', '^[0-9]{0,6}$');
        this.simOperatorMMC.setAttribute('regex-valid', '^[0-9]{5,6}$');

        this.simOperatorMMC.addEventListener('gm-text-input-change', () => {
            this.checkIfFormIsValid();
            this.appliedTag.visible = false;
        });
        simOperatorMMCDiv.appendChild(simOperatorMMCLabel);
        simOperatorMMCDiv.appendChild(this.simOperatorMMC);

        const simOperatorNameDiv = document.createElement('div');
        const simOperatorNameLabel = document.createElement('label');
        simOperatorNameLabel.innerHTML = 'Name';
        this.simOperatorName = document.createElement('gm-text-input');
        this.simOperatorName.classList.add('gm-sim-name');
        this.simOperatorName.setAttribute('placeholder', 'eg: AT&T');

        this.simOperatorName.addEventListener('gm-text-input-change', () => {
            this.checkIfFormIsValid();
            this.appliedTag.visible = false;
        });
        simOperatorNameDiv.appendChild(simOperatorNameLabel);
        simOperatorNameDiv.appendChild(this.simOperatorName);

        simOperatorFirstLineDiv.appendChild(simOperatorMMCDiv);
        simOperatorFirstLineDiv.appendChild(simOperatorNameDiv);
        simOperatorSectionDiv.appendChild(simOperatorFirstLineDiv);

        const simMSINDiv = document.createElement('div');
        const simMSINLabel = document.createElement('label');
        simMSINLabel.innerHTML = 'MSIN';
        this.simMSIN = document.createElement('gm-text-input');
        this.simMSIN.classList.add('gm-sim-msin');
        this.simMSIN.setAttribute('placeholder', 'eg: 2176510739');
        this.simMSIN.setAttribute('regex-filter', '^[0-9]{0,10}$');
        this.simMSIN.setAttribute('regex-valid', '^[0-9]{9,10}$');

        this.simMSIN.addEventListener('gm-text-input-change', () => {
            this.checkIfFormIsValid();
            this.appliedTag.visible = false;
        });
        simMSINDiv.appendChild(simMSINLabel);
        simMSINDiv.appendChild(this.simMSIN);

        const simOperatorPhoneDiv = document.createElement('div');
        const simOperatorPhoneLabel = document.createElement('label');
        simOperatorPhoneLabel.innerHTML = 'Phone Number';
        this.simOperatorPhoneNumber = document.createElement('gm-text-input');
        this.simOperatorPhoneNumber.classList.add('gm-sim-phone');
        this.simOperatorPhoneNumber.setAttribute('placeholder', 'eg: 8004337300');
        this.simOperatorPhoneNumber.setAttribute('regex-filter', '^[0-9+\\-().\\s]{0,25}$');
        this.simOperatorPhoneNumber.setAttribute('regex-valid', '^[0-9+\\-().\\s]+$');

        this.simOperatorPhoneNumber.addEventListener('gm-text-input-change', () => {
            this.checkIfFormIsValid();
            this.appliedTag.visible = false;
        });
        simOperatorPhoneDiv.appendChild(simOperatorPhoneLabel);
        simOperatorPhoneDiv.appendChild(this.simOperatorPhoneNumber);

        simOperatorSecondLineDiv.appendChild(simMSINDiv);
        simOperatorSecondLineDiv.appendChild(simOperatorPhoneDiv);
        simOperatorSectionDiv.appendChild(simOperatorSecondLineDiv);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gm-actions';
        const separator = document.createElement('div');
        separator.className = 'gm-separator';

        const appliedTag = document.createElement('gm-chip');
        appliedTag.visible = false;
        this.appliedTag = appliedTag;
        actionsDiv.appendChild(appliedTag);

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
        if (!this.simOperatorMMC.value.length) {
            this.simMSIN.setErrorMessage('');
            return isError;
        }
        if (!this.simMSIN.value.length) {
            this.simOperatorMMC.setErrorMessage('');
            return isError;
        }
        if (this.simOperatorMMC.value.length === 6 && this.simMSIN.value.length !== 9) {
            this.simMSIN.setErrorMessage('9 digits required');
            isError = true;
        } else if (this.simOperatorMMC.value.length === 5 && this.simMSIN.value.length !== 10) {
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
        this.networkOperatorName.setErrorMessage('');
        this.simOperatorName.setErrorMessage('');

        isValid = !this.checkSimImsiErrors();

        if (!this.networkOperatorMMC.value.length || !this.networkOperatorMMC.checkValidity()) {
            this.networkOperatorMMC.setErrorMessage('5-6 digits');
            isValid = false;
        }
        if (!this.simOperatorMMC.value.length || !this.simOperatorMMC.checkValidity()) {
            this.simOperatorMMC.setErrorMessage('5-6 digits');
            isValid = false;
        }
        if (!this.simMSIN.value.length || !this.simMSIN.checkValidity()) {
            this.simMSIN.setErrorMessage('9-10 digits');
            isValid = false;
        }
        if (!this.simOperatorPhoneNumber.value.length || !this.simOperatorPhoneNumber.checkValidity()) {
            this.simOperatorPhoneNumber.setErrorMessage('Invalid phone');
            isValid = false;
        }

        if (!this.networkOperatorName.value.length) {
            this.networkOperatorName.setErrorMessage('Required');
            isValid = false;
        }
        if (!this.simOperatorName.value.length) {
            this.simOperatorName.setErrorMessage('Required');
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
        if (this.networkOperatorMMC.value.length) {
            msgs.push('network operator ' + this.networkOperatorMMC.value);
        }
        if (this.networkOperatorName.value.length) {
            msgs.push('network operator_name ' + this.networkOperatorName.value);
        }

        if (this.simOperatorMMC.value.length) {
            msgs.push('sim operator ' + this.simOperatorMMC.value);
        }

        if (this.simOperatorName.value.length) {
            msgs.push('sim operator_name ' + this.simOperatorName.value);
        }

        if (this.simMSIN.value.length) {
            msgs.push('sim imsi_id ' + this.simMSIN.value);
        }

        if (this.simOperatorPhoneNumber.value.length) {
            msgs.push('sim phone_number ' + this.simOperatorPhoneNumber.value);
        }

        if (msgs.length > 0) {
            const json = {channel: 'baseband', messages: msgs};
            this.instance.sendEvent(json);
        }

        this.appliedTag.visible = true;
    }
}
