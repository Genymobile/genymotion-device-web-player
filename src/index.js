'use strict';

const DeviceRenderer = require('./DeviceRenderer');
const DeviceRendererFactory = require('./DeviceRendererFactory');
const CoordinateUtils = require('./plugins/CoordinateUtils');
const KeyboardEvents = require('./plugins/KeyboardEvents');
const MouseEvents = require('./plugins/MouseEvents');
const MediaManager = require('./plugins/MediaManager');
const GamepadManager = require('./plugins/GamepadManager');

module.exports = {
    DeviceRenderer,
    DeviceRendererFactory,
    CoordinateUtils,
    KeyboardEvents,
    MouseEvents,
    MediaManager,
    GamepadManager
};
