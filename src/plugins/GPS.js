'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

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

        // Location fields
        this.fields = ['altitude', 'longitude', 'latitude', 'accuracy', 'bearing'];
        if (speedSupport) {
            this.fields.push('speed');
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
        this.renderGPSForm();
        this.renderMapView();

        // Listen for gps events: "<altitude/latitude/longitude/accuracy/bearing/status/speed?> <value>"
        this.instance.registerEventCallback('gps', (message) => {
            const values = message.split(' ');
            if (this.fields.includes(values[0]) && values.length >= 2) {
                this.setFieldValue('gm-gps-' + values[0], values[1]);
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
            onClick: this.toggleForm.bind(this),
        });
    }

    /**
     * Render the widget: map view.
     */
    renderMapView() {
        // Create elements
        this.mapWidget = document.createElement('div');
        this.mapview = document.createElement('div');

        // Add capture button
        const capture = document.createElement('button');
        capture.innerHTML = this.i18n.GPS_CAPTURE || 'Capture';
        capture.className = 'gm-gps-mapview-capture';
        capture.onclick = this.onMapClicked.bind(this);

        // Add cancel button
        const cancel = document.createElement('button');
        cancel.innerHTML = this.i18n.GPS_CANCEL || 'Cancel';
        cancel.className = 'gm-gps-mapview-cancel';
        cancel.onclick = this.onHideMapButtonClicked.bind(this);

        // Setup
        this.mapview.className = 'gm-mapview';
        this.mapWidget.className = 'gm-overlay gm-gps-mapview gm-hidden';
        this.mapWidget.appendChild(this.mapview);
        this.mapWidget.appendChild(capture);
        this.mapWidget.appendChild(cancel);

        // Render into document
        this.instance.root.appendChild(this.mapWidget);
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
                    lat: info.latitude,
                    lng: info.longitude,
                },
                zoom: this.minimumZoomLevel,
            });

            // Add initial marker for selection from form
            this.addMapMarker(info.latitude, info.longitude);

            // Listen for new location
            this.map.addListener('click', (event) => {
                this.clearMarkers();
                // Add new marker / capture coords for click location
                this.addMapMarker(event.latLng.lat(), event.latLng.lng());
            });
        }
    }

    /**
     * Display or hide the map view.
     */
    toggleMapview() {
        this.mapWidget.classList.toggle('gm-hidden');
    }

    /**
     * Create a form field element.
     *
     * @param  {string}      name  Input name.
     * @param  {string}      label Input label.
     * @param  {string}      value Input value.
     * @param  {string}      min   Input min attribute.
     * @param  {string}      max   Input max attribute.
     * @return {HTMLElement}       The created input.
     */
    generateInput(name, label, value, min, max) {
        const inputWrap = document.createElement('div');

        const lab = document.createElement('label');
        lab.innerHTML = label;
        inputWrap.appendChild(lab);

        const input = document.createElement('input');
        input.type = 'number';
        input.defaultValue = value;
        input.min = min;
        input.max = max;
        input.className = 'gm-gps-' + name;
        input.step = 'any';
        this.instance.addListener(input, 'keyup', this.checkErrors.bind(this));
        inputWrap.appendChild(input);

        return inputWrap;
    }

    /**
     * Input form validation.
     */
    checkErrors() {
        let gotAnError = false;
        this.fields.forEach((field) => {
            const input = this.instance.getChildByClass(this.instance.root, 'gm-gps-' + field);
            if (input.checkValidity() === false) {
                input.classList.add('gm-error');
                gotAnError = true;
            } else {
                input.classList.remove('gm-error');
            }
        });

        this.instance.getChildByClass(this.instance.root, 'gm-gps-submit').disabled = gotAnError;
    }

    /**
     * Render the widget: controls view.
     */
    renderGPSForm() {
        // Create elements
        this.widget = document.createElement('div');
        this.form = document.createElement('form');
        const formWrap = document.createElement('div');

        // Generate title
        const title = document.createElement('div');
        title.className = 'gm-title';
        title.innerHTML = this.i18n.GPS_TITLE || 'GPS';
        this.form.appendChild(title);

        // Generate form inputs
        const inputs = document.createElement('div');
        inputs.className = 'gm-col';

        const latitudeLabel = this.i18n.GPS_LATITUDE || 'Latitude (°)';
        inputs.appendChild(this.generateInput('latitude', latitudeLabel, this.mapLat, -90.0, 90.0));

        const longitudeLabel = this.i18n.GPS_LONGITUDE || 'Longitude (°)';
        inputs.appendChild(this.generateInput('longitude', longitudeLabel, this.mapLng, -180.0, 180.0));

        const altitudeLabel = this.i18n.GPS_ALTITUDE || 'Altitude (m)';
        inputs.appendChild(this.generateInput('altitude', altitudeLabel, this.elevation, -10000, 10000));

        const accuracyLabel = this.i18n.GPS_ACCURACY || 'Accuracy (m)';
        inputs.appendChild(this.generateInput('accuracy', accuracyLabel, 0, 0, 200));

        const bearingLabel = this.i18n.GPS_BEARING || 'Bearing (°)';
        inputs.appendChild(this.generateInput('bearing', bearingLabel, 0, 0, 360));

        if (this.fields.includes('speed')) {
            const speedLabel = this.i18n.GPS_SPEED || 'Speed (m/s)';
            inputs.appendChild(this.generateInput('speed', speedLabel, 0, 0, 399.99));
        }

        // Generate right side of form
        const right = document.createElement('div');
        const rightMapWrap = document.createElement('div');
        const map = document.createElement('button');
        this.rightGeolocWrap = document.createElement('div');
        this.geolocBtn = document.createElement('button');

        right.className = 'gm-col';
        rightMapWrap.className = 'map-wrap';

        map.className = 'map';
        map.innerHTML = this.i18n.GPS_MAP || 'MAP';
        map.onclick = this.onOpenMapButtonClicked.bind(this);

        if (!this.elevationService) {
            map.disabled = true;
        }

        this.rightGeolocWrap.className = 'gm-geoloc-wrap';
        this.geolocBtn.className = 'gm-gps-geoloc';
        this.geolocBtn.innerHTML = this.i18n.GPS_GEOLOC || 'My position';
        this.geolocBtn.onclick = this.onGeolocButtonClicked.bind(this);

        rightMapWrap.appendChild(map);
        this.rightGeolocWrap.appendChild(this.geolocBtn);
        right.appendChild(rightMapWrap);
        right.appendChild(this.rightGeolocWrap);

        // Build form
        formWrap.className = 'gm-wrap';
        formWrap.appendChild(inputs);
        formWrap.appendChild(right);
        this.form.appendChild(formWrap);

        // Attach submit button
        const button = document.createElement('button');
        button.innerHTML = this.i18n.GPS_SUBMIT || 'Submit';
        button.className = 'gm-gps-submit';
        button.onclick = this.sendDataToInstance.bind(this);
        this.form.appendChild(button);

        // Setup
        this.widget.className = 'gm-overlay gm-gps-controls gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.className = 'gm-close-btn';
        close.onclick = this.toggleForm.bind(this);

        this.widget.appendChild(close);
        this.widget.appendChild(this.form);

        // Render into document
        this.instance.root.appendChild(this.widget);
    }

    /**
     * Display or hide the controls view.
     */
    toggleForm() {
        this.toggleWidget();
        this.checkForGeolocation();

        // TODO refacto this with 2 different overlay (gps and map)
        this.mapWidget.classList.add('gm-hidden');
    }

    /**
     * Set geolocation button availability.
     *
     * @param {boolean} enabled Geolocation availability.
     */
    setGeolocButtonAvailability(enabled) {
        this.geolocBtn.disabled = !enabled;
        if (enabled) {
            this.rightGeolocWrap.title = this.i18n.GPS_GEOLOC_TOOLTIP || 'Get my position from browser location';
        } else {
            this.rightGeolocWrap.title = this.i18n.GPS_NOGEOLOC_TOOLTIP || 'Geolocation not supported';
        }
    }

    /**
     * Open map view clicked.
     *
     * @param {Event} event Event.
     */
    onOpenMapButtonClicked(event) {
        event.preventDefault();
        this.toggleMapview();
        this.loadMap();
    }

    /**
     * Geolocation button clicked.
     *
     * @param {Event} event Event.
     */
    onGeolocButtonClicked(event) {
        event.preventDefault();
        this.getLocation();
    }

    /**
     * Map view clicked.
     *
     * @param {Event} event Event.
     */
    onMapClicked(event) {
        event.preventDefault();

        // Update fields
        this.setFieldValue('gm-gps-latitude', this.mapLat);
        this.setFieldValue('gm-gps-longitude', this.mapLng);
        this.setFieldValue('gm-gps-altitude', this.elevation);

        // Hide mapview
        this.toggleMapview();
    }

    /**
     * Hide map view button clicked.
     *
     * @param {Event} event Event.
     */
    onHideMapButtonClicked(event) {
        event.preventDefault();

        this.mapWidget.classList.add('gm-hidden');
    }

    /**
     * Send information to instance.
     *
     * @param {Event} event Event.
     */
    sendDataToInstance(event) {
        event.preventDefault();

        const json = this.buildEventJson();
        if (json.messages.length) {
            this.instance.sendEvent(json);
        }

        this.toggleForm();
    }

    /**
     * Get client geolocation.
     */
    getLocation() {
        if (!navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition((position) => {
            if (!position || !position.coords) {
                return;
            }

            this.fields.forEach((field) => {
                if (position.coords[field]) {
                    this.setFieldValue('gm-gps-' + field, position.coords[field]);
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
                this.elevationService.getElevationForLocations(
                    {
                        locations: [location],
                    },
                    (results, status) => {
                        if (status === 'OK') {
                            // Retrieve the first result
                            if (results[0]) {
                                this.setFieldValue('gm-gps-altitude', results[0].elevation);
                            }
                        }
                    },
                );
            }
        });
    }

    /**
     * Check browser geolocation capability and update UI accordingly.
     */
    checkForGeolocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => {
                    this.setGeolocButtonAvailability(true);
                },
                () => {
                    this.setGeolocButtonAvailability(false);
                },
            );
        } else {
            this.setGeolocButtonAvailability(false);
        }
    }

    /**
     * Set the value of the given form input according.
     *
     * @param {HTMLElement} field Form input to update.
     * @param {string}      value Value to set.
     */
    setFieldValue(field, value) {
        value = Number(value);
        if (Number.isNaN(value)) {
            return;
        }

        const inputField = this.instance.getChildByClass(this.instance.root, field);
        if (!inputField) {
            return;
        }

        if (inputField.max) {
            value = Math.min(value, inputField.max);
        }
        if (inputField.min) {
            value = Math.max(value, inputField.min);
        }

        inputField.value = value;
    }

    /**
     * Extract location info from inputs.
     *
     * @return {Object} Geolocation data.
     */
    getLocationInfo() {
        const info = {};
        this.fields.forEach((fieldName) => {
            const field = this.instance.getChildByClass(this.instance.root, 'gm-gps-' + fieldName);
            if (!field) {
                log.debug(fieldName + ' field not found.');
                return;
            }
            let value = Number(field.value);
            if (Number.isNaN(value)) {
                return;
            }

            if (field.max) {
                value = Math.min(value, field.max);
            }
            if (field.min) {
                value = Math.max(value, field.min);
            }

            info[fieldName] = value;
        });
        return info;
    }

    /**
     * Format GPS event to be send to the instance.
     *
     * @return {Object} GPS event.
     */
    buildEventJson() {
        const event = {channel: 'gps', messages: []};
        const info = this.getLocationInfo();
        this.fields.forEach((field) => {
            event.messages.push('set ' + field + ' ' + info[field]);
        });

        if (event.messages.length) {
            // make sure GPS is started
            event.messages.push('enable');
        }
        return event;
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

        if (this.elevationService) {
            const location = new google.maps.LatLng(lat, lng);
            this.elevationService.getElevationForLocations(
                {
                    locations: [location],
                },
                (results, status) => {
                    if (status === 'OK') {
                        // Retrieve the first result
                        if (results[0]) {
                            this.elevation = results[0].elevation;
                        }
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
