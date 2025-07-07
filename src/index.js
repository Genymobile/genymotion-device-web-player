'use strict';

/*
 * Import main SCSS file for webpack to process and bundle styles
 * This ensures all styles are included in the final build
 */
require('./scss/main.scss');

const DeviceRenderer = require('./DeviceRenderer');
const DeviceRendererFactory = require('./DeviceRendererFactory');
const CoordinateUtils = require('./plugins/CoordinateUtils');
const KeyboardEvents = require('./plugins/KeyboardEvents');
const MouseEvents = require('./plugins/MouseEvents');
const MediaManager = require('./plugins/MediaManager');
const GamepadManager = require('./plugins/GamepadManager');

const genyDeviceWebPlayer = {
    DeviceRenderer,
    DeviceRendererFactory,
    CoordinateUtils,
    KeyboardEvents,
    MouseEvents,
    MediaManager,
    GamepadManager,
};

module.exports = genyDeviceWebPlayer;
