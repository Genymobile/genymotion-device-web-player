'use strict';

const log = require('loglevel');
log.setDefaultLevel('debug');

const OverlayPlugin = require('./util/OverlayPlugin');
const {switchButton, dropdownSelect} = require('./util/components');

const MOBILE_PROFILES = require('./util/network-mobile-profiles');
const MOBILE_SIGNAL_STRENGTH = require('./util/mobile-signal-strength');

/**
 * Instance network plugin.
 * Provides network I/O control.
 */
module.exports = class Network extends OverlayPlugin {
    static get name() {
        return 'Network';
    }
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

        this.fields = {};

        this.profilesForDropdownNetworkType = [];
        this.prepareArrayForDropdownNetworkType(MOBILE_PROFILES);
        this.profilesForDropdownSignalStrength = MOBILE_SIGNAL_STRENGTH.map((profile) => {
            const element = document.createElement('div');
            element.innerHTML = profile.label;
            return {
                element: element,
                value: profile.name,
                valueToDisplay: profile.label || '',
            };
        });

        // Render components
        this.registerToolbarButton();
        this.renderWidget();

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

    // Handle settings event to enable/disable wifi|mobile data
    handleSettings(message) {
        const values = message.split(' ');

        if (values[0] === 'if') {
            this.wifiSwitch.setState(false);
            this.mobileDataSwitch.setState(false);

            if (values.length !== 3) {
                return;
            }

            const wifiOn = values[1].match(/(wifi:)(\w+)/);
            if (wifiOn) {
                this.wifiSwitch.setState(wifiOn[2] === 'on');
            }

            const mobileOn = values[2].match(/(mobile:)(\w+)/);
            if (mobileOn) {
                if (mobileOn[2] === 'on') {
                    this.mobileDataSwitch.setState(true);
                    this.disableMobileData(false);
                } else {
                    this.mobileDataSwitch.setState(false);
                    this.disableMobileData(true);
                }
            }
        }
    }

    // Update network details (downSpeed, downDelay...) according to the selected network type.
    handleNetworkProfile(message) {
        const values = message.split(' ');
        if (values.length < 11 || values[1] === 'wifi') {
            return;
        }
        const upSpeed = values[2].split(':');
        const downSpeed = values[3].split(':');
        const upDelay = values[4].split(':');
        const downDelay = values[5].split(':');
        const upPacketLoss = values[6].split(':');
        const downPacketLoss = values[7].split(':');
        const dnsDelay = values[8].split(':');

        const mobileProfile = values[9].split(':');
        const signalStrength = values[10].split(':');

        // Update the dropdowns network type and signal strength
        this.dropdownNetworkType.setValue(
            this.profilesForDropdownNetworkType.find((mp) => mp.value === mobileProfile[1]),
        );
        this.selectMobileSignalStrength.setValue(
            this.profilesForDropdownSignalStrength.find((ms) => ms.value === signalStrength[1]),
        );

        this.updateDetail(
            'downSpeed',
            downSpeed[2] + ' b/s',
            downSpeed[1] === 'disabled' || !this.mobileDataSwitch.getState(),
        );
        this.updateDetail(
            'upSpeed',
            upSpeed[2] + ' b/s',
            upSpeed[1] === 'disabled' || !this.mobileDataSwitch.getState(),
        );
        this.updateDetail(
            'downDelay',
            downDelay[2] + ' s',
            downDelay[1] === 'disabled' || !this.mobileDataSwitch.getState(),
        );
        this.updateDetail('upDelay', upDelay[2] + ' s', upDelay[1] === 'disabled' || !this.mobileDataSwitch.getState());
        this.updateDetail(
            'downPacketLoss',
            downPacketLoss[2] + ' %',
            downPacketLoss[1] === 'disabled' || !this.mobileDataSwitch.getState(),
        );
        this.updateDetail(
            'upPacketLoss',
            upPacketLoss[2] + ' %',
            upPacketLoss[1] === 'disabled' || !this.mobileDataSwitch.getState(),
        );
        this.updateDetail(
            'dnsDelay',
            dnsDelay[2] + ' s',
            dnsDelay[1] === 'disabled' || !this.mobileDataSwitch.getState(),
        );
    }

    enable5G() {
        // Enable the 5G of the plugin (i.e. adding the 5G option to the mobile profile)
        this.prepareArrayForDropdownNetworkType(MOBILE_PROFILES);
        this.dropdownNetworkType.updateOptions(this.profilesForDropdownNetworkType);
    }

    disable5G() {
        this.prepareArrayForDropdownNetworkType(MOBILE_PROFILES.filter((item) => item.name !== '5g'));
        this.dropdownNetworkType.updateOptions(this.profilesForDropdownNetworkType);
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-network-button',
            title: this.i18n.NETWORK_TITLE || 'Network',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.NETWORK_TITLE || 'Network',
            width: 378,
            height: 550,
            classes: 'gm-network-plugin',
        });

        const wifiSection = document.createElement('div');
        wifiSection.className = 'gm-network-wifi-section';
        const wifiText = document.createElement('div');
        wifiText.innerHTML = this.i18n.WIFI || 'Wifi';
        wifiSection.appendChild(wifiText);

        this.wifiSwitch = switchButton.createSwitch({
            onChange: (value) => {
                this.sendWifiStateEvent(value);
            },
        });
        wifiSection.appendChild(this.wifiSwitch.element);

        const separator = document.createElement('div');
        separator.className = 'gm-separator';

        this.mobileDataSection = document.createElement('div');
        this.mobileDataSection.className = 'gm-network-mobile-section';

        const mobileDataSwitchDiv = document.createElement('div');
        mobileDataSwitchDiv.className = 'gm-mobile-data-switch';
        const mobileDataText = document.createElement('div');
        mobileDataText.innerHTML = this.i18n.MOBILE_DATA || 'Mobile data';
        mobileDataSwitchDiv.appendChild(mobileDataText);

        this.mobileDataSwitch = switchButton.createSwitch({
            onChange: (value) => {
                this.sendMobileDataStateEvent(value);
            },
        });
        mobileDataSwitchDiv.appendChild(this.mobileDataSwitch.element);
        this.mobileDataSection.appendChild(mobileDataSwitchDiv);

        const networkTypeLabel = document.createElement('label');
        networkTypeLabel.innerHTML = this.i18n.NETWORK_TYPE || 'Network type';

        this.dropdownNetworkType = dropdownSelect.createDropdown({
            items: this.profilesForDropdownNetworkType,
            hasCheckmark: true,
            dropdownMaxHeight: 245,
            classes: 'gm-network-type-dropdown',
            onChange: (newValue) => {
                const msgs = [];
                msgs.push('setprofile mobile ' + newValue);
                const json = {channel: 'network_profile', messages: msgs};
                this.instance.sendEvent(json);
            },
        });
        this.mobileDataSection.appendChild(networkTypeLabel);
        this.mobileDataSection.appendChild(this.dropdownNetworkType.element);

        const signalStrengthLabel = document.createElement('label');
        signalStrengthLabel.innerHTML = this.i18n.SIGNAL_STRENGTH || 'Signal strength';
        this.mobileDataSection.appendChild(signalStrengthLabel);

        this.selectMobileSignalStrength = dropdownSelect.createDropdown({
            items: this.profilesForDropdownSignalStrength,
            hasCheckmark: true,
            dropdownMaxHeight: 245,
            classes: 'gm-signal-strength-dropdown',
            onChange: (newValue) => {
                const msgs = [];
                msgs.push('setsignalstrength mobile ' + newValue);
                const json = {channel: 'network_profile', messages: msgs};
                this.instance.sendEvent(json);
            },
        });
        this.mobileDataSection.appendChild(signalStrengthLabel);
        this.mobileDataSection.appendChild(this.selectMobileSignalStrength.element);

        // Add detail fields
        this.mobileDataSection.appendChild(this.createDetailsSection('Download speed', 'downSpeed'));
        this.mobileDataSection.appendChild(this.createDetailsSection('Upload speed', 'upSpeed'));
        this.mobileDataSection.appendChild(this.createDetailsSection('Download delay', 'downDelay'));
        this.mobileDataSection.appendChild(this.createDetailsSection('Upload delay', 'upDelay'));
        this.mobileDataSection.appendChild(this.createDetailsSection('Download packet loss', 'downPacketLoss'));
        this.mobileDataSection.appendChild(this.createDetailsSection('Upload packet loss', 'upPacketLoss'));
        this.mobileDataSection.appendChild(this.createDetailsSection('DNS Delay', 'dnsDelay'));

        container.appendChild(wifiSection);
        container.appendChild(separator);
        container.appendChild(this.mobileDataSection);
    }

    sendWifiStateEvent(state) {
        const msgs = [];
        if (state) {
            msgs.push('enableif wifi');
        } else {
            msgs.push('disableif wifi');
        }

        const json = {channel: 'settings', messages: msgs};
        this.instance.sendEvent(json);
    }

    sendMobileDataStateEvent(state) {
        const msgs = [];
        if (state) {
            msgs.push('enableif mobile');
        } else {
            msgs.push('disableif mobile');
        }

        const json1 = {channel: 'settings', messages: msgs};
        this.instance.sendEvent(json1);

        const json2 = {channel: 'network_profile', messages: ['notify phone']};
        this.instance.sendEvent(json2);
    }

    /**
     * Disable/Enable mobile data section.
     * @param {boolean} isDisabled True to disable, false to enable.
     * @return {void}
     */
    disableMobileData(isDisabled) {
        if (isDisabled) {
            this.mobileDataSection.classList.add('disabled');
            this.dropdownNetworkType.setDisabled(true);
            this.selectMobileSignalStrength.setDisabled(true);
        } else {
            this.mobileDataSection.classList.remove('disabled');
            this.dropdownNetworkType.setDisabled(false);
            this.selectMobileSignalStrength.setDisabled(false);
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

    prepareArrayForDropdownNetworkType(arr) {
        // Array of profiles for network type dropdown
        this.profilesForDropdownNetworkType = arr
            .sort((profA, profB) => profA.id - profB.id)
            .map((profile) => {
                const divContainer = document.createElement('div');
                const label = document.createElement('div');
                const icon = document.createElement('div');
                icon.className = 'gm-network-profile-icon ' + profile.icon;
                divContainer.appendChild(icon);
                divContainer.appendChild(label);
                divContainer.style.display = 'flex';
                divContainer.style.alignItems = 'center';
                label.innerHTML = profile.label || '';
                return {
                    element: divContainer,
                    value: profile.name,
                    valueToDisplay: profile.label || '',
                };
            });
    }
};
