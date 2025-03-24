'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {dropdownSelect, textInput, chipTag} = require('./util/components');

const PROFILES = require('./util/iothrottling-profiles');
const PROFILE_CUSTOM_NAME = 'Custom';
const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE << 10;

/**
 * Instance IO throttling plugin.
 * Provides disk I/O control.
 */
module.exports = class IOThrottling extends OverlayPlugin {
    static get name() {
        return 'IOThrottling';
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
        this.instance.diskIO = this;

        this.lastReadByteRateReceived = 0;

        // Array of profiles for dropdown
        this.profilesForDropdown = PROFILES.map((profile) => {
            const divContainer = document.createElement('div');
            const label = document.createElement('div');
            const name = document.createElement('div');
            divContainer.appendChild(name);
            divContainer.appendChild(label);
            divContainer.style.display = 'flex';
            divContainer.style.justifyContent = 'space-between';
            name.innerHTML = profile.name;
            label.innerHTML = profile.label || '';
            return {
                element: divContainer,
                value: profile.readByteRate ?? profile.name,
                valueToDisplay: profile.name || '',
            };
        });

        // Render components
        this.registerToolbarButton();
        this.renderWidget();

        // Listen for diskio messages: "readbyterate <value>" (or "cachecleared")
        this.instance.registerEventCallback('diskio', (message) => {
            const values = message.split(' ');
            if (values[0] === 'readbyterate' && values.length === 2) {
                this.lastReadByteRateReceived = values[1] / BYTES_PER_MEGABYTE;
                this.updateDiskIOValues(this.lastReadByteRateReceived);
            }
        });
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-iothrottling-button',
            title: this.i18n.IOTHROTTLING_TITLE || 'Disk I/O',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements

        const {container} = this.createTemplateModal({
            title: this.i18n.IOTHROTTLING_TITLE || 'Disk I/O',
            classes: 'gm-iothrottling-plugin',
            width: 378,
            height: 422,
        });

        this.container = container;

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        const IOThrottlingLabel = this.i18n.IOTHROTTLING_PROFILE || 'Profile';
        inputs.innerHTML = '<label>' + IOThrottlingLabel + '</label>';

        this.dropdownProfile = dropdownSelect.createDropdown({
            items: this.profilesForDropdown,
            value: 0,
            dropdownMaxHeight: 205,
            hasCheckmark: true,
            onChange: (newValue) => {
                this.updateDiskIOValues(newValue);
            },
        });
        inputs.appendChild(this.dropdownProfile.element);

        const readByteRateDiv = document.createElement('div');
        readByteRateDiv.classList.add('gm-fields');
        const readByteRateContainer = document.createElement('div');
        readByteRateContainer.classList.add('gm-fields-container');
        readByteRateDiv.appendChild(readByteRateContainer);

        const readByteRateText = document.createElement('div');
        readByteRateText.innerHTML = this.i18n.IOTHROTTLING_READ_BYTERATE || 'Read speed limit:';

        this.readByteRate = textInput.createTextInput({
            value: '50',
            classes: 'gm-iothrottling-readbyterate',
            regexFilter: /^[0-9]*$/,
        });

        const readByteRateSpeedText = document.createElement('div');
        readByteRateSpeedText.innerHTML = this.i18n.IOTHROTTLING_BYTERATE_UNIT || 'MiB per sec';
        readByteRateSpeedText.classList.add('gm-units');
        const readByteRateSpeedNoneText = document.createElement('div');
        readByteRateSpeedNoneText.innerHTML = this.i18n.IOTHROTTLING_BYTERATE_NONE || 'No disk performance alteration';
        readByteRateSpeedNoneText.classList.add('gm-noThrottling');
        const readByteRateSpeedCustomText = document.createElement('div');
        readByteRateSpeedCustomText.innerHTML =
            this.i18n.IOTHROTTLING_BYTERATE_CUSTOM || 'Enter the read speed limit you wish to emulate.';
        readByteRateSpeedCustomText.classList.add('gm-customThrottling');

        readByteRateContainer.appendChild(readByteRateText);
        readByteRateContainer.appendChild(this.readByteRate.element);
        readByteRateContainer.appendChild(readByteRateSpeedText);
        readByteRateContainer.appendChild(readByteRateSpeedNoneText);
        readByteRateDiv.appendChild(readByteRateSpeedCustomText);

        // Separator
        const separator = document.createElement('div');
        separator.className = 'gm-separator';
        // Add apply button
        const applyBtnDiv = document.createElement('div');
        applyBtnDiv.className = 'gm-iothrottling-apply';
        const statusDiv = document.createElement('div');
        statusDiv.className = 'gm-iothrottling-status';
        const appliedTag = chipTag.createChip();
        const statusNotApplied = document.createElement('div');
        statusNotApplied.innerHTML = 'Not applied';
        statusNotApplied.className = 'gm-iothrottling-notapplied-text';

        statusDiv.appendChild(statusNotApplied);
        statusDiv.appendChild(appliedTag.element);

        const applyBtn = document.createElement('button');
        applyBtn.className = 'gm-btn';
        applyBtn.innerHTML = this.i18n.IOTHROTTLING_UPDATE || 'Apply';
        applyBtn.onclick = this.sendDataToInstance.bind(this);

        applyBtnDiv.appendChild(statusDiv);
        applyBtnDiv.appendChild(applyBtn);

        // Add clear cache button
        const clearCacheDiv = document.createElement('div');
        clearCacheDiv.className = 'gm-iothrottling-clearcache';
        const clearCacheLabel = this.i18n.CLEAR_CACHE_PROFILE || 'Disk cache';
        clearCacheDiv.innerHTML = '<label>' + clearCacheLabel + '</label>';

        this.clearCacheBtn = document.createElement('button');
        this.clearCacheBtn.className = 'gm-btn';
        this.clearCacheBtn.innerHTML = this.i18n.IOTHROTTLING_CLEAR_CACHE || 'Clear';
        this.clearCacheBtn.onclick = this.clearCache.bind(this);
        clearCacheDiv.appendChild(this.clearCacheBtn);

        // Setup
        this.container.appendChild(inputs);
        this.container.appendChild(readByteRateDiv);
        this.container.appendChild(applyBtnDiv);
        this.container.appendChild(separator);
        this.container.appendChild(clearCacheDiv);
    }

    /**
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        const json = {
            channel: 'diskio',
            messages: ['set readbyterate ' + this.readByteRate.getValue() * BYTES_PER_MEGABYTE, 'clearcache'],
        };
        this.instance.sendEvent(json);
    }

    /**
     * Clear cache button handler.
     *
     * @param {Event} event Event.
     */
    clearCache(event) {
        this.container.classList.remove('gm-iothrottling-cache-cleared');
        // Force a reflow to restart the animation
        void this.container.offsetWidth;
        this.container.classList.add('gm-iothrottling-cache-cleared');
        event.preventDefault();

        const json = {channel: 'diskio', messages: ['clearcache']};
        this.instance.sendEvent(json);
    }

    /**
     * Handles disk I/O parameters changes. Keeps UI in sync with the instance state.
     *
     * @param {number} readSpeed Read byte rate.
     */
    updateDiskIOValues(readSpeed) {
        this.container.classList.remove('gm-iothrottling-saved');
        this.container.classList.remove('gm-iothrottling-none');
        this.container.classList.remove('gm-iothrottling-custom');

        // Handle the chipTag display. If readSpeed is custom (trigger from dropdown)
        const readSpeedIsCustom = readSpeed === PROFILE_CUSTOM_NAME;
        if (readSpeedIsCustom) {
            // if the lastReadByteRateReceived exists in the profiles the active profil isn't a custom one
            const profile = this.profilesForDropdown.find((p) => p.value === this.lastReadByteRateReceived);

            if (!profile) {
                this.container.classList.add('gm-iothrottling-saved');
            }
        } else if (readSpeed === this.lastReadByteRateReceived) {
            // if readSpeed isn't custom and is equal to the lastReadByteRateReceived then the active profil is dropdown profil
            this.container.classList.add('gm-iothrottling-saved');
        }

        // if readspeed is not a number or is less than 0 then set select "none" profile
        if (!readSpeedIsCustom && (Number.isNaN(readSpeed) || readSpeed <= 0)) {
            this.readByteRate.setValue(0);
            this.dropdownProfile.setValue(this.profilesForDropdown.find((profile) => profile.value === 0));
            // Display Read speed limit: No disk performance alteration
            this.container.classList.add('gm-iothrottling-none');
            return;
        }

        const profile = this.profilesForDropdown.find((prof) => prof.value === readSpeed);

        if (!readSpeedIsCustom && profile) {
            this.readByteRate.setReadOnly(true);
            this.dropdownProfile.setValue(profile);
            this.readByteRate.setValue(readSpeed);
        } else {
            // custom
            this.container.classList.add('gm-iothrottling-custom');
            this.readByteRate.setReadOnly(false);
            const custom = this.profilesForDropdown.find((prof) => prof.value === PROFILE_CUSTOM_NAME);
            this.dropdownProfile.setValue(custom);
            this.readByteRate.setValue(this.lastReadByteRateReceived);
        }
    }
};
