import OverlayPlugin from './util/OverlayPlugin';

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
            height: 360,
        });

        // Charge level
        this.chargeGroup = document.createElement('div');

        const chargeLabel = document.createElement('label');
        chargeLabel.innerHTML = this.i18n.BATTERY_CHARGE_LEVEL || 'Charge level';
        this.chargeGroup.appendChild(chargeLabel);

        // Container for the row (Icon, Slider, Input)
        const levelRow = document.createElement('div');
        levelRow.className = 'gm-charge-level-group';

        const chargeImageGroup = document.createElement('div');
        chargeImageGroup.className = 'gm-charge-image-group';

        const chargeImageOverlayContainer = document.createElement('div');
        chargeImageOverlayContainer.className = 'gm-charge-image-overlay-container';

        const chargeImage = document.createElement('div');
        this.chargeImageOverlay = document.createElement('div');
        chargeImage.className = 'gm-charge-image';
        this.chargeImageOverlay.className = 'gm-charge-image-overlay';
        this.chargeImageOverlay.style.height = '50%';

        chargeImageGroup.appendChild(chargeImage);
        chargeImageOverlayContainer.appendChild(this.chargeImageOverlay);
        chargeImageGroup.appendChild(chargeImageOverlayContainer);

        levelRow.appendChild(chargeImageGroup);

        // 2. Slider
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

        levelRow.appendChild(this.chargeSlider);

        // 3. Input
        this.chargeInput = document.createElement('gm-text-input');
        this.chargeInput.setAttribute('append-text', '%');
        this.chargeInput.setAttribute('value', '50');
        this.chargeInput.className = 'gm-charge-input';
        this.chargeInput.regexFilter = /^(0?[0-9]{1,2}|100)$/;

        this.chargeInput.addEventListener('gm-input', (e) => {
            const value = e.detail.value;
            this.chargeSlider.value = value;
            this.updateUIBatteryChargingPercent(value);
            this.sendDataToInstance();
        });

        levelRow.appendChild(this.chargeInput);

        this.chargeGroup.appendChild(levelRow);
        container.appendChild(this.chargeGroup);

        const separator = document.createElement('div');
        separator.className = 'gm-separator';
        container.appendChild(separator);

        // Charging state
        const chargingGroup = document.createElement('div');

        const chargingLabel = document.createElement('label');
        chargingLabel.innerHTML = this.i18n.BATTERY_STATE_OF_CHARGE || 'State of charge';
        chargingGroup.appendChild(chargingLabel);

        // Container for the row (Icon, Status, Switch)
        const chargingRow = document.createElement('div');
        chargingRow.className = 'gm-charging-group';

        // 1. Charging Image
        this.chargingImage = document.createElement('div');
        this.chargingImage.className = 'gm-charging-image';
        chargingRow.appendChild(this.chargingImage);

        // 2. Charging Status Text
        this.chargingStatus = document.createElement('div');
        this.chargingStatus.className = 'gm-charging-status';
        this.chargingStatus.innerHTML = 'Not charging';
        chargingRow.appendChild(this.chargingStatus);

        // 3. Switch
        this.chargingInput = document.createElement('gm-switch');
        this.chargingInput.addEventListener('gm-change', () => {
            this.sendDataToInstance();
            this.updateUIBatteryChargingState();
        });
        chargingRow.appendChild(this.chargingInput);

        chargingGroup.appendChild(chargingRow);
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
            this.chargingImage.classList.add('charging');
        } else {
            this.chargingInput.checked = false;
            this.chargingStatus.innerHTML = this.i18n.BATTERY_NOT_CHARGING || 'Not charging';
            this.chargingStatus.classList.remove('charging');
            this.chargingImage.classList.remove('charging');
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
            this.chargingImage.classList.add('charging');
        } else {
            this.chargingStatus.innerHTML = this.i18n.BATTERY_NOT_CHARGING || 'Not charging';
            this.chargingStatus.classList.remove('charging');
            this.chargingImage.classList.remove('charging');
        }
    }
}
