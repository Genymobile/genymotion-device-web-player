import OverlayPlugin from './util/OverlayPlugin';
import '@/components/GmSwitch';
import '@/components/GmSlider';
import '@/components/GmTextInput.js';

/**
 * Instance battery plugin.
 * Provides battery level and state control.
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

        // Display widget
        this.registerToolbarButton();
        this.renderWidget();

        // Listen for battery messages: "state mode <discharging/charging/full> <value>"
        this.instance.registerEventCallback('battery', (message) => {
            const values = message.split(' ').splice(-2);

            if (values.length !== 2) {
                return;
            }

            // Update only UI
            this.chargingInput.checked = values[0] !== 'discharging';

            this.updateUIBatteryChargingState();

            const numValue = parseFloat(values[1]);
            // Only update slider if value is valid number, otherwise keep current value
            if (!Number.isNaN(numValue)) {
                this.chargeSlider.value = numValue;
            }
            this.chargeInput.value = values[1];
            this.updateUIBatteryChargingPercent(values[1]);
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
            onClick: () => this.toggleWidget(),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.BATTERY_TITLE || 'Battery',
            classes: 'gm-battery-plugin',
            width: 378,
            height: 331,
        });

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';
        const batteryLevelLabel = this.i18n.BATTERY_CHARGE_LEVEL || 'Charge level';
        const levelTitleLabel = document.createElement('label');
        levelTitleLabel.textContent = batteryLevelLabel;
        inputs.appendChild(levelTitleLabel);

        // Create charge level inputs
        inputs.appendChild(this.createLevelSection());

        // Add charging label
        const chargingLabel = document.createElement('label');
        chargingLabel.textContent = this.i18n.BATTERY_CHARGE_STATE || 'State of charge';
        inputs.appendChild(chargingLabel);

        // Add charging section
        inputs.appendChild(this.createChargingSection());

        // Append inputs to the modal container
        container.appendChild(inputs);
    }

    /**
     * Create and return the widget "charging" section.
     *
     * @return {HTMLElement} Charging section.
     */
    createChargingSection() {
        const chargingGroup = document.createElement('div');
        this.chargingStatus = document.createElement('div');
        chargingGroup.className = 'gm-charging-group';

        this.chargingImage = document.createElement('div');
        this.chargingImage.className = 'gm-charging-image';
        chargingGroup.appendChild(this.chargingImage);

        // Switch button for charging state
        this.chargingInput = document.createElement('gm-switch');
        this.chargingInput.addEventListener('gm-switch-change', () => {
            this.sendDataToInstance();
            this.updateUIBatteryChargingState();
        });

        this.chargingStatus.className = 'gm-charging-status';
        this.chargingStatus.innerHTML = 'Not charging';
        chargingGroup.appendChild(this.chargingStatus);
        chargingGroup.appendChild(this.chargingInput);

        return chargingGroup;
    }

    /**
     * Create and return the widget "level" section.
     *
     * @return {HTMLElement} Level section.
     */
    createLevelSection() {
        this.chargeGroup = document.createElement('div');
        this.chargeGroup.className = 'gm-charge-level-group';

        // Charge level image
        const chargeImageGroup = document.createElement('div');
        chargeImageGroup.className = 'gm-charge-image-group';
        const chargeImage = document.createElement('div');
        const chargeImageOverlayContainer = document.createElement('div');
        chargeImageOverlayContainer.className = 'gm-charge-image-overlay-container';
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
        this.chargeSlider.min = 0;
        this.chargeSlider.max = 100;
        this.chargeSlider.value = 50;

        this.chargeSlider.addEventListener('gm-slider-change', (e) => {
            this.chargeInput.value = e.detail.value;
            this.updateUIBatteryChargingPercent(e.detail.value);
            this.sendDataToInstance();
        });

        this.chargeSlider.addEventListener('gm-slider-input', (e) => {
            // update UI without sending data to instance
            this.chargeInput.value = e.detail.value;
            this.updateUIBatteryChargingPercent(e.detail.value);
        });

        sliderGroup.appendChild(this.chargeSlider);
        this.chargeGroup.appendChild(sliderGroup);

        // Charge level input
        this.chargeInput = document.createElement('gm-text-input');
        this.chargeInput.setAttribute('type', 'number');
        this.chargeInput.setAttribute('append-text', '%');
        this.chargeInput.setAttribute('value', '50');
        this.chargeInput.setAttribute('min', '0');
        this.chargeInput.setAttribute('max', '100');
        this.chargeInput.setAttribute('strict-range', '');
        this.chargeInput.classList.add('gm-charge-input', 'gm-no-error-space');

        this.chargeInput.addEventListener('gm-text-input-change', (e) => {
            const value = e.detail.value;
            this.chargeSlider.value = parseFloat(value) || 0;
            this.updateUIBatteryChargingPercent(value);
            this.sendDataToInstance();
        });

        // Handle blur to reset empty value to 0
        this.chargeInput.inputElement?.addEventListener('blur', (e) => {
            if (e.target.value === '') {
                this.chargeInput.value = '0';
                // Trigger change manually if needed, or rely on bind
            }
        });

        // bind arrow keys to input, to increase/decrease value with arrow up/down
        this.instance.addListener(this.chargeInput, 'keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.chargeInput.value = Math.min(100, Number(this.chargeInput.value) + 1);
                // Manually trigger updates as setter doesn't emit events
                this.chargeSlider.value = parseFloat(this.chargeInput.value);
                this.updateUIBatteryChargingPercent(this.chargeInput.value);
                this.sendDataToInstance();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.chargeInput.value = Math.max(0, Number(this.chargeInput.value) - 1);
                // Manually trigger updates
                this.chargeSlider.value = parseFloat(this.chargeInput.value);
                this.updateUIBatteryChargingPercent(this.chargeInput.value);
                this.sendDataToInstance();
            }
        });

        this.chargeGroup.appendChild(this.chargeInput);

        return this.chargeGroup;
    }

    /**
     * Display or hide the widget.
     */

    /**
     * Update widget charging state UI.
     *
     * @param {boolean} charging Whether or not the battery is charging.
     */
    updateUIBatteryChargingState() {
        this.chargingImage.classList[this.chargingInput.checked ? 'add' : 'remove']('charging');

        const chargingLabel = this.i18n.BATTERY_CHARGING || 'Charging';
        const dischargingLabel = this.i18n.BATTERY_DISCHARGING || 'Not charging';

        this.chargingStatus.innerHTML = this.chargingInput.checked ? chargingLabel : dischargingLabel;
    }

    /**
     * Synchronize widget UI.
     *
     * @param  {number}  value Battery level.
     * @return {boolean}       Whether or not battery level has been applied.
     */
    updateUIBatteryChargingPercent(value) {
        value = Number(value);
        if (Number.isNaN(value)) {
            return false;
        }

        value = Math.min(Math.max(0, value), 100);
        this.chargeImageOverlay.style.cssText = 'height: calc( ' + value + '% + 1px);';
        this.chargeGroup.classList.remove('low', 'medium');
        if (value <= 10) {
            this.chargeGroup.classList.add('low');
        } else if (value <= 20) {
            this.chargeGroup.classList.add('medium');
        }
        return true;
    }

    /**
     * Send information to instance.
     */
    sendDataToInstance() {
        const level = Number(this.chargeInput.value);
        const charging = this.chargingInput.checked ? 'charging' : 'discharging';
        const json = {
            channel: 'battery',
            messages: ['set state level ' + level, 'set state status ' + charging],
        };
        this.instance.sendEvent(json);
    }
}
