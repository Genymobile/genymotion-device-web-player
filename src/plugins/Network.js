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
     */
    constructor(instance, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.network = this;
        this.i18n = i18n || {};

        this.fields = {};

        // Render components
        this.renderToolbarButton();

        this.androidVersion = "";

        this.wifiInputStatus = true;
        this.mobileInputStatus = true;

        this.widgedRendered = false;
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
    }

    handleSettings(message) {
        const values = message.split(' ');

        if (values[0] === 'if' ) {
            this.wifiInput.disabled = false;
            this.mobileInput.disabled = false;

            if(values.length !== 3) {
                return;
            }

            const wifiOn = values[1].match(/(wifi:)(\w+)/);
            if (wifiOn) {
                this.wifiInputStatus = wifiOn[2] === 'on';
            }
            const mobileOn = values[2].match(/(mobile:)(\w+)/);
            if (mobileOn) {
                this.mobileInputStatus = mobileOn[2] === 'on';
            }

            if(this.widgedRendered) {
                this.wifiInput.checked = this.wifiInputStatus;
                this.mobileInput.checked = this.mobileInputStatus;
                this.updateMobileSectionStatus();
            }
        } else if (values[0] === 'parameter' && values.length > 2 && values[2].includes("android_version")) {
            const version = values[2].match(/(android_version:)(\w+)/);
            this.androidVersion = version[2];
            if (!this.widgedRendered) {
                this.renderWidget();
            }
        }
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

        if (this.androidVersion < 8) {
            const isThrottlingEnabled =
            upSpeed[1] === 'enabled'
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
        } else {
            const mobileProfile = values[9].split(':');
            const signalStrength = values[10].split(':');

            this.setActiveMobileProfile(mobileProfile[1]);
            this.setActiveSignalStrength(signalStrength[1]);
            this.updateDetail('downSpeed', downSpeed[2], downSpeed[1] === "disabled" || !this.mobileInput.checked);
            this.updateDetail('upSpeed', upSpeed[2], upSpeed[1] === "disabled" || !this.mobileInput.checked);
            this.updateDetail('downDelay', downDelay[2], downDelay[1] === "disabled" || !this.mobileInput.checked);
            this.updateDetail('upDelay', upDelay[2], upDelay[1] === "disabled" || !this.mobileInput.checked);
            this.updateDetail('downPacketLoss', downPacketLoss[2], downPacketLoss[1] === "disabled" || !this.mobileInput.checked);
            this.updateDetail('upPacketLoss', upPacketLoss[2], upPacketLoss[1] === "disabled" || !this.mobileInput.checked);
            this.updateDetail('dnsDelay', dnsDelay[2], dnsDelay[1] === "disabled" || !this.mobileInput.checked);
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
        this.wifiInput.checked = this.wifiInputStatus;
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
        this.mobileInput.checked = this.mobileInputStatus;
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
                    // 5g is available only for version >= 10
                    if (this.androidVersion < 10 && profile.name === "5g") {
                        return;
                    }
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

        this.widgedRendered = true;
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
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        if (!this.form.checkValidity()) {
            return;
        }

        if (this.androidVersion < 8) {
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
        const signalStrength = MOBILE_SIGNAL_STRENGTH.find((elem) => elem.name === this.selectMobileSignalStrength.value);
        if (signalStrength) {
            const msgs = [];
            msgs.push('setsignalstrength mobile ' + signalStrength.name);
            const json = {channel: 'network_profile', messages: msgs};
            this.instance.sendEvent(json);
        } else {
            // TODO hide or do something?
            console.log("Selected signalStrength not found")
        }
    }

    toggleWifiState() {
        // Wifi state changed
        this.wifiInput.disabled = true;
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
        this.mobileInput.disabled = true;
        this.updateMobileSectionStatus();

        const msgs = [];
        if (this.mobileInput.checked === true) {
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
        this.select.disabled = !this.mobileInput.checked;
        this.selectMobileSignalStrength.disabled = !this.mobileInput.checked;
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

    /**
     * Update mobile profile list UI according to the current active profile.
     *
     * @param {string} profile Profile name.
     */
    setActiveMobileProfile(profile) {
        if(!profile) {
            console.log("setActiveMobileProfile: Error : provided profile is empty")
            return;
        }
        const mobileProfile = MOBILE_PROFILES.find((elem) => elem.name === profile);
        if (!mobileProfile) {
            return;
        }

        const options = this.select.getElementsByTagName('option');
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === mobileProfile.name) {
                option.selected = 'selected';
            }
        }
    }

    /**
     * Update mobile signal strength list UI according to the current active strength.
     *
     * @param {string} strength Signal strength name.
     */
    setActiveSignalStrength(strength) {
        if(!strength) {
            return;
        }
        const signalStrength = MOBILE_SIGNAL_STRENGTH.find((elem) => elem.name === strength);
        if (!signalStrength) {
            return;
        }

        const options = this.selectMobileSignalStrength.getElementsByTagName('option');
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === signalStrength.name) {
                option.selected = 'selected';
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
        if(! detail) {
            return;
        }
        if (reset) {
            this.fields[detail].innerHTML = "";
        } else {
            this.fields[detail].innerHTML = value;
        }
    }
};
