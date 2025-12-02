import OverlayPlugin from './util/OverlayPlugin';
import { dropdownSelect, textInput } from './util/components';

/**
 * Instance battery plugin.
 * Provides battery control.
 */
export default class Battery extends OverlayPlugin {
    static get name() {
        return 'Battery';
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
        this.instance.battery = this;

        // Render components
        this.registerToolbarButton();
        this.renderWidget();

        // Listen for battery events: "battery <status> <level> <mode>"
        this.instance.registerEventCallback('battery', (message) => {
            const values = message.split(' ');
            if (values.length !== 4) {
                return;
            }
            this.updateUIBatteryState(values[1], values[2], values[3]);
        });
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-battery-button',
            title: this.i18n.BATTERY_TITLE || 'Battery',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const { container } = this.createTemplateModal({
            title: this.i18n.BATTERY_TITLE || 'Battery',
            classes: 'gm-battery-plugin',
            width: 378,
            height: 330,
        });

        // Charge level
        this.chargeGroup = document.createElement('div');
        this.chargeGroup.className = 'gm-battery-charge-group';

        const chargeLabel = document.createElement('label');
        chargeLabel.innerHTML = this.i18n.BATTERY_CHARGE_LEVEL || 'Charge level';
        this.chargeGroup.appendChild(chargeLabel);

        const chargeImageGroup = document.createElement('div');
        chargeImageGroup.className = 'gm-charge-image-group';

        const chargeImageOverlayContainer = document.createElement('div');
        chargeImageOverlayContainer.className = 'gm-charge-image-overlay-container';

        const chargeImage = document.createElement('div');
        this.chargeImageOverlay = document.createElement('div');
        chargeImage.className = 'gm-charge-image';
        this.chargeImageOverlay.className = 'gm-charge-image-overlay';
        this.chargeImageOverlay.style.height = '50%;';
        chargeImageGroup.appendChild(chargeImage);
        chargeImageOverlayContainer.appendChild(this.chargeImageOverlay);
        chargeImageGroup.appendChild(chargeImageOverlayContainer);
        this.chargeGroup.appendChild(chargeImageGroup);

        const sliderGroup = document.createElement('div');
        sliderGroup.style.display = 'flex';

        // slider range for battery level
        this.chargeSlider = document.createElement('gm-slider');
        this.chargeSlider.setAttribute('min', '0');
        this.chargeSlider.setAttribute('max', '100');
        this.chargeSlider.setAttribute('value', '50');
        this.chargeSlider.className = 'battery-slider';

        this.chargeSlider.addEventListener('gm-change', (e) => {
            const value = e.detail.value;
            this.chargeInput.setValue(value);
            this.updateUIBatteryChargingPercent(value);
            this.sendDataToInstance();
        });

        this.chargeSlider.addEventListener('gm-input', (e) => {
            const value = e.detail.value;
            this.chargeInput.setValue(value);
            this.updateUIBatteryChargingPercent(value);
        });

        sliderGroup.appendChild(this.chargeSlider);

        // Charge level input
        this.chargeInput = textInput.createTextInput({
            appendText: '%',
            value: '50',
            regexFilter: /^(0?[0-9]{1,2}|100)$/,
            classes: 'gm-charge-input',
            onChange: (value) => {
                this.chargeSlider.value = value;
                this.updateUIBatteryChargingPercent(value);
                this.sendDataToInstance();
            },
        });
        sliderGroup.appendChild(this.chargeInput.element);
        this.chargeGroup.appendChild(sliderGroup);

        container.appendChild(this.chargeGroup);

        const separator = document.createElement('div');
        separator.className = 'gm-separator';
        container.appendChild(separator);

        // Charging state
        const chargingGroup = document.createElement('div');
        chargingGroup.className = 'gm-battery-charging-group';

        const chargingLabel = document.createElement('label');
        chargingLabel.innerHTML = this.i18n.BATTERY_CHARGING || 'Charging';
        chargingGroup.appendChild(chargingLabel);

        this.chargingStatus = document.createElement('div');
        this.chargingStatus.className = 'gm-charging-status';
        this.chargingStatus.innerHTML = 'Not charging';

        // Switch button for charging state
        this.chargingInput = document.createElement('gm-switch');
        this.chargingInput.addEventListener('gm-change', () => {
            this.sendDataToInstance();
            this.updateUIBatteryChargingState();
        });

        this.chargingStatus.className = 'gm-charging-status';
        this.chargingStatus.innerHTML = 'Not charging';

        chargingGroup.appendChild(this.chargingStatus);
        chargingGroup.appendChild(this.chargingInput);
        container.appendChild(chargingGroup);
    }

    /**
     * Send information to instance.
     */
    sendDataToInstance() {
        const json = {
            channel: 'battery',
            messages: [
                'set_level ' + this.chargeSlider.value,
                'set_status ' + (this.chargingInput.checked ? 'charging' : 'discharging'),
            ],
        };
        this.instance.sendEvent(json);
    }

    /**
     * Update UI based on battery events.
     *
     * @param {string} status Battery status (charging/discharging/full/not-charging).
     * @param {string} level  Battery level (0-100).
     * @param {string} mode   Battery mode (ac/usb/wireless).
     */
    updateUIBatteryState(status, level, mode) {
        this.chargeSlider.value = level;
        this.chargeInput.setValue(level);
        this.updateUIBatteryChargingPercent(level);

        if (status === 'charging') {
            this.chargingInput.checked = true;
            this.chargingStatus.innerHTML = this.i18n.BATTERY_CHARGING || 'Charging';
            this.chargingStatus.classList.add('charging');
        } else {
            this.chargingInput.checked = false;
            this.chargingStatus.innerHTML = this.i18n.BATTERY_NOT_CHARGING || 'Not charging';
            this.chargingStatus.classList.remove('charging');
        }
    }

    /**
     * Update UI battery level.
     *
     * @param {string} value Battery level.
     */
    updateUIBatteryChargingPercent(value) {
        this.chargeImageOverlay.style.height = 100 - value + '%';
    }

    /**
     * Update UI battery charging state.
     */
    updateUIBatteryChargingState() {
        if (this.chargingInput.checked) {
            this.chargingStatus.innerHTML = this.i18n.BATTERY_CHARGING || 'Charging';
            this.chargingStatus.classList.add('charging');
        } else {
            this.chargingStatus.innerHTML = this.i18n.BATTERY_NOT_CHARGING || 'Not charging';
            this.chargingStatus.classList.remove('charging');
        }
    }
}
