import './scss/main.scss';
import { GmSwitch } from './components/GmSwitch';
import { GmSlider } from './components/GmSlider';
import { GmTextInput } from './components/GmTextInput';
import { GmDropdown } from './components/GmDropdown';
import { GmChip } from './components/GmChip';
import { GmProgress } from './components/GmProgress';

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

