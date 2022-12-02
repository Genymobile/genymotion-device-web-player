'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const PROFILES = require('./util/network-profiles');
const MOBILE_PROFILES = require('./util/network-mobile-profiles');
const MOBILE_SIGNAL_STRENGTH = require('./util/mobile-signal-strength');

/**
 * Instance network plugin.
 * Provides network I/O control.
 */
module.exports = class Network extends OverlayPlugin {
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
        this.instance.network = this;
        this.i18n = i18n || {};

        this.fields = {};

        this.basebandEnabled = basebandEnabled;

        // Render components
        this.renderToolbarButton();

        this.androidVersion = ""

        // Listen for settings messages: "parameter <android_version:<version>"
        this.callbackIndex = this.instance.registerEventCallback('settings', this.handleSettings.bind(this));

        // Listen for initial network
        this.instance.registerEventCallback('NETWORK', this.setActive.bind(this));

        /*
         * Listen for network messages:
         * state wifi up_rate:<enabled/disabled>:<value>
         *            down_rate:<enabled/disabled>:<value>
         *            up_delay:<enabled/disabled>:<value>
         *            down_delay<enabled/disabled>:<value>
         *            up_pkt_loss:<enabled/disabled>:<value>
         *            down_pkt_loss:<enabled/disabled>:<value>
         *            dns_delay:<enabled/disabled>:<value>
         */
        this.instance.registerEventCallback('network_profile', this.handleNetworkProfile.bind(this));

        // Listen for baseband messages: "<sim/network> <operator/operator_name/imsi_id/phone_number> <value>"
        this.instance.registerEventCallback('baseband', this.handlebaseband.bind(this));
    }

    handleSettings(message) {
        this.instance.unregisterEventCallback('settings', this.callbackIndex)
        const values = message.split(' ');
        if (values[0] !== 'parameter' || values.length < 2) {
            return;
        }

        for (var i = 0; i < values.length; i++) {
            const version = values[i].match(/(android_version:)(\w+)/);
            if (version) {
                this.androidVersion = version[2];
            }
        }

        this.renderWidget();
    }

    handleNetworkProfile(message) {
        const values = message.split(' ');
        if (this.androidVersion < 8 && (values.length < 9 || values[1] === "phone")) {
            return;
        } else if (this.androidVersion >= 8 && (values.length < 11 || values[1] === "wifi")) {
            return;
        }
        const upSpeed = values[2].split(':');
        const downSpeed = values[3].split(':');
        const upDelay = values[4].split(':');
        const downDelay = values[5].split(':');
        const upPacketLoss = values[6].split(':');
        const downPacketLoss = values[7].split(':');
        const dnsDelay = values[8].split(':');

        const isThrottlingEnabled = upSpeed[1] === 'enabled'
            && downSpeed[1] === 'enabled'
            && upDelay[1] === 'enabled'
            && downDelay[1] === 'enabled'
            && upPacketLoss[1] === 'enabled'
            && downPacketLoss[1] === 'enabled'
            && dnsDelay[1] === 'enabled';

        const profile = PROFILES.find((elem) => {
            return elem.downSpeed.value === parseFloat(downSpeed[2]) &&
                elem.downDelay.value === parseFloat(downDelay[2]) &&
                elem.downPacketLoss.value === parseFloat(downPacketLoss[2]) &&
                elem.upSpeed.value === parseFloat(upSpeed[2]) &&
                elem.upDelay.value === parseFloat(upDelay[2]) &&
                elem.upPacketLoss.value === parseFloat(upPacketLoss[2]) &&
                elem.dnsDelay.value === parseFloat(dnsDelay[2]);
        });

        if (profile && isThrottlingEnabled) {
            this.select.value = profile.name;
        } else {
            this.select.value = this.i18n.NETWORK_DELECT_PROFILE || 'Select a profile';
        }
        this.changeProfile();
    }

    handlebaseband(message) {
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
        this.toolbarBtnImage.className = 'gm-icon-button gm-network-button';
        this.toolbarBtnImage.title = this.i18n.NETWORK_TITLE || 'Network & Baseband';
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
        title.innerHTML = this.i18n.NETWORK_TITLE || 'Network & Baseband';
        this.form.appendChild(title);

        //generate wifi checkbox
        const wifiGroupSection = document.createElement('div');
        wifiGroupSection.className = 'gm-section';
        const wifiGroup = document.createElement('div');
        this.wifiInput = document.createElement('input');
        this.wifiStatus = document.createElement('div');
        wifiGroup.className = 'gm-checkbox-group';
        this.wifiInput.type = 'checkbox';
        this.wifiInput.className = 'gm-checkbox';
        this.wifiInput.onchange = this.toggleWifiState.bind(this);
        this.wifiInput.checked = true;
        this.wifiStatus.className = 'gm-checkbox-label';
        this.wifiStatus.innerHTML = 'Wifi';
        wifiGroup.appendChild(this.wifiInput);
        wifiGroup.appendChild(this.wifiStatus);
        wifiGroupSection.appendChild(wifiGroup);
        this.form.appendChild(wifiGroupSection);

        //generate mobile checkbox
        const mobileGroup = document.createElement('div');
        this.mobileInput = document.createElement('input');
        this.mobileStatus = document.createElement('div');
        mobileGroup.className = 'gm-checkbox-group';
        this.mobileInput.type = 'checkbox';
        this.mobileInput.className = 'gm-checkbox';
        this.mobileInput.onchange = this.toggleMobileState.bind(this);
        this.mobileInput.checked = true;
        this.mobileStatus.className = 'gm-checkbox-label';
        this.mobileStatus.innerHTML = 'Mobile';
        mobileGroup.appendChild(this.mobileInput);
        mobileGroup.appendChild(this.mobileStatus);
        this.form.appendChild(mobileGroup);
        
        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        // Create select
        this.select = document.createElement('select');
        const defaultOption = new Option(this.i18n.NETWORK_DELECT_PROFILE || 'Select a profile');
        this.select.add(defaultOption);
        inputs.appendChild(this.select);

        if (this.androidVersion < 8) {
            this.select.onchange = this.changeProfile.bind(this);
            // Add option for each child
            PROFILES.slice().reverse()
                .forEach((profile) => {
                    const option = new Option(profile.label, profile.name);
                    this.select.add(option);
                });
        } else {
            this.select.onchange = this.changeMobileProfile.bind(this);
            MOBILE_PROFILES.slice().reverse()
                .forEach((profile) => {
                    const option = new Option(profile.label, profile.name);
                    this.select.add(option);
                });
        }

        
        // Create detail section
        this.profileDetails = document.createElement('div');
        this.profileDetails.className = 'gm-profile-details gm-hidden';

        // Add detail fields
        this.profileDetails.appendChild(this.createDetailsSection('Download speed', 'downSpeed'));
        this.profileDetails.appendChild(this.createDetailsSection('Upload speed', 'upSpeed'));
        this.profileDetails.appendChild(this.createDetailsSection('Download delay', 'downDelay'));
        this.profileDetails.appendChild(this.createDetailsSection('Upload delay', 'upDelay'));
        this.profileDetails.appendChild(this.createDetailsSection('Download packet loss', 'downPacketLoss'));
        this.profileDetails.appendChild(this.createDetailsSection('Upload packet loss', 'upPacketLoss'));
        this.profileDetails.appendChild(this.createDetailsSection('DNS Delay', 'dnsDelay'));

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
        this.form.appendChild(inputs);
        if (this.androidVersion >= 8) {
            // Mobile Signal Strength
            const inputMobileSignalStrength = document.createElement('div');
            inputMobileSignalStrength.className = 'gm-inputs';

            this.selectMobileSignalStrength = document.createElement('select');
            const defaultSignalStrengthOption = new Option('Select signal strength');
            this.selectMobileSignalStrength.add(defaultSignalStrengthOption);
            this.selectMobileSignalStrength.onchange = this.changeMobileSignalStrength.bind(this);
            inputMobileSignalStrength.appendChild(this.selectMobileSignalStrength);

            MOBILE_SIGNAL_STRENGTH.slice().reverse()
                .forEach((strength) => {
                    const option = new Option(strength.label, strength.name);
                    this.selectMobileSignalStrength.add(option);
                });
            this.form.appendChild(inputMobileSignalStrength);
        }
        this.form.appendChild(this.profileDetails);
        if (this.basebandEnabled) {
            this.form.appendChild(this.networkOperator);
            this.form.appendChild(this.simOperator);
        }
        this.form.appendChild(this.submitBtn);

        this.widget.className = 'gm-overlay gm-network-plugin gm-hidden';

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

        const profile = PROFILES.find((elem) => elem.name === this.select.value);
        if (profile) {
            const msgs = [];
            if (profile.id === 0) {
                msgs.push('disable wifi all');
            } else {
                msgs.push('enable wifi all');
                msgs.push('set wifi up_rate ' + profile.upSpeed.value);
                msgs.push('set wifi down_rate ' + profile.downSpeed.value);
                msgs.push('set wifi up_delay ' + profile.upDelay.value);
                msgs.push('set wifi down_delay ' + profile.downDelay.value);
                msgs.push('set wifi up_pkt_loss ' + profile.upPacketLoss.value);
                msgs.push('set wifi down_pkt_loss ' + profile.downPacketLoss.value);
                msgs.push('set wifi dns_delay ' + profile.dnsDelay.value);
            }
            const json = {channel: 'network_profile', messages: msgs};
            this.instance.sendEvent(json);
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

    /**
     * Update form according to the selected profile.
     */
    changeProfile() {
        const profile = PROFILES.find((elem) => elem.name === this.select.value);
        if (profile) {
            this.loadDetails(profile);
            this.profileDetails.classList.remove('gm-hidden');
        } else {
            this.profileDetails.classList.add('gm-hidden');
        }
    }

    /**
     * Update form according to the selected profile.
     */
    changeMobileProfile() {
        const profile = MOBILE_PROFILES.find((elem) => elem.name === this.select.value);
        if (profile) {
            // TODO update profile founded 
            console.log("Selected profile label:" + profile.label + "  name: " + profile.name)
            const msgs = [];
            msgs.push('setprofile mobile ' + profile.name);
            const json = {channel: 'network_profile', messages: msgs};
            this.instance.sendEvent(json);
        } else {
            // TODO update profile not found
            console.log("Selected profile not found")
        }
    }
    
    changeMobileSignalStrength() {
        const signalStrength = MOBILE_SIGNAL_STRENGTH.find((elem) => elem.name === this.select.value);
        if (signalStrength) {
            // TODO update profile details 
            console.log("Selected signalStrength:" + signalStrength.label)
        } else {
            // hide profile details
            this.profileDetails.classList.add('gm-hidden');
        }
    }

    toggleWifiState() {
        // Wifi state changed
        const msgs = [];
        if (this.wifiInput.checked === true) {
            msgs.push('enableif wifi'); 
        } else {
            msgs.push('disableif wifi'); 
        }

        const json = {channel: 'settings', messages: msgs};
        this.instance.sendEvent(json);
    }

    toggleMobileState() {
        // TODO Mobile state changed
        const msgs = [];
        if (this.mobileInput.checked === true) {
            msgs.push('enableif mobile'); 
        } else {
            msgs.push('disableif mobile'); 
        }

        const json = {channel: 'settings', messages: msgs};
        this.instance.sendEvent(json);
    }

    /**
     * Creates and return the widget "details" section.
     *
     * @param  {string}      label Section label.
     * @param  {string}      type  Section type.
     * @return {HTMLElement}       Details section
     */
    createDetailsSection(label, type) {
        const section = document.createElement('section');
        this.fields[type] = document.createElement('span');
        section.innerHTML = label + ': ';
        section.appendChild(this.fields[type]);

        return section;
    }

    /**
     * Update UI according to the given profile.
     *
     * @param {Object} profile Profile to load.
     */
    loadDetails(profile) {
        Object.entries(profile).forEach(([field, val]) => {
            if (field === 'label' || field === 'name' || field === 'id') {
                return;
            }
            this.fields[field].innerHTML = val.label;
        });
    }

    /**
     * Update UI according to the current active profile.
     *
     * @param {string} id Profile id.
     */
    setActive(id) {
        console.log("!!!!!!!!! SET ACTIVE !!!!!!!!!")
        const profile = PROFILES.find((elem) => elem.id === Number(id));
        if (!profile || !String(id).length) {
            return;
        }

        const options = this.select.getElementsByTagName('option');
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === profile.name) {
                option.selected = 'selected';
            }
        }
        this.changeProfile();
    }
};
