'use strict';

const log = require('loglevel');
log.setDefaultLevel('debug');

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
     * @param {Object}  instance          Associated instance.
     * @param {Object}  i18n              Translations keys for the UI.
     */
    constructor(instance, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.network = this;
        this.i18n = i18n || {};
        this.mobilethrottling = false;

        this.fields = {};

        // Render components
        this.renderToolbarButton();
        this.renderWidget();

        /*
         * Redis message for enabling/disabling mobile throttling and 5G support
         * could be sent without rendering the widget from scratch
         * to avoid recreation of widget elements, check these parameters before.
         */
        this.mobileThrottlingConfigured = false;
        this.network5GConfigured = false;

        this.wifiInputChecked = true;
        this.mobileInputChecked = true;

        // Listen for settings messages: "if wifi:on|off mobile:on|off"
        this.instance.registerEventCallback('settings', this.handleSettings.bind(this));

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
    }

    enableMobileThrottling() {
        if (this.mobileThrottlingConfigured) {
            return;
        }

        this.mobilethrottling = true;
        // Add wifi checkbox
        const wifiGroup = document.createElement('div');
        this.wifiInput = document.createElement('input');
        this.wifiStatus = document.createElement('div');
        wifiGroup.className = 'gm-checkbox-group';
        this.wifiInput.type = 'checkbox';
        this.wifiInput.className = 'gm-checkbox';
        this.wifiInput.name = 'wifi-checkbox';
        this.wifiInput.onchange = this.toggleWifiState.bind(this);
        this.wifiInput.checked = this.wifiInputChecked;
        this.wifiStatus.className = 'gm-checkbox-label';
        this.wifiStatus.innerHTML = 'Wifi';
        wifiGroup.appendChild(this.wifiInput);
        wifiGroup.appendChild(this.wifiStatus);
        this.wifiGroupSection.className = 'gm-section';
        this.wifiGroupSection.appendChild(wifiGroup);

        // Add mobile checkbox
        const mobileGroup = document.createElement('div');
        this.mobileInput = document.createElement('input');
        this.mobileStatus = document.createElement('div');
        mobileGroup.className = 'gm-checkbox-group';
        this.mobileInput.type = 'checkbox';
        this.mobileInput.className = 'gm-checkbox';
        this.mobileInput.name = 'mobile-checkbox';
        this.mobileInput.onchange = this.toggleMobileState.bind(this);
        this.mobileInput.checked = this.mobileInputChecked;
        this.mobileStatus.className = 'gm-checkbox-label';
        this.mobileStatus.innerHTML = 'Mobile data';
        mobileGroup.appendChild(this.mobileInput);
        mobileGroup.appendChild(this.mobileStatus);
        this.mobileGroupSection.appendChild(mobileGroup);

        // Generate input rows for network mobile profiles
        const networkTypeInputLabel = document.createElement('div');
        networkTypeInputLabel.className = 'input_label';
        networkTypeInputLabel.innerHTML = 'Network type:';

        this.profileInputs.appendChild(networkTypeInputLabel);
        this.selectMobileProfile = document.createElement('select');
        this.selectMobileProfile.name = 'select-mobile-profile';
        this.selectMobileProfile.onchange = this.changeMobileProfile.bind(this);
        // Add option for each child
        MOBILE_PROFILES.slice()
            .reverse()
            .forEach((profile) => {
                // 5g is available only for version >= 10
                if (profile.name === '5g') {
                    return;
                }
                const option = new Option(profile.label, profile.name);
                this.selectMobileProfile.add(option);
            });
        this.profileInputs.appendChild(this.selectMobileProfile);

        // Generate input rows for signal strength
        const signalStrengthInputLabel = document.createElement('div');
        signalStrengthInputLabel.className = 'input_label';
        signalStrengthInputLabel.innerHTML = 'Signal strength:';
        this.inputMobileSignalStrength.appendChild(signalStrengthInputLabel);

        this.selectMobileSignalStrength = document.createElement('select');
        this.selectMobileSignalStrength.name = 'select-mobile-signal-strength';
        this.selectMobileSignalStrength.onchange = this.changeMobileSignalStrength.bind(this);
        this.inputMobileSignalStrength.appendChild(this.selectMobileSignalStrength);
        // Add option for each child
        MOBILE_SIGNAL_STRENGTH.slice()
            .reverse()
            .forEach((strength) => {
                const option = new Option(strength.label, strength.name);
                this.selectMobileSignalStrength.add(option);
            });

        this.updateMobileSectionStatus();

        this.mobileThrottlingConfigured = true;
    }

    disableMobileThrottling() {
        if (this.mobileThrottlingConfigured) {
            return;
        }

        this.mobilethrottling = false;

        // Generate input rows for network profiles
        this.selectProfile = document.createElement('select');
        this.selectProfile.name = 'select-profile';
        const defaultOption = new Option(this.i18n.NETWORK_DELECT_PROFILE || 'Select a profile');
        this.selectProfile.add(defaultOption);
        this.selectProfile.onchange = this.changeProfile.bind(this);
        // Add option for each child
        PROFILES.slice()
            .reverse()
            .forEach((profile) => {
                const option = new Option(profile.label, profile.name);
                this.selectProfile.add(option);
            });
        this.profileInputs.appendChild(this.selectProfile);

        this.mobileThrottlingConfigured = true;
    }

    enable5G() {
        if (this.network5GConfigured) {
            return;
        }

        const profile = MOBILE_PROFILES.at(0);
        const option = new Option(profile.label, profile.name);
        this.selectMobileProfile.add(option);

        this.network5GConfigured = true;
    }

    disable5G() {
        if (this.network5GConfigured) {
            return;
        }

        this.network5GConfigured = true;
    }

    // Handle settings event to enable/disable wifi|mobile data
    handleSettings(message) {
        const values = message.split(' ');

        if (values[0] === 'if') {
            if (this.wifiInput) {
                this.wifiInput.disabled = false;
            }

            if (this.mobileInput) {
                this.mobileInput.disabled = false;
            }

            if (values.length !== 3) {
                return;
            }

            const wifiOn = values[1].match(/(wifi:)(\w+)/);
            if (wifiOn) {
                this.wifiInputChecked = wifiOn[2] === 'on';
            }
            const mobileOn = values[2].match(/(mobile:)(\w+)/);
            if (mobileOn) {
                this.mobileInputChecked = mobileOn[2] === 'on';
            }

            if (this.wifiInput) {
                this.wifiInput.checked = this.wifiInputChecked;
            }

            if (this.mobileInput) {
                this.mobileInput.checked = this.mobileInputChecked;
            }

            this.updateMobileSectionStatus();
        }
    }

    // Update network details (downSpeed, downDelay...) according to the selected network type.
    handleNetworkProfile(message) {
        const values = message.split(' ');
        if (!this.mobilethrottling && (values.length < 9 || values[1] === 'phone')) {
            return;
        } else if (this.mobilethrottling && (values.length < 11 || values[1] === 'wifi')) {
            return;
        }
        const upSpeed = values[2].split(':');
        const downSpeed = values[3].split(':');
        const upDelay = values[4].split(':');
        const downDelay = values[5].split(':');
        const upPacketLoss = values[6].split(':');
        const downPacketLoss = values[7].split(':');
        const dnsDelay = values[8].split(':');

        if (this.mobilethrottling) {
            const mobileProfile = values[9].split(':');
            const signalStrength = values[10].split(':');

            this.setActiveMobileProfile(mobileProfile[1]);
            this.setActiveSignalStrength(signalStrength[1]);
            this.updateDetail(
                'downSpeed',
                downSpeed[2] + ' b/s',
                downSpeed[1] === 'disabled' || !this.mobileInput.checked,
            );
            this.updateDetail('upSpeed', upSpeed[2] + 'b/s', upSpeed[1] === 'disabled' || !this.mobileInput.checked);
            this.updateDetail(
                'downDelay',
                downDelay[2] + ' s',
                downDelay[1] === 'disabled' || !this.mobileInput.checked,
            );
            this.updateDetail('upDelay', upDelay[2] + ' s', upDelay[1] === 'disabled' || !this.mobileInput.checked);
            this.updateDetail(
                'downPacketLoss',
                downPacketLoss[2] + ' %',
                downPacketLoss[1] === 'disabled' || !this.mobileInput.checked,
            );
            this.updateDetail(
                'upPacketLoss',
                upPacketLoss[2] + ' %',
                upPacketLoss[1] === 'disabled' || !this.mobileInput.checked,
            );
            this.updateDetail('dnsDelay', dnsDelay[2] + ' s', dnsDelay[1] === 'disabled' || !this.mobileInput.checked);
        } else {
            const isThrottlingEnabled =
                upSpeed[1] === 'enabled' &&
                downSpeed[1] === 'enabled' &&
                upDelay[1] === 'enabled' &&
                downDelay[1] === 'enabled' &&
                upPacketLoss[1] === 'enabled' &&
                downPacketLoss[1] === 'enabled' &&
                dnsDelay[1] === 'enabled';

            const profile = PROFILES.find((elem) => {
                return (
                    elem.downSpeed.value === parseFloat(downSpeed[2]) &&
                    elem.downDelay.value === parseFloat(downDelay[2]) &&
                    elem.downPacketLoss.value === parseFloat(downPacketLoss[2]) &&
                    elem.upSpeed.value === parseFloat(upSpeed[2]) &&
                    elem.upDelay.value === parseFloat(upDelay[2]) &&
                    elem.upPacketLoss.value === parseFloat(upPacketLoss[2]) &&
                    elem.dnsDelay.value === parseFloat(dnsDelay[2])
                );
            });

            if (profile && isThrottlingEnabled) {
                this.selectProfile.value = profile.name;
            } else {
                this.selectProfile.value = this.i18n.NETWORK_DELECT_PROFILE || 'Select a profile';
            }
        }
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
        this.toolbarBtnImage.className = 'gm-icon-button gm-network-button';
        this.toolbarBtnImage.title = this.i18n.NETWORK_TITLE || 'Network';
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
        title.innerHTML = this.i18n.NETWORK_TITLE || 'Network';
        this.form.appendChild(title);

        // generate wifi checkbox
        this.wifiGroupSection = document.createElement('div');
        this.form.appendChild(this.wifiGroupSection);

        // generate mobile checkbox
        this.mobileGroupSection = document.createElement('div');
        this.form.appendChild(this.mobileGroupSection);

        // Generate input rows for network profiles
        this.profileInputs = document.createElement('div');
        this.profileInputs.className = 'gm-inputs';
        this.form.appendChild(this.profileInputs);

        // Mobile Signal Strength
        this.inputMobileSignalStrength = document.createElement('div');
        this.inputMobileSignalStrength.className = 'gm-inputs';
        this.form.appendChild(this.inputMobileSignalStrength);

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

        this.form.appendChild(this.profileDetails);

        this.widget.className = 'gm-overlay gm-network-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.className = 'gm-close-btn';
        close.onclick = this.toggleWidget.bind(this);

        this.widget.appendChild(close);
        this.widget.appendChild(this.form);

        // Render into document
        this.instance.root.appendChild(this.widget);
    }

    /**
     * Update form according to the selected profile.
     */
    changeProfile() {
        const profile = PROFILES.find((elem) => elem.name === this.selectProfile.value);
        if (profile) {
            this.loadDetails(profile);
            this.profileDetails.classList.remove('gm-hidden');
            this.sendDataToInstance();
        } else {
            this.profileDetails.classList.add('gm-hidden');
        }
    }

    /**
     * Send information to instance.
     */
    sendDataToInstance() {
        const profile = PROFILES.find((elem) => elem.name === this.selectProfile.value);
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
    }

    /**
     * Update form according to the selected profile.
     */
    changeMobileProfile() {
        const profile = MOBILE_PROFILES.find((elem) => elem.name === this.selectMobileProfile.value);
        if (profile) {
            const msgs = [];
            msgs.push('setprofile mobile ' + profile.name);
            const json = {channel: 'network_profile', messages: msgs};
            this.instance.sendEvent(json);
        } else {
            log.error('Selected profile not found');
        }
    }

    changeMobileSignalStrength() {
        const signalStrength = MOBILE_SIGNAL_STRENGTH.find(
            (elem) => elem.name === this.selectMobileSignalStrength.value,
        );
        if (signalStrength) {
            const msgs = [];
            msgs.push('setsignalstrength mobile ' + signalStrength.name);
            const json = {channel: 'network_profile', messages: msgs};
            this.instance.sendEvent(json);
        } else {
            log.error('Selected signalStrength not found');
        }
    }

    toggleWifiState() {
        // Wifi state changed
        this.wifiInput.disabled = true;
        const msgs = [];
        if (this.wifiInput.checked) {
            msgs.push('enableif wifi');
        } else {
            msgs.push('disableif wifi');
        }

        const json = {channel: 'settings', messages: msgs};
        this.instance.sendEvent(json);
    }

    toggleMobileState() {
        this.mobileInput.disabled = true;
        this.updateMobileSectionStatus();

        const msgs = [];
        if (this.mobileInput.checked) {
            msgs.push('enableif mobile');
        } else {
            msgs.push('disableif mobile');
        }

        const json1 = {channel: 'settings', messages: msgs};
        this.instance.sendEvent(json1);

        const json2 = {channel: 'network_profile', messages: ['notify phone']};
        this.instance.sendEvent(json2);
    }

    updateMobileSectionStatus() {
        if (this.selectMobileProfile) {
            this.selectMobileProfile.disabled = !this.mobileInput.checked;
        }

        if (this.selectMobileSignalStrength) {
            this.selectMobileSignalStrength.disabled = !this.mobileInput.checked;
        }
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
     * Update UI according to the current active profile in the device.
     *
     * @param {string} id Profile id.
     */
    setActiveProfile(id) {
        const profile = PROFILES.find((elem) => elem.id === Number(id));
        if (!profile || !String(id).length) {
            return;
        }

        const options = this.selectProfile.getElementsByTagName('option');
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === profile.name) {
                option.selected = 'selected';
            }
        }
        this.loadDetails(profile);
    }

    /**
     * Update mobile profile list UI according to the current active profile.
     *
     * @param {string} profile Profile name.
     */
    setActiveMobileProfile(profile) {
        if (!profile) {
            log.error('setActiveMobileProfile: Error : provided profile is empty');
            return;
        }
        const mobileProfile = MOBILE_PROFILES.find((elem) => elem.name === profile);
        if (!mobileProfile) {
            log.error('setActiveMobileProfile: Error : unknown provided profile');
            return;
        }

        const options = this.selectMobileProfile.getElementsByTagName('option');
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === mobileProfile.name) {
                option.selected = 'selected';
                break;
            }
        }
    }

    /**
     * Update mobile signal strength list UI according to the current active strength.
     *
     * @param {string} strength Signal strength name.
     */
    setActiveSignalStrength(strength) {
        if (!strength) {
            log.error('setActiveSignalStrength: Error : provided strength is empty');
            return;
        }
        const signalStrength = MOBILE_SIGNAL_STRENGTH.find((elem) => elem.name === strength);
        if (!signalStrength) {
            log.error('setActiveSignalStrength: Error : unknown provided strength');
            return;
        }

        const options = this.selectMobileSignalStrength.getElementsByTagName('option');
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === signalStrength.name) {
                option.selected = 'selected';
                break;
            }
        }
    }

    /**
     * Update mobile signal Detail information.
     *
     * @param {string} detail Signal detail to update.
     * @param {string} value  New signal detail value.
     * @param {string} reset  If true ignore value and set "".
     */
    updateDetail(detail, value, reset) {
        if (reset) {
            this.fields[detail].innerHTML = '';
        } else {
            this.fields[detail].innerHTML = value;
        }
    }
};
