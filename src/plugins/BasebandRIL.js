'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

/**
 * Instance Baseband/RIL plugin.
 * Provides Baseband and RIL informations control.
 */
module.exports = class BasebandRIL extends OverlayPlugin {
    /**
     * Plugin initialization.
     *
     * @param {Object}  instance        Associated instance.
     * @param {Object}  i18n            Translations keys for the UI.
     * @param {boolean} basebandEnabled Whether or not baseband control is enabled.
     */
    constructor(instance, i18n, basebandEnabled) {
        super(instance);

        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.baseband = this;
        this.i18n = i18n || {};

        this.basebandEnabled = basebandEnabled;

        // Render components
        this.renderToolbarButton();
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
    }

    /**
     * Add the button to the player toolbar.
     */
    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-sim-button';
        this.toolbarBtnImage.title = this.i18n.BASEBAND_TITLE || 'Baseband';
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
        this.form = document.createElement('form');

        // Generate title
        const title = document.createElement('div');
        title.className = 'gm-title';
        title.innerHTML = this.i18n.BASEBAND_TITLE || 'Baseband';
        this.form.appendChild(title);

        if (this.basebandEnabled) {
            this.networkOperator = document.createElement('div');

            const networkOperatorLabelDiv = document.createElement('div');
            networkOperatorLabelDiv.className = 'gm-section';
            const networkOperatorLabel = document.createElement('label');
            networkOperatorLabel.innerHTML = this.i18n.NETWORK_OPERATOR || 'Network Operator';
            networkOperatorLabelDiv.appendChild(networkOperatorLabel);

            const networkOperatorMMCDiv = document.createElement('div');
            networkOperatorMMCDiv.className = 'gm-fields';
            const networkOperatorMMCLabel = document.createElement('label');
            networkOperatorMMCLabel.innerHTML = 'MCC/MNC';
            this.networkOperatorMMC = document.createElement('input');
            this.networkOperatorMMC.className = 'gm-network-network-mmc';
            this.networkOperatorMMC.placeholder = 'eg: 20814';
            this.networkOperatorMMC.pattern = '[0-9]{5,6}';
            this.networkOperatorMMC.title = 'Operator MCC/MNC';
            networkOperatorMMCDiv.appendChild(networkOperatorMMCLabel);
            networkOperatorMMCDiv.appendChild(this.networkOperatorMMC);

            const networkOperatorNameDiv = document.createElement('div');
            networkOperatorNameDiv.className = 'gm-fields';
            const networkOperatorNameLabel = document.createElement('label');
            networkOperatorNameLabel.innerHTML = 'Name';
            this.networkOperatorName = document.createElement('input');
            this.networkOperatorName.className = 'gm-network-network-name';
            this.networkOperatorName.placeholder = 'eg: Verizon';
            this.networkOperatorName.title = 'Operator Name';
            networkOperatorNameDiv.appendChild(networkOperatorNameLabel);
            networkOperatorNameDiv.appendChild(this.networkOperatorName);

            this.networkOperator.appendChild(networkOperatorLabelDiv);
            this.networkOperator.appendChild(networkOperatorMMCDiv);
            this.networkOperator.appendChild(networkOperatorNameDiv);

            this.simOperator = document.createElement('div');

            const simperatorLabelDiv = document.createElement('div');
            simperatorLabelDiv.className = 'gm-section';
            const simperatorLabel = document.createElement('label');
            simperatorLabel.innerHTML = this.i18n.NETWORK_SIM_OPERATOR || 'SIM Operator';
            simperatorLabelDiv.appendChild(simperatorLabel);

            const simOperatorMMCDiv = document.createElement('div');
            simOperatorMMCDiv.className = 'gm-fields';
            const simOperatorMMCLabel = document.createElement('label');
            simOperatorMMCLabel.innerHTML = 'MCC/MNC';
            this.simOperatorMMC = document.createElement('input');
            this.simOperatorMMC.className = 'gm-network-sim-mmc';
            this.simOperatorMMC.placeholder = 'eg: 20814';
            this.simOperatorMMC.pattern = '[0-9]{5,6}';
            this.simOperatorMMC.title = 'SIM Operator MCC/MNC';
            this.simOperatorMMC.addEventListener('keyup', this.checkSimImsiErrors.bind(this));
            simOperatorMMCDiv.appendChild(simOperatorMMCLabel);
            simOperatorMMCDiv.appendChild(this.simOperatorMMC);

            const simOperatorNameDiv = document.createElement('div');
            simOperatorNameDiv.className = 'gm-fields';
            const simOperatorNameLabel = document.createElement('label');
            simOperatorNameLabel.innerHTML = 'Name';
            this.simOperatorName = document.createElement('input');
            this.simOperatorName.className = 'gm-network-sim-name';
            this.simOperatorName.placeholder = 'eg: AT&T';
            this.simOperatorName.title = 'SIM Operator Name';
            simOperatorNameDiv.appendChild(simOperatorNameLabel);
            simOperatorNameDiv.appendChild(this.simOperatorName);

            const simMSINDiv = document.createElement('div');
            simMSINDiv.className = 'gm-fields';
            const simMSINLabel = document.createElement('label');
            simMSINLabel.innerHTML = 'MSIN';
            this.simMSIN = document.createElement('input');
            this.simMSIN.className = 'gm-network-sim-msin';
            this.simMSIN.placeholder = 'eg: 2176510739';
            this.simMSIN.pattern = '[0-9]{9,10}';
            this.simMSIN.title = 'SIM MSIN';
            this.simMSIN.addEventListener('keyup', this.checkSimImsiErrors.bind(this));
            simMSINDiv.appendChild(simMSINLabel);
            simMSINDiv.appendChild(this.simMSIN);

            const simOperatorPhoneDiv = document.createElement('div');
            simOperatorPhoneDiv.className = 'gm-fields';
            const simOperatorPhoneLabel = document.createElement('label');
            simOperatorPhoneLabel.innerHTML = 'Phone Number';
            this.simOperatorPhoneNumber = document.createElement('input');
            this.simOperatorPhoneNumber.className = 'gm-network-sim-phone';
            this.simOperatorPhoneNumber.placeholder = 'eg: 8004337300';
            this.simOperatorPhoneNumber.pattern = '[0-9]*';
            this.simOperatorPhoneNumber.title = 'Phone Number';
            simOperatorPhoneDiv.appendChild(simOperatorPhoneLabel);
            simOperatorPhoneDiv.appendChild(this.simOperatorPhoneNumber);

            this.simOperator.appendChild(simperatorLabelDiv);
            this.simOperator.appendChild(simOperatorMMCDiv);
            this.simOperator.appendChild(simMSINDiv);
            this.simOperator.appendChild(simOperatorNameDiv);
            this.simOperator.appendChild(simOperatorPhoneDiv);
        }

        // Add submit button
        this.submitBtn = document.createElement('button');
        this.submitBtn.className = 'gm-network-update';
        this.submitBtn.innerHTML = this.i18n.NETWORK_UPDATE || 'Update';
        this.submitBtn.onclick = this.sendDataToInstance.bind(this);

        // Setup
        if (this.basebandEnabled) {
            this.form.appendChild(this.networkOperator);
            this.form.appendChild(this.simOperator);
        }
        this.form.appendChild(this.submitBtn);

        this.widget.className = 'gm-overlay gm-baseband-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.className = 'gm-close-btn';
        close.onclick = this.toggleWidget.bind(this);

        this.widget.appendChild(close);
        this.widget.appendChild(this.form);

        // Render into document
        this.overlays.push(this.widget);
        this.instance.root.appendChild(this.widget);
    }

    /**
     * Display or hide the widget.
     */
    toggleWidget() {
        // Notify other callers
        if (this.widget.classList.contains('gm-hidden')) {
            this.instance.emit('close-overlays');
            this.instance.emit('keyboard-disable');
        } else {
            this.instance.emit('keyboard-enable');
        }

        // Toggle display
        this.widget.classList.toggle('gm-hidden');
        this.toolbarBtnImage.classList.toggle('gm-active');
    }

    /**
     * MSIN verification according to MCC/MNC length:
     * - MCC/MNC is 5 digits => MSIN should be 10 digits
     * - MCC/MNC is 6 digits => MSIN should be 9 digits
     * Only do the check if both are not empty: we might set one and not the other
     * (We can't handle the case where one was set previously and the other is now
     * beeing configured.)
     */
    checkSimImsiErrors() {
        this.simMSIN.setCustomValidity('');
        if (this.simOperatorMMC.value.length > 0 && this.simMSIN.value.length > 0) {
            if (this.simOperatorMMC.value.length === 6 && this.simMSIN.value.length !== 9) {
                this.simMSIN.setCustomValidity('Should be 9');
            } else if (this.simOperatorMMC.value.length === 5 && this.simMSIN.value.length !== 10) {
                this.simMSIN.setCustomValidity('Should be 10');
            }
        }
    }

    /**
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        if (!this.form.checkValidity()) {
            return;
        }

        const msgs = [];
        if (this.basebandEnabled) {
            if (this.networkOperatorMMC.value) {
                msgs.push('network operator ' + this.networkOperatorMMC.value);
            }
            if (this.networkOperatorName.value) {
                msgs.push('network operator_name ' + this.networkOperatorName.value);
            }

            if (this.simOperatorMMC.value) {
                msgs.push('sim operator ' + this.simOperatorMMC.value);
            }

            if (this.simOperatorName.value) {
                msgs.push('sim operator_name ' + this.simOperatorName.value);
            }

            if (this.simMSIN.value) {
                msgs.push('sim imsi_id ' + this.simMSIN.value);
            }

            if (this.simOperatorPhoneNumber.value) {
                msgs.push('sim phone_number ' + this.simOperatorPhoneNumber.value);
            }

            if (msgs.length > 0) {
                const json = {channel: 'baseband', messages: msgs};
                this.instance.sendEvent(json);
            }
        }

        this.toggleWidget();
    }
};
