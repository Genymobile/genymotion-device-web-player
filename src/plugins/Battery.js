'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {slider, switchButton, textInput} = require('./util/components');

/**
 * Instance battery plugin.
 * Provides battery level and state control.
 */
module.exports = class Battery extends OverlayPlugin {
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
            this.chargingInput.setState(values[0] !== 'discharging');

            this.updateUIBatteryChargingState();

            this.chargeSlider.setValue(values[1], false);
            this.chargeInput.setValue(values[1]);
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
        inputs.innerHTML = '<label>' + batteryLevelLabel + '</label>';

        // Create charge level inputs
        inputs.appendChild(this.createLevelSection());

        // Add charging label
        const chargingLabel = document.createElement('label');
        chargingLabel.innerHTML = this.i18n.BATTERY_CHARGE_STATE || 'State of charge';
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
        this.chargingInput = switchButton.createSwitch({
            onChange: () => {
                this.sendDataToInstance();
                this.updateUIBatteryChargingState();
            },
        });

        this.chargingStatus.className = 'gm-charging-status';
        this.chargingStatus.innerHTML = 'Not charging';
        chargingGroup.appendChild(this.chargingStatus);
        chargingGroup.appendChild(this.chargingInput.element);

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
        this.chargeSlider = slider.createSlider({
            min: 0,
            max: 100,
            value: 50,
            onChange: (value) => {
                this.chargeInput.setValue(value);
                this.updateUIBatteryChargingPercent(value);
                this.sendDataToInstance();
            },
            onCursorMove: (value) => {
                // update UI withous sending data to instance
                this.chargeInput.setValue(value);
                this.updateUIBatteryChargingPercent(value);
            },
        });

        sliderGroup.appendChild(this.chargeSlider.element);
        this.chargeGroup.appendChild(sliderGroup);

        // Charge level input
        this.chargeInput = textInput.createTextInput({
            appendText: '%',
            value: '50',
            regexFilter: /^(0?[0-9]{1,2}|100)$/,
            onChange: (value) => {
                this.chargeSlider.setValue(value);
                this.updateUIBatteryChargingPercent(value);
                this.sendDataToInstance();
            },
        });

        // bind arrow keys to input, to increase/decrease value with arrow up/down
        this.instance.addListener(this.chargeInput.element, 'keydown', (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.chargeInput.setValue(Math.min(100, Number(this.chargeInput.getValue()) + 1), true);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.chargeInput.setValue(Math.max(0, Number(this.chargeInput.getValue()) - 1), true);
            }
        });

        this.chargeInput.element.className = 'gm-charge-input';

        this.chargeGroup.appendChild(this.chargeInput.element);

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
        this.chargingImage.classList[this.chargingInput.getState() ? 'add' : 'remove']('charging');

        const chargingLabel = this.i18n.BATTERY_CHARGING || 'Charging';
        const dischargingLabel = this.i18n.BATTERY_DISCHARGING || 'Not charging';

        this.chargingStatus.innerHTML = this.chargingInput.getState() ? chargingLabel : dischargingLabel;
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
        this.chargeImageOverlay.style.cssText = 'height: ' + value + '%';
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
        const level = Number(this.chargeInput.getValue());
        const charging = this.chargingInput.getState() ? 'charging' : 'discharging';
        const json = {
            channel: 'battery',
            messages: ['set state level ' + level, 'set state status ' + charging],
        };
        this.instance.sendEvent(json);
    }
};
