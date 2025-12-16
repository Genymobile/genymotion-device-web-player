import OverlayPlugin from './util/OverlayPlugin';
import '@/components/GmChip.js';
import '@/components/GmTextInput.js';
import '@/components/GmSlider';
import log from 'loglevel';

/* global google */

/**
 * Instance GPS plugin.
 * Provides GPS control.
 */
export default class GPS extends OverlayPlugin {
    static get name() {
        return 'GPS';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object}  instance     Associated instance.
     * @param {Object}  i18n         Translations keys for the UI.
     */
    constructor(instance, i18n) {
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

        this.inputComponents.speed = null;

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

        // Check if permission is already denied, in order to disable set position button
        this.checkLocationPermission();

        // Listen for gps events: "<altitude/latitude/longitude/accuracy/bearing/status/speed?> <value>"
        this.instance.registerEventCallback('gps', (message) => {
            const values = message.split(' ');
            if (Object.keys(this.inputComponents).includes(values[0]) && values.length >= 2) {
                this.setFieldValue(values[0], values[1]);
            }
            this.container.classList.add('gm-gps-saved');
            if (this.appliedTag) {
                this.appliedTag.visible = true;
            }
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
            height: 850,
        });

        this.container = container;

        // Maps
        this.mapview = document.createElement('div');
        this.mapview.className = 'gm-mapview';

        // set my positon button
        const setToMyPositionWrapper = document.createElement('div');
        setToMyPositionWrapper.className = 'gm-gps-setToMyPosition-wrapper';

        this.setToMyPositionBtn = document.createElement('button');
        this.setToMyPositionBtn.className = 'gm-btn gm-gps-setToMyPosition';
        this.setToMyPositionBtn.textContent = this.i18n.GPS_SET_TO_MY_POSITION || 'Set to my position';

        this.setToMyPositionBtn.onclick = this.getLocation.bind(this);

        setToMyPositionWrapper.appendChild(this.setToMyPositionBtn);

        this.container.appendChild(this.mapview);
        this.container.appendChild(setToMyPositionWrapper);
        const sep1 = document.createElement('div');
        sep1.className = 'gm-separator';
        this.container.appendChild(sep1);

        // Form
        const form = document.createElement('form');

        // Position Section
        const positionSection = document.createElement('div');
        positionSection.className = 'gm-section';

        // First line: Latitude & Longitude
        const positionFirstLine = document.createElement('div');
        positionFirstLine.className = 'gm-section-line gm-gps-section-line';

        // Latitude input
        const latitudeDiv = document.createElement('div');
        latitudeDiv.className = 'gm-input-wrap';
        const latitudeLabel = document.createElement('label');
        latitudeLabel.textContent = this.i18n.GPS_LATITUDE || 'Latitude';
        latitudeDiv.appendChild(latitudeLabel);

        this.inputComponents.latitude = document.createElement('gm-text-input');
        this.inputComponents.latitude.setAttribute('type', 'number');
        this.inputComponents.latitude.setAttribute('value', this.mapLat.toString());
        this.inputComponents.latitude.setAttribute('unit-text', 'o');
        this.inputComponents.latitude.setAttribute('min', '-90');
        this.inputComponents.latitude.setAttribute('max', '90');
        this.inputComponents.latitude.setAttribute('step', 'any');

        this.inputComponents.latitude.addEventListener('gm-text-input-change', () => {
            if (!this.inputComponents.latitude.checkValidity()) {
                this.inputComponents.latitude.setErrorMessage('Between -90 and 90');
            } else {
                this.inputComponents.latitude.setErrorMessage('');
            }
            this.checkErrors();
            this.clearMarkers();
            this.addMapMarker(this.inputComponents.latitude.value, this.inputComponents.longitude.value);
        });
        latitudeDiv.appendChild(this.inputComponents.latitude);

        // Longitude input
        const longitudeDiv = document.createElement('div');
        longitudeDiv.className = 'gm-input-wrap';
        const longitudeLabel = document.createElement('label');
        longitudeLabel.textContent = this.i18n.GPS_LONGITUDE || 'Longitude';
        longitudeDiv.appendChild(longitudeLabel);

        this.inputComponents.longitude = document.createElement('gm-text-input');
        this.inputComponents.longitude.setAttribute('type', 'number');
        this.inputComponents.longitude.setAttribute('value', this.mapLng.toString());
        this.inputComponents.longitude.setAttribute('unit-text', 'o');
        this.inputComponents.longitude.setAttribute('min', '-180');
        this.inputComponents.longitude.setAttribute('max', '180');
        this.inputComponents.longitude.setAttribute('step', 'any');

        this.inputComponents.longitude.addEventListener('gm-text-input-change', () => {
            if (!this.inputComponents.longitude.checkValidity()) {
                this.inputComponents.longitude.setErrorMessage('Between -180 and 180');
            } else {
                this.inputComponents.longitude.setErrorMessage('');
            }
            this.checkErrors();
            this.clearMarkers();
            this.addMapMarker(this.inputComponents.latitude.value, this.inputComponents.longitude.value);
        });
        longitudeDiv.appendChild(this.inputComponents.longitude);

        positionFirstLine.appendChild(latitudeDiv);
        positionFirstLine.appendChild(longitudeDiv);
        positionSection.appendChild(positionFirstLine);

        // Second line: Altitude & Accuracy
        const positionSecondLine = document.createElement('div');
        positionSecondLine.className = 'gm-section-line gm-gps-section-line';

        // Altitude input
        const altitudeDiv = document.createElement('div');
        altitudeDiv.className = 'gm-input-wrap';
        const altitudeLabel = document.createElement('label');
        altitudeLabel.textContent = this.i18n.GPS_ALTITUDE || 'Altitude';
        altitudeDiv.appendChild(altitudeLabel);

        this.inputComponents.altitude = document.createElement('gm-text-input');
        this.inputComponents.altitude.setAttribute('type', 'number');
        this.inputComponents.altitude.setAttribute('value', this.elevation.toString());
        this.inputComponents.altitude.setAttribute('unit-text', 'm');
        this.inputComponents.altitude.setAttribute('min', '-10000');
        this.inputComponents.altitude.setAttribute('max', '10000');
        this.inputComponents.altitude.setAttribute('step', 'any');

        this.inputComponents.altitude.addEventListener('gm-text-input-change', () => {
            if (!this.inputComponents.altitude.checkValidity()) {
                this.inputComponents.altitude.setErrorMessage('Between -10,000 and 10,000');
            } else {
                this.inputComponents.altitude.setErrorMessage('');
            }
            this.checkErrors();
        });
        altitudeDiv.appendChild(this.inputComponents.altitude);

        // Accuracy input
        const accuracyDiv = document.createElement('div');
        accuracyDiv.className = 'gm-input-wrap';
        const accuracyLabel = document.createElement('label');
        accuracyLabel.textContent = this.i18n.GPS_ACCURACY || 'Accuracy';
        accuracyDiv.appendChild(accuracyLabel);

        // Create a flex wrapper for accuracy input and slider
        const accuracyWrapper = document.createElement('div');
        accuracyWrapper.className = 'gm-gps-accuracy-input-wrapper';

        // Create the accuracy slider
        this.accuracySlider = document.createElement('gm-slider');
        this.accuracySlider.min = 0;
        this.accuracySlider.max = 200;
        this.accuracySlider.value = 0;
        this.accuracySlider.className = 'gm-gps-accuracy-slider';

        this.accuracySlider.addEventListener('gm-slider-change', (e) => {
            this.inputComponents.accuracy.value = e.detail.value;
            this.checkErrors();
        });

        this.accuracySlider.addEventListener('gm-slider-input', (e) => {
            this.inputComponents.accuracy.value = e.detail.value;
            this.checkErrors();
        });

        // Add the slider to the wrapper
        accuracyWrapper.appendChild(this.accuracySlider);

        this.inputComponents.accuracy = document.createElement('gm-text-input');
        this.inputComponents.accuracy.classList.add('gm-gps-accuracy-input');
        this.inputComponents.accuracy.setAttribute('type', 'number');
        this.inputComponents.accuracy.setAttribute('value', '0');
        this.inputComponents.accuracy.setAttribute('unit-text', 'm');
        this.inputComponents.accuracy.setAttribute('min', '0');
        this.inputComponents.accuracy.setAttribute('max', '200');
        this.inputComponents.accuracy.setAttribute('strict-range', '');

        this.inputComponents.accuracy.addEventListener('gm-text-input-change', (e) => {
            const value = parseFloat(e.detail.value) || 0;
            this.accuracySlider.value = value;
            this.checkErrors();
        });

        // Handle blur to reset empty value to 0
        this.inputComponents.accuracy.addEventListener('gm-text-input-blur', (e) => {
            if (e.detail.value === '') {
                this.inputComponents.accuracy.value = '0';
                this.accuracySlider.value = 0;
            }
        });

        // Add the input to the wrapper
        accuracyWrapper.appendChild(this.inputComponents.accuracy);

        // Add the wrapper to the accuracy div
        accuracyDiv.appendChild(accuracyWrapper);

        positionSecondLine.appendChild(altitudeDiv);
        positionSecondLine.appendChild(accuracyDiv);
        positionSection.appendChild(positionSecondLine);

        const positionThirdLine = document.createElement('div');
        positionThirdLine.className = 'gm-section-line gm-gps-section-line';

        // Speed input (optional)
        if (Object.keys(this.inputComponents).includes('speed')) {
            const speedDiv = document.createElement('div');
            speedDiv.className = 'gm-input-wrap';
            const speedLabel = document.createElement('label');
            speedLabel.textContent = this.i18n.GPS_SPEED || 'Speed';
            speedDiv.appendChild(speedLabel);

            this.inputComponents.speed = document.createElement('gm-text-input');
            this.inputComponents.speed.setAttribute('type', 'number');
            this.inputComponents.speed.setAttribute('value', '0');
            this.inputComponents.speed.setAttribute('unit-text', 'm/s');
            this.inputComponents.speed.setAttribute('min', '0');
            this.inputComponents.speed.setAttribute('max', '399.99');
            this.inputComponents.speed.setAttribute('step', '0.01');

            this.inputComponents.speed.addEventListener('gm-text-input-change', () => {
                if (!this.inputComponents.speed.checkValidity()) {
                    this.inputComponents.speed.setErrorMessage('Between 0 and 399.99');
                } else {
                    this.inputComponents.speed.setErrorMessage('');
                }
                this.checkErrors();
            });
            speedDiv.appendChild(this.inputComponents.speed);
            positionThirdLine.appendChild(speedDiv);
        }

        // Bearing input
        const bearingDiv = document.createElement('div');
        bearingDiv.className = 'gm-input-wrap';
        const bearingLabel = document.createElement('label');
        bearingLabel.textContent = this.i18n.GPS_BEARING || 'Bearing';
        bearingDiv.appendChild(bearingLabel);

        // Create a flex wrapper for bearing input and slider
        const bearingWrapper = document.createElement('div');
        bearingWrapper.className = 'gm-gps-bearing-input-wrapper';

        // Create the bearing slider
        this.bearingSlider = document.createElement('gm-slider');
        this.bearingSlider.min = 0;
        this.bearingSlider.max = 360;
        this.bearingSlider.value = 0;
        this.bearingSlider.className = 'gm-gps-bearing-slider';

        this.bearingSlider.addEventListener('gm-slider-change', (e) => {
            this.inputComponents.bearing.value = e.detail.value;
            this.checkErrors();
        });

        this.bearingSlider.addEventListener('gm-slider-input', (e) => {
            this.inputComponents.bearing.value = e.detail.value;
            this.checkErrors();
        });

        // Add the slider to the wrapper
        bearingWrapper.appendChild(this.bearingSlider);

        this.inputComponents.bearing = document.createElement('gm-text-input');
        this.inputComponents.bearing.classList.add('gm-gps-bearing-input');
        this.inputComponents.bearing.setAttribute('type', 'number');
        this.inputComponents.bearing.setAttribute('value', '0');
        this.inputComponents.bearing.setAttribute('unit-text', 'o');
        this.inputComponents.bearing.setAttribute('min', '0');
        this.inputComponents.bearing.setAttribute('max', '360');
        this.inputComponents.bearing.setAttribute('strict-range', '');

        this.inputComponents.bearing.addEventListener('gm-text-input-change', (e) => {
            const value = parseFloat(e.detail.value) || 0;
            this.bearingSlider.value = value;
            this.checkErrors();
        });

        // Handle blur to reset empty value to 0
        this.inputComponents.bearing.addEventListener('gm-text-input-blur', (e) => {
            if (e.detail.value === '') {
                this.inputComponents.bearing.value = '0';
                this.bearingSlider.value = 0;
            }
        });

        // Add the input to the wrapper
        bearingWrapper.appendChild(this.inputComponents.bearing);

        // Add the wrapper to the bearing div
        bearingDiv.appendChild(bearingWrapper);

        positionThirdLine.appendChild(bearingDiv);
        positionSection.appendChild(positionThirdLine);

        // Build form
        form.appendChild(positionSection);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'gm-actions';

        const appliedTag = document.createElement('gm-chip');
        appliedTag.visible = false;
        this.appliedTag = appliedTag;
        actionsDiv.appendChild(appliedTag);

        // Submit button
        this.submitBtn = document.createElement('button');
        this.submitBtn.innerHTML = this.i18n.GPS_APPLY || 'Apply';
        this.submitBtn.className = 'gm-btn gm-gps-update';
        this.submitBtn.onclick = this.sendDataToInstance.bind(this);
        this.submitBtn.disabled = true;
        actionsDiv.appendChild(this.submitBtn);

        // Build final layout
        this.container.appendChild(form);
        const sep2 = document.createElement('div');
        sep2.className = 'gm-separator';
        this.container.appendChild(sep2);
        this.container.appendChild(actionsDiv);
    }

