'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const PROFILES = require('./util/iothrottling-profiles');
const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE << 10;

/**
 * Instance IO throttling plugin.
 * Provides disk I/O control.
 */
module.exports = class IOThrottling extends OverlayPlugin {
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
        this.instance.diskIO = this;

        this.fields = {};

        // Render components
        this.renderToolbarButton();
        this.renderWidget();

        // Listen for initial diskio
        this.instance.registerEventCallback('BLK', this.setActive.bind(this));

        // Listen for diskio messages: "readbyterate <value>" (or "cachecleared")
        this.instance.registerEventCallback('diskio', (message) => {
            const values = message.split(' ');
            if (values[0] === 'readbyterate' && values.length === 2) {
                this.updateDiskIOValues(values[1] / BYTES_PER_MEGABYTE);
            }
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
        this.toolbarBtnImage.className = 'gm-icon-button gm-iothrottling-button';
        this.toolbarBtnImage.title = this.i18n.IOTHROTTLING_TITLE || 'Disk I/O';
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
        title.innerHTML = this.i18n.IOTHROTTLING_TITLE || 'Disk I/O';
        this.form.appendChild(title);

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        const IOThrottlingLabel = this.i18n.IOTHROTTLING_PROFILE || 'Profile';
        inputs.innerHTML = '<label>' + IOThrottlingLabel + '</label>';

        // Create select
        this.select = document.createElement('select');
        this.select.className = 'gm-iothrottling-select';
        const defaultOption = new Option(this.i18n.IOTHROTTLING_PROFILE_NONE || 'None');
        this.select.add(defaultOption);
        this.select.onchange = this.changeProfile.bind(this);
        inputs.appendChild(this.select);

        // Add option for each child
        PROFILES.forEach((profile) => {
            const option = new Option(profile.label, profile.name);
            this.select.add(option);
        });

        this.readByteRateDiv = document.createElement('div');
        this.readByteRateDiv.classList.add('gm-fields');
        const readByteRateLabel = document.createElement('label');
        readByteRateLabel.innerHTML = this.i18n.IOTHROTTLING_READ_BYTERATE || 'Read speed limit:';
        this.readByteRate = document.createElement('input');
        this.readByteRate.className = 'gm-iothrottling-readbyterate';
        this.readByteRate.placeholder = this.i18n.IOTHROTTLING_READ_BYTERATE_EXAMPLE || 'eg: 100';
        this.readByteRate.title = this.i18n.READ_BYTE_RATE || 'Read speed limit';
        this.readByteRate.required = true;
        this.readByteRate.pattern = '[0-9]*';
        this.readByteRateDiv.appendChild(readByteRateLabel);
        const readByteRateSpeed = document.createElement('label');
        readByteRateSpeed.innerHTML = this.i18n.IOTHROTTLING_BYTERATE_UNIT || 'MiB per sec';
        readByteRateSpeed.classList.add('gm-units');
        this.readByteRateDiv.appendChild(readByteRateSpeed);
        this.readByteRateDiv.appendChild(this.readByteRate);

        // Add submit button
        this.submitBtn = document.createElement('button');
        this.submitBtn.className = 'gm-iothrottling-update';
        this.submitBtn.innerHTML = this.i18n.IOTHROTTLING_UPDATE || 'Update';
        this.submitBtn.onclick = this.sendDataToInstance.bind(this);

        // Add clear cache button
        this.clearCacheBtn = document.createElement('button');
        this.clearCacheBtn.className = 'gm-iothrottling-clearcache';
        this.clearCacheBtn.innerHTML = this.i18n.IOTHROTTLING_CLEAR_CACHE || 'Clear cache';
        this.clearCacheBtn.onclick = this.clearCache.bind(this);
        const clearCacheDiv = document.createElement('div');
        clearCacheDiv.appendChild(this.clearCacheBtn);

        // Setup
        this.form.appendChild(inputs);
        this.form.appendChild(this.readByteRateDiv);
        this.form.appendChild(clearCacheDiv);
        this.form.appendChild(this.submitBtn);

        this.setFieldsReadOnly(true);
        this.resetFields('0');
        this.displayFields(false);

        this.widget.className = 'gm-overlay gm-iothrottling-plugin gm-hidden';

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
     * Set custom fields read-only or not.
     *
     * @param {boolean} readOnly Desired read-only status.
     */
    setFieldsReadOnly(readOnly) {
        this.readByteRate.readOnly = readOnly;
    }

    /**
     * Reset custom fields value.
     *
     * @param {number} value Desired value.
     */
    resetFields(value) {
        value = typeof value !== 'undefined' ? value : '';
        this.readByteRate.value = value;
    }

    /**
     * Toggle custom fields input visibility.
     *
     * @param {boolean} display Whether or not inputs should be visible.
     */
    displayFields(display) {
        if (display) {
            this.readByteRateDiv.classList.remove('gm-hidden');
        } else {
            this.readByteRateDiv.classList.add('gm-hidden');
        }
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

        if (this.form.checkValidity()) {
            const json = {
                channel: 'diskio',
                messages: ['set readbyterate ' + this.readByteRate.value * BYTES_PER_MEGABYTE, 'clearcache'],
            };
            this.instance.sendEvent(json);
            this.toggleWidget();
        }
    }

    /**
     * Clear cache button handler.
     *
     * @param {Event} event Event.
     */
    clearCache(event) {
        event.preventDefault();

        const json = {channel: 'diskio', messages: ['clearcache']};
        this.instance.sendEvent(json);
    }

    /**
     * Handles profile change.
     */
    changeProfile() {
        const profile = PROFILES.find((elem) => elem.name === this.select.value);
        if (profile && profile.name !== 'Custom') {
            this.loadDetails(profile);
            this.displayFields(true);
        } else if (profile && profile.name === 'Custom') {
            this.setFieldsReadOnly(false);
            this.displayFields(true);
        } else {
            this.resetFields('0');
            this.displayFields(false);
        }
    }

    /**
     * Handles disk I/O parameters changes. Keeps UI in sync with the instance state.
     *
     * @param {number} readSpeed Read byte rate.
     */
    updateDiskIOValues(readSpeed) {
        readSpeed = Number(readSpeed);

        if (Number.isNaN(readSpeed) || readSpeed <= 0) {
            this.select.value = this.i18n.IOTHROTTLING_PROFILE_NONE || 'None';
            this.resetFields('0');
            this.displayFields(false);
            return;
        }

        this.readByteRate.value = readSpeed;
        const profile = PROFILES.find((elem) => elem.readByteRate === readSpeed);
        if (profile && profile.name !== 'Custom') {
            this.select.value = profile.name;
            this.loadDetails(profile);
            this.displayFields(true);
        } else {
            this.select.value = 'Custom';
            this.setFieldsReadOnly(false);
            this.displayFields(true);
        }
    }

    /**
     * Load fields with the given profile info.
     *
     * @param {Object} profile Selected profile.
     */
    loadDetails(profile) {
        if (profile.name !== 'Custom') {
            this.setFieldsReadOnly(true);
            this.readByteRate.value = profile.readByteRate;
        }
    }

    /**
     * Activate disk I/O throttling. Keeps UI in sync with the instance state.
     *
     * @param {number} readSpeed Read byte rate.
     */
    setActive(readSpeed) {
        this.updateDiskIOValues(Number(readSpeed) / BYTES_PER_KILOBYTE);
    }
};
