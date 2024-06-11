'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

/**
 * Instance battery plugin.
 * Provides battery level and state control.
 */
module.exports = class Battery extends OverlayPlugin {
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

        // Listen for initial battery charging status
        this.instance.registerEventCallback('BATTERY_STATUS', (value) => {
            this.updateUIBatteryChargingState(value !== 'false');
        });

        // Display widget
        this.renderToolbarButton();
        this.renderWidget();

        // Listen for initial battery level
        this.instance.registerEventCallback('BATTERY_LEVEL', this.onBatteryLevelChange.bind(this));

        // Listen for battery messages: "state mode <discharging/charging/full> <value>"
        this.instance.registerEventCallback('battery', (message) => {
            const values = message.split(' ').splice(-2);

            if (values.length !== 2) {
                return;
            }

            this.updateUIBatteryChargingState(values[0] !== 'discharging');
            this.onBatteryLevelChange(values[1]);
        });
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
        this.toolbarBtnImage.className = 'gm-icon-button gm-battery-button';
        this.toolbarBtnImage.title = this.i18n.BATTERY_TITLE || 'Battery';
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
        this.container = document.createElement('div');

        // Generate title
        const title = document.createElement('div');
        title.className = 'gm-title';
        title.innerHTML = this.i18n.BATTERY_TITLE || 'Battery';
        this.container.appendChild(title);

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

        // Setup
        this.container.appendChild(inputs);
        this.widget.className = 'gm-overlay gm-battery-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.onclick = this.toggleWidget.bind(this);
        close.className = 'gm-close-btn';

        this.widget.appendChild(close);
        this.widget.appendChild(this.container);

        // Render into document
        this.overlays.push(this.widget);
        this.instance.root.appendChild(this.widget);
    }

    /**
     * Create and return the widget "charging" section.
     *
     * @return {HTMLElement} Charging section.
     */
    createChargingSection() {
        const chargingGroup = document.createElement('div');
        this.chargingInput = document.createElement('input');
        this.chargingStatus = document.createElement('div');
        chargingGroup.className = 'gm-charging-group';
        this.chargingInput.type = 'checkbox';
        this.chargingInput.className = 'gm-charging-checkbox';
        this.chargingInput.onchange = this.toggleChargingState.bind(this);
        this.chargingInput.checked = true;
        this.chargingStatus.className = 'gm-charging-status';
        this.chargingStatus.innerHTML = 'Discharging';
        chargingGroup.appendChild(this.chargingInput);
        chargingGroup.appendChild(this.chargingStatus);

        return chargingGroup;
    }

    /**
     * Create and return the widget "level" section.
     *
     * @return {HTMLElement} Level section.
     */
    createLevelSection() {
        const chargeGroup = document.createElement('div');
        chargeGroup.className = 'gm-charge-level-group';

        const inputGroup = document.createElement('div');
        this.chargeInput = document.createElement('input');
        const chargeInputLabel = document.createElement('span');
        chargeInputLabel.innerHTML = '%';
        this.chargeInput.className = 'gm-charge-input';
        this.chargeInput.type = 'number';
        this.chargeInput.value = 50;
        this.chargeInput.max = 100;
        this.chargeInput.min = 0;
        this.chargeInput.step = 1;
        this.chargeInput.oninput = this.onBatteryLevelChangeEvent.bind(this);
        inputGroup.appendChild(this.chargeInput);
        inputGroup.appendChild(chargeInputLabel);
        chargeGroup.appendChild(inputGroup);

        const sliderGroup = document.createElement('div');
        this.chargeSlider = document.createElement('input');
        this.chargeSlider.className = 'gm-charge-slider';
        this.chargeSlider.type = 'range';
        this.chargeSlider.orient = 'vertical';
        this.chargeSlider.max = 100;
        this.chargeSlider.min = 0;
        this.chargeSlider.step = 1;
        this.chargeSlider.value = 50;
        this.chargeSlider.onchange = this.onBatteryLevelChangeEvent.bind(this);
        sliderGroup.appendChild(this.chargeSlider);
        chargeGroup.appendChild(sliderGroup);

        const chargeImageGroup = document.createElement('div');
        this.chargeImage = document.createElement('div');
        this.chargeImageOverlay = document.createElement('div');
        this.chargeImage.className = 'gm-charge-image';
        this.chargeImageOverlay.className = 'gm-charge-image-overlay';
        this.chargeImageOverlay.style.cssText = 'height: ' + 40 + '%;';
        chargeImageGroup.appendChild(this.chargeImage);
        this.chargeImage.appendChild(this.chargeImageOverlay);
        chargeGroup.appendChild(chargeImageGroup);

        return chargeGroup;
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
     * Toggle Instance charging status between 'charging' and 'discharging';
     */
    toggleChargingState() {
        this.chargingStatus.classList.toggle('charging');

        const chargingLabel = this.i18n.BATTERY_CHARGING || 'Charging';
        const dischargingLabel = this.i18n.BATTERY_DISCHARGING || 'Discharging';

        this.chargingStatus.innerHTML = this.chargingInput.checked ? chargingLabel : dischargingLabel;
        this.sendDataToInstance();
    }

    /**
     * Update widget charging state UI.
     *
     * @param {boolean} charging Whether or not the battery is charging.
     */
    updateUIBatteryChargingState(charging) {
        this.chargingInput.checked = charging;
        this.chargingStatus.classList[charging ? 'add' : 'remove']('charging');

        const chargingLabel = this.i18n.BATTERY_CHARGING || 'Charging';
        const dischargingLabel = this.i18n.BATTERY_DISCHARGING || 'Discharging';

        this.chargingStatus.innerHTML = charging ? chargingLabel : dischargingLabel;
    }

    /**
     * Handle battery level change events (slider & text input).
     *
     * @param {Event} event Event.
     */
    onBatteryLevelChangeEvent(event) {
        const value = Number(event.target.value);
        if (this.onBatteryLevelChange(value)) {
            this.sendDataToInstance();
        }
    }

    /**
     * Synchronize widget UI.
     *
     * @param  {number}  value Battery level.
     * @return {boolean}       Whether or not battery level has been applied.
     */
    onBatteryLevelChange(value) {
        value = Number(value);
        if (Number.isNaN(value)) {
            return false;
        }

        value = Math.min(Math.max(0, value), 100);
        this.chargeSlider.value = value;
        this.chargeInput.value = value;
        this.chargeImageOverlay.style.cssText = 'height: ' + (value * 0.7 + 4) + '%;';
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
};