    /**
     * Input form validation.
     */
    checkErrors() {
        if (this.appliedTag) {
            this.appliedTag.visible = false;
        }

        const gotAnError = Object.keys(this.inputComponents).some(
            (field) => !this.inputComponents[field].checkValidity(),
        );

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

        this.inputComponents[field].value = value.toString();

        if (field === 'accuracy' && this.accuracySlider) {
            this.accuracySlider.value = value;
        }
        if (field === 'bearing' && this.bearingSlider) {
            this.bearingSlider.value = value;
        }
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
            this.appliedTag.visible = true;
        }
    }

    /**
     * Check Location browser permissions
     */
    async checkLocationPermission() {
        try {
            this.permissionStatus = await navigator.permissions.query({name: 'geolocation'});
            if (this.permissionStatus.state === 'denied') {
                this.setToMyPositionBtn.disabled = true;
            } else {
                this.setToMyPositionBtn.disabled = false;
            }

            /*
             * this is bugged in Firefox, change is never triggered,
             * so in ff button will never be enabled after permission was denied and an error.code === 1 is thrown
             */
            this.instance.addListener(this.permissionStatus, 'change', () => {
                if (this.permissionStatus.state === 'granted') {
                    this.setToMyPositionBtn.disabled = false;
                } else {
                    this.setToMyPositionBtn.disabled = true;
                }
            });
        } catch (error) {
            log.error('Error while asking permission: ', error);
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

            const value = Number(component.value);
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

        // Ask for geolocation permission
        if (!this.permissionStatus) {
            await this.checkLocationPermission();
        }

        try {
            this.setToMyPositionBtn.classList.add('gm-gps-setToMyPosition-loading');
            this.setToMyPositionBtn.disabled = true;
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            this.setToMyPositionBtn.classList.remove('gm-gps-setToMyPosition-loading');
            this.setToMyPositionBtn.disabled = false;

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
                    this.setFieldValue('altitude', results[0].elevation);
                }
            }

            // Update map
            if (this.map) {
                this.clearMarkers();
                this.addMapMarker(position.coords.latitude, position.coords.longitude, true);
                this.map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
            }
        } catch (error) {
            // if permission was denied, disable the button
            if (error.code === 1) {
                this.setToMyPositionBtn.disabled = true;
                this.setToMyPositionBtn.classList.remove('gm-gps-setToMyPosition-loading');
            }
            log.error('Error getting location:', error);
        }
    }

    /**
     * Load map, if available.
     */
    loadMap() {
        // Get form info
        const info = this.getLocationInfo();

        // Render map
        if (typeof google === 'undefined') {
            this.mapview.classList.add('gmaps-disabled');
            this.mapview.innerHTML = 'Enable Google Maps with a valid API key to view the map.';
        }
        if (typeof google !== 'undefined') {
            this.map = new google.maps.Map(this.mapview, {
                center: {
                    lat: info.latitude,
                    lng: info.longitude,
                },
                zoom: this.minimumZoomLevel,
                streetViewControl: false,
                mapTypeControl: false,
            });

            // Add initial marker for selection from form
            this.addMapMarker(info.latitude, info.longitude);

            // Listen for new location
            this.map.addListener('click', (event) => {
                this.clearMarkers();
                // Add new marker / capture coords for click location
                this.addMapMarker(event.latLng.lat(), event.latLng.lng(), true);
            });
        }
    }

    /**
     * Adds new marker at given coords.
     *
     * @param {number} lat Latitude of the marker.
     * @param {number} lng Longitude of the marker.
     * @param {boolean} setAltitudeAuto Retrieve and set altitude from gmaps.
     */
    addMapMarker(lat, lng, setAltitudeAuto = false) {
        if (typeof google === 'undefined') {
            return;
        }

        // Convert values to numbers once
        const numLat = Number(lat);
        const numLng = Number(lng);
        const currentNumLat = Number(this.inputComponents.latitude.value);
        const currentNumLng = Number(this.inputComponents.longitude.value);

        const marker = new google.maps.Marker({
            position: {
                lat: numLat,
                lng: numLng,
            },
            map: this.map,
        });
        this.markers.push(marker);

        // Update form fields only if the value changed
        if (currentNumLat !== numLat) {
            this.setFieldValue('latitude', numLat);
        }
        if (currentNumLng !== numLng) {
            this.setFieldValue('longitude', numLng);
        }

        // Get elevation if service is available
        if (this.elevationService && setAltitudeAuto) {
            const location = new google.maps.LatLng(numLat, numLng);
            this.elevationService.getElevationForLocations(
                {
                    locations: [location],
                },
                (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const currentAltitude = Number(this.inputComponents.altitude.value);
                        const newElevation = Number(results[0].elevation);
                        if (currentAltitude !== newElevation) {
                            this.setFieldValue('altitude', newElevation);
                        }
                    }
                },
            );
        }

        // Center map on the new marker and zoom if needed
        if (this.map) {
            const currentZoom = this.map.getZoom();
            this.map.setCenter(marker.getPosition()); // Always center on the marker
            if (currentZoom < this.minimumZoomLevel) {
                this.map.setZoom(this.minimumZoomLevel);
            }
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
}
