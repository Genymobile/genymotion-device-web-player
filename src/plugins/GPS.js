'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');
const {textInput, chipTag} = require('./util/components');
const {slider} = require('./util/components');

const log = require('loglevel');
log.setDefaultLevel('debug');

/* global google */

/**
 * Instance GPS plugin.
 * Provides GPS control.
 */
module.exports = class GPS extends OverlayPlugin {
    static get name() {
        return 'GPS';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object}  instance     Associated instance.
     * @param {Object}  i18n         Translations keys for the UI.
     * @param {boolean} speedSupport Enable speed support.
     */
    constructor(instance, i18n, speedSupport) {
        super(instance);

        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};

        // Register plugin
        this.instance.gps = this;

        // Input components
        this.inputComponents = {
            altitude: null,
            longitude: null,
            latitude: null,
            accuracy: null,
            bearing: null,
        };

        // Add speed field if supported
        if (speedSupport) {
            this.inputComponents.speed = null;
        }

        // Map references
        this.map = null;
        if (typeof google !== 'undefined') {
            this.elevationService = new google.maps.ElevationService();
        } else {
            this.elevationService = false;
        }
        this.markers = [];

        // Let's use Dalvik as default value
        this.mapLat = 65.9667;
        this.mapLng = -18.5333;
        this.elevation = 15.04444408;

        // The minimal zoom level of the map (if less, it will zoom automatically)
        this.minimumZoomLevel = 8;

        // Display widget
        this.registerToolbarButton();
        this.renderWidget();

        // Create map view if google maps is available
        this.loadMap();

        // Listen for gps events: "<altitude/latitude/longitude/accuracy/bearing/status/speed?> <value>"
        this.instance.registerEventCallback('gps', (message) => {
            const values = message.split(' ');
            if (Object.keys(this.inputComponents).includes(values[0]) && values.length >= 2) {
                this.setFieldValue(values[0], values[1]);
            }
            this.container.classList.add('gm-gps-saved');
        });
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-gps-button',
            title: this.i18n.GPS_TITLE || 'GPS',
            onClick: this.toggleWidget.bind(this),
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {container} = this.createTemplateModal({
            title: this.i18n.GPS_TITLE || 'GPS',
            classes: 'gm-gps-plugin',
            width: 498,
            height: 801,
        });

        this.container = container;

        // Maps
        this.mapview = document.createElement('div');
        this.mapview.className = 'gm-mapview';

        // set my positon button
        this.setToMyPositionWrapper = document.createElement('div');
        this.setToMyPositionWrapper.className = 'gm-gps-setToMyPosition-wrapper';

        this.setToMyPositionBtn = document.createElement('button');
        this.setToMyPositionBtn.className = 'gm-btn gm-gps-setToMyPosition';
        this.setToMyPositionBtn.innerHTML = this.i18n.SET_TO_MY_POSITION || 'Set to my position';
        this.isMyLocAvailable().then((isAvailable) => {
            if (isAvailable) {
                this.setToMyPositionBtn.disabled = false;
            } else {
                this.setToMyPositionBtn.disabled = true;
            }
        });
        this.setToMyPositionBtn.onclick = this.getLocation.bind(this);

        this.setToMyPositionWrapper.appendChild(this.setToMyPositionBtn);

        this.container.appendChild(this.mapview);
        this.container.appendChild(this.setToMyPositionWrapper);

        // Form
        this.form = document.createElement('form');

        // Position Section
        const positionSection = document.createElement('div');
        positionSection.className = 'gm-section';

        // First line: Latitude & Longitude
        const positionFirstLine = document.createElement('div');
        positionFirstLine.className = 'gm-gps-section-line';

        // Latitude input
        const latitudeDiv = document.createElement('div');
        latitudeDiv.className = 'gm-input-wrap';
        const latitudeLabel = document.createElement('label');
        latitudeLabel.innerHTML = this.i18n.GPS_LATITUDE || 'Latitude';
        latitudeDiv.appendChild(latitudeLabel);

        this.inputComponents.latitude = textInput.createTextInput({
            value: this.mapLat.toString(),
            regexFilter: /^-?\d*\.?\d*$/,
            regexValidField: /^-?(?:[0-8]?\d(?:\.\d*)?|90(?:\.0*)?)$/,
            messageField: true,
            unitText: 'o',
            onChange: () => {
                if (!this.inputComponents.latitude.checkValidity()) {
                    this.inputComponents.latitude.setErrorMessage('Between -90 and 90');
                } else {
                    this.inputComponents.latitude.setErrorMessage('');
                }
                this.checkErrors();
            },
        });
        latitudeDiv.appendChild(this.inputComponents.latitude.element);

        // Longitude input
        const longitudeDiv = document.createElement('div');
        longitudeDiv.className = 'gm-input-wrap';
        const longitudeLabel = document.createElement('label');
        longitudeLabel.innerHTML = this.i18n.GPS_LONGITUDE || 'Longitude';
        longitudeDiv.appendChild(longitudeLabel);

        this.inputComponents.longitude = textInput.createTextInput({
            value: this.mapLng.toString(),
            regexFilter: /^-?\d*\.?\d*$/,
            regexValidField: /^-?(?:(?:1[0-7]\d(?:\.\d*)?)|(?:[0-9]?\d(?:\.\d*)?)|180(?:\.0*)?)$/,
            messageField: true,
            unitText: 'o',
            onChange: () => {
                if (!this.inputComponents.longitude.checkValidity()) {
                    this.inputComponents.longitude.setErrorMessage('Between -180 and 180');
                } else {
                    this.inputComponents.longitude.setErrorMessage('');
                }
                this.checkErrors();
            },
        });
        longitudeDiv.appendChild(this.inputComponents.longitude.element);

        positionFirstLine.appendChild(latitudeDiv);
        positionFirstLine.appendChild(longitudeDiv);
        positionSection.appendChild(positionFirstLine);

        // Second line: Altitude & Accuracy
        const positionSecondLine = document.createElement('div');
        positionSecondLine.className = 'gm-gps-section-line';

        // Altitude input
        const altitudeDiv = document.createElement('div');
        altitudeDiv.className = 'gm-input-wrap';
        const altitudeLabel = document.createElement('label');
        altitudeLabel.innerHTML = this.i18n.GPS_ALTITUDE || 'Altitude';
        altitudeDiv.appendChild(altitudeLabel);

        this.inputComponents.altitude = textInput.createTextInput({
            value: this.elevation.toString(),
            regexFilter: /^-?\d*\.?\d*$/,
            regexValidField: /^-?(?:[0-9]\d{0,3}(?:\.\d*)?|10000(?:\.0*)?)$/,
            messageField: true,
            unitText: 'm',
            onChange: () => {
                if (!this.inputComponents.altitude.checkValidity()) {
                    this.inputComponents.altitude.setErrorMessage('Between -10,000 and 10,000');
                } else {
                    this.inputComponents.altitude.setErrorMessage('');
                }
                this.checkErrors();
            },
        });
        altitudeDiv.appendChild(this.inputComponents.altitude.element);

        // Accuracy input
        const accuracyDiv = document.createElement('div');
        accuracyDiv.className = 'gm-input-wrap';
        const accuracyLabel = document.createElement('label');
        accuracyLabel.innerHTML = this.i18n.GPS_ACCURACY || 'Accuracy';
        accuracyDiv.appendChild(accuracyLabel);

        // Create a flex wrapper for accuracy input and slider
        const accuracyWrapper = document.createElement('div');
        accuracyWrapper.className = 'gm-gps-accuracy-input-wrapper';

        // Create the accuracy slider
        this.accuracySlider = slider.createSlider({
            min: 0,
            max: 200,
            value: 0,
            classes: 'gm-gps-accuracy-slider',
            onChange: (value) => {
                this.inputComponents.accuracy.setValue(value);
                this.checkErrors();
            },
            onCursorMove: (value) => {
                // Update UI without sending data to instance
                this.inputComponents.accuracy.setValue(value);
                this.checkErrors();
            },
        });

        // Add the slider to the wrapper
        accuracyWrapper.appendChild(this.accuracySlider.element);

        this.inputComponents.accuracy = textInput.createTextInput({
            classes: 'gm-gps-accuracy-input',
            value: '0',
            regexFilter: /^$|^(0?[0-9]{1,2}|1[0-9]{2}|200)$/,
            regexValidField: /^(0?[0-9]{1,3}|200)$/,
            unitText: 'm',
            onChange: (v) => {
                // Update slider when input changes
                const value = parseFloat(v) || 0;
                this.accuracySlider.setValue(value);
                this.checkErrors();
            },
            onBlur: (v) => {
                if (v === '') {
                    this.inputComponents.accuracy.setValue('0');
                    this.accuracySlider.setValue(0);
                }
            },
        });

        // Add the input to the wrapper
        accuracyWrapper.appendChild(this.inputComponents.accuracy.element);

        // Add the wrapper to the accuracy div
        accuracyDiv.appendChild(accuracyWrapper);

        positionSecondLine.appendChild(altitudeDiv);
        positionSecondLine.appendChild(accuracyDiv);
        positionSection.appendChild(positionSecondLine);

        const positionThirdLine = document.createElement('div');
        positionThirdLine.className = 'gm-gps-section-line';

        // Speed input (optional)
        if (Object.keys(this.inputComponents).includes('speed')) {
            const speedDiv = document.createElement('div');
            speedDiv.className = 'gm-input-wrap';
            const speedLabel = document.createElement('label');
            speedLabel.innerHTML = this.i18n.GPS_SPEED || 'Speed';
            speedDiv.appendChild(speedLabel);

            this.inputComponents.speed = textInput.createTextInput({
                value: '0',
                regexFilter: /^-?\d*\.?\d*$/,
                regexValidField: /^(?:[0-2]?\d{1,2}(?:\.\d*)?|3[0-8]\d(?:\.\d*)?|399\.99)$/,
                messageField: true,
                unitText: 'm/s',
                onChange: () => {
                    if (!this.inputComponents.speed.checkValidity()) {
                        this.inputComponents.speed.setErrorMessage('Between 0 and 399.99');
                    } else {
                        this.inputComponents.speed.setErrorMessage('');
                    }
                    this.checkErrors();
                },
            });
            speedDiv.appendChild(this.inputComponents.speed.element);
            positionThirdLine.appendChild(speedDiv);
        }

        // Bearing input
        const bearingDiv = document.createElement('div');
        bearingDiv.className = 'gm-input-wrap';
        const bearingLabel = document.createElement('label');
        bearingLabel.innerHTML = this.i18n.GPS_BEARING || 'Bearing';
        bearingDiv.appendChild(bearingLabel);

        // Create a flex wrapper for bearing input and slider
        const bearingWrapper = document.createElement('div');
        bearingWrapper.className = 'gm-gps-bearing-input-wrapper';

        // Create the bearing slider
        this.bearingSlider = slider.createSlider({
            min: 0,
            max: 360,
            value: 0,
            classes: 'gm-gps-bearing-slider',
            onChange: (value) => {
                this.inputComponents.bearing.setValue(value);
                this.checkErrors();
            },
            onCursorMove: (value) => {
                // Update UI without sending data to instance
                this.inputComponents.bearing.setValue(value);
                this.checkErrors();
            },
        });

        // Add the slider to the wrapper
        bearingWrapper.appendChild(this.bearingSlider.element);

        this.inputComponents.bearing = textInput.createTextInput({
            value: '0',
            classes: 'gm-gps-bearing-input',
            regexFilter: /^$|^(0?[0-9]{1,2}|[1-2][0-9]{2}|3[0-5][0-9]|360)$/,
            regexValidField: /^(0?[0-9]{1,3}|360)$/,
            messageField: true,
            unitText: 'o',
            onChange: (v) => {
                // Update slider when input changes
                const value = parseFloat(v) || 0;
                this.bearingSlider.setValue(value);
                this.checkErrors();
            },
            onBlur: (v) => {
                if (v === '') {
                    this.inputComponents.bearing.setValue('0');
                    this.accuracySlider.setValue(0);
                }
            },
        });

        // Add the input to the wrapper
        bearingWrapper.appendChild(this.inputComponents.bearing.element);

        // Add the wrapper to the bearing div
        bearingDiv.appendChild(bearingWrapper);

        positionThirdLine.appendChild(bearingDiv);
        positionSection.appendChild(positionThirdLine);

        // Build form
        this.form.appendChild(positionSection);
        const sep1 = document.createElement('div');
        sep1.className = 'gm-separator';
        this.form.appendChild(sep1);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gm-actions';

        // TODO TEST TAG ON APPLY
        const appliedTag = chipTag.createChip();
        actionsDiv.appendChild(appliedTag.element);

        // Submit button
        this.submitBtn = document.createElement('button');
        this.submitBtn.innerHTML = this.i18n.GPS_APPLY || 'Apply';
        this.submitBtn.className = 'gm-btn gm-gps-update';
        this.submitBtn.onclick = this.sendDataToInstance.bind(this);
        this.submitBtn.disabled = true;
        actionsDiv.appendChild(this.submitBtn);

        // Build final layout
        this.form.appendChild(positionSection);
        this.container.appendChild(this.form);
        const sep4 = document.createElement('div');
        sep4.className = 'gm-separator';
        this.container.appendChild(sep4);
        this.container.appendChild(actionsDiv);
    }

    /**
     * Input form validation.
     */
    checkErrors() {
        let gotAnError = false;

        this.container.classList.remove('gm-gps-saved');

        for (const field of Object.keys(this.inputComponents)) {
            const component = this.inputComponents[field];
            if (!component.checkValidity()) {
                gotAnError = true;
                break;
            }
        }

        this.submitBtn.disabled = gotAnError;
    }

    /**
     * Set the value of the given form input.
     *
     * @param {string} field Field name to update.
     * @param {string} value Value to set.
     */
    setFieldValue(field, value) {
        value = Number(value);
        if (Number.isNaN(value) || !this.inputComponents[field]) {
            return;
        }

        this.inputComponents[field].setValue(value.toString(), true);
    }

    /**
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        if (this.submitBtn.disabled) {
            return;
        }

        const json = {channel: 'gps', messages: []};
        const info = this.getLocationInfo();

        for (const field of Object.keys(this.inputComponents)) {
            if (field in info) {
                json.messages.push('set ' + field + ' ' + info[field]);
            }
        }

        if (json.messages.length) {
            // make sure GPS is started
            json.messages.push('enable');
            this.instance.sendEvent(json);
            this.container.classList.add('gm-gps-saved');
        }
    }

    /**
     * Extract location info from inputs.
     *
     * @return {Object} Geolocation data.
     */
    getLocationInfo() {
        const info = {};

        for (const field of Object.keys(this.inputComponents)) {
            const component = this.inputComponents[field];
            if (!component) {
                continue;
            }

            const value = Number(component.getValue());
            if (!Number.isNaN(value)) {
                info[field] = value;
            }
        }

        return info;
    }

    /**
     * Get client geolocation.
     */
    async getLocation() {
        if (!navigator.geolocation) {
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            if (!position || !position.coords) {
                return;
            }

            Object.keys(this.inputComponents).forEach((field) => {
                if (position.coords[field]) {
                    this.setFieldValue(field, position.coords[field]);
                }
            });

            // Get altitude from elevation service if we don't have any
            if (
                !position.coords.altitude &&
                this.elevationService &&
                position.coords.latitude &&
                position.coords.longitude
            ) {
                const location = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                const results = await this.elevationService.getElevationForLocations({
                    locations: [location],
                });
                if (results.status === 'OK' && results[0]) {
                    this.setFieldValue('gm-gps-altitude', results[0].elevation);
                }
            }

            // Update map
            if (this.map) {
                this.clearMarkers();
                this.addMapMarker(position.coords.latitude, position.coords.longitude);
                this.map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
            }
        } catch (error) {
            console.error('Error getting location:', error);
        }
    }

    /**
     * Check if geolocation is available.
     * @returns {Promise<boolean>} True if geolocation is available.
     */
    async isMyLocAvailable() {
        if (navigator.geolocation) {
            try {
                await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                return true;
            } catch {
                return false;
            }
        }
        return false;
    }

    /**
     * Load map, if available.
     */
    loadMap() {
        // Get form info
        const info = this.getLocationInfo();

        // Render map
        if (typeof google !== 'undefined') {
            this.map = new google.maps.Map(this.mapview, {
                center: {
                    lat: info.latitude || this.mapLat,
                    lng: info.longitude || this.mapLng,
                },
                zoom: this.minimumZoomLevel,
            });

            // Add initial marker for selection from form
            this.addMapMarker(info.latitude || this.mapLat, info.longitude || this.mapLng);

            // Listen for new location
            this.map.addListener('click', (event) => {
                this.clearMarkers();
                // Add new marker / capture coords for click location
                this.addMapMarker(event.latLng.lat(), event.latLng.lng());
            });
        }
    }

    /**
     * Adds new marker at given coords.
     *
     * @param {number} lat Latitude of the marker.
     * @param {number} lng Longitude of the marker.
     */
    addMapMarker(lat, lng) {
        this.mapLat = lat;
        this.mapLng = lng;

        const marker = new google.maps.Marker({
            position: {
                lat: this.mapLat,
                lng: this.mapLng,
            },
            map: this.map,
        });
        this.markers.push(marker);

        // Center map and zoom on position when needed
        if (this.map && this.map.getZoom() < this.minimumZoomLevel) {
            this.map.setCenter(marker.getPosition());
            this.map.setZoom(this.minimumZoomLevel);
        }

        // Update form fields
        this.setFieldValue('gm-gps-latitude', lat);
        this.setFieldValue('gm-gps-longitude', lng);

        if (this.elevationService) {
            const location = new google.maps.LatLng(lat, lng);
            this.elevationService.getElevationForLocations(
                {
                    locations: [location],
                },
                (results, status) => {
                    if (status === 'OK' && results[0]) {
                        this.elevation = results[0].elevation;
                        this.setFieldValue('gm-gps-altitude', this.elevation);
                    }
                },
            );
        }
    }

    /**
     * Removes all existing markers from the map.
     */
    clearMarkers() {
        this.markers.forEach((marker) => {
            marker.setMap(null);
        });
        this.markers = [];
    }
};
