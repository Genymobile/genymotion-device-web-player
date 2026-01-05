
/*
 * Import main SCSS file for webpack to process and bundle styles
 * This ensures all styles are included in the final build
 */
import './scss/main.scss';

import DeviceRenderer from './DeviceRenderer';
import DeviceRendererFactory from './DeviceRendererFactory';
import CoordinateUtils from './plugins/CoordinateUtils';
import KeyboardEvents from './plugins/KeyboardEvents';
import MouseEvents from './plugins/MouseEvents';
import MediaManager from './plugins/MediaManager';
import GamepadManager from './plugins/GamepadManager';

const genyDeviceWebPlayer = {
    DeviceRenderer,
    DeviceRendererFactory,
    CoordinateUtils,
    KeyboardEvents,
    MouseEvents,
    MediaManager,
    GamepadManager,
};

export default genyDeviceWebPlayer;
