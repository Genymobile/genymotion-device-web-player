'use strict';

const DeviceRenderer = require('./DeviceRenderer');
const DeviceRendererFactory = require('./DeviceRendererFactory');
const CoordinateUtils = require('./plugins/CoordinateUtils');
const KeyboardEvents = require('./plugins/KeyboardEvents');
const MouseEvents = require('./plugins/MouseEvents');

module.exports = {DeviceRenderer, DeviceRendererFactory, CoordinateUtils, KeyboardEvents, MouseEvents};
