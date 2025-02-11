'use strict';

const META_KEYCODE = '0x01000022';
const ENTER_KEYCODE = '0x01000005';
const VOLUME_DOWN_KEYCODE = '0x01000070';
const VOLUME_UP_KEYCODE = '0x01000072';
const RECENT_APP_KEYCODE = '0x010000be';
const HOMEPAGE_KEYCODE = '0x01000090';
const BACK_KEYCODE = '0x01000061';
const POWER_KEYCODE = '0x0100010b';
const ROTATE_KEYCODE = 'gm-rotation';

/**
 * Instance physical buttons plugin.
 * Provides physical buttons (power, volume, ...) control.
 */
module.exports = class ButtonsEvents {
    static get name() {
        return 'ButtonsEvents';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object} instance         Associated instance.
     * @param {Object} i18n             Translations keys for the UI.
     */
    constructor(instance, i18n) {
        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};

        // Register plugin
        this.instance.buttonsEvents = this;

        if (this.instance.options.rotation) {
            this.registerToolbarButton('ROTATE', ROTATE_KEYCODE, 'gm-rotation', i18n.BUTTONS_ROTATE || 'Rotate', false);
        }

        if (this.instance.options.volume) {
            this.registerToolbarButton(
                'VOLUME_DOWN',
                VOLUME_DOWN_KEYCODE,
                'gm-sound-down',
                i18n.BUTTONS_SOUND_DOWN || 'Sound down',
                false,
            );
            this.registerToolbarButton(
                'VOLUME_UP',
                VOLUME_UP_KEYCODE,
                'gm-sound-up',
                i18n.BUTTONS_SOUND_UP || 'Sound up',
                false,
            );
        }

        if (this.instance.options.navbar) {
            this.registerToolbarButton(
                'RECENT_APP',
                RECENT_APP_KEYCODE,
                'gm-recent',
                i18n.BUTTONS_RECENT_APPS || 'Recent applications',
                true,
            );
            this.registerToolbarButton('HOMEPAGE', HOMEPAGE_KEYCODE, 'gm-home', i18n.BUTTONS_HOME || 'Home', true);
            this.registerToolbarButton('BACK', BACK_KEYCODE, 'gm-back', i18n.BUTTONS_BACK || 'Back', true);
        }

        if (this.instance.options.power) {
            this.registerToolbarButton('POWER', POWER_KEYCODE, 'gm-power', i18n.BUTTONS_POWER || 'Power', true);
        }
    }

    /**
     * Called on keyboard keypress event.
     * Relay keypress event to the instance.
     *
     * @param {string} key  Pressed key unicode reference number.
     * @param {string} text Pressed key character.
     */
    keyPressEvent(key, text) {
        const json = {type: 'KEYBOARD_PRESS', keychar: text, keycode: key};
        this.instance.sendEvent(json);
    }

    /**
     * Called on keyboard keyrelease event.
     * Relay keyrelease event to the instance.
     *
     * @param {string} key  Released key unicode reference number.
     * @param {string} text Released key character.
     */
    keyReleaseEvent(key, text) {
        const json = {type: 'KEYBOARD_RELEASE', keychar: text, keycode: key};
        this.instance.sendEvent(json);
    }

    /**
     * Called on mouse down event.
     * Relay event to the instance.
     *
     * @param {Event} event Associated JS event
     */
    mouseButtonPressEvent(event) {
        const {androidkeycode: id} = event.target.dataset;
        if (!id) {
            return;
        }

        if (id === HOMEPAGE_KEYCODE) {
            /**
             * Translate homepage into meta + enter
             * Note we could send the homepage keycode directly, see https://source.android.com/docs/core/interaction/input/keyboard-devices#hid-keyboard-and-keypad-page-0x07
             * but geny's webrtcd doesn't know how to map it yet.
             */
            this.keyPressEvent(parseInt(META_KEYCODE), '');
            this.keyPressEvent(parseInt(ENTER_KEYCODE), '');
        } else if (id.substring(0, 2) === '0x') {
            // else if it is a raw key we send it
            const key = parseInt(id, 16);
            this.keyPressEvent(key, '0\n');
        }
    }

    /**
     * Called on mouse up event.
     * Relay event to the instance.
     *
     * @param {Event} event Associated JS event
     */
    mouseButtonReleaseEvent(event) {
        const {androidkeycode: id} = event.target.dataset;
        if (!id) {
            return;
        }

        if (id === HOMEPAGE_KEYCODE) {
            // Translate homepage into meta + enter
            this.keyReleaseEvent(parseInt(ENTER_KEYCODE), '');
            this.keyReleaseEvent(parseInt(META_KEYCODE), '');
        } else if (id === ROTATE_KEYCODE) {
            // rotate is a custom command
            const json = {type: 'ROTATE'};
            this.instance.sendEvent(json);
        } else if (id.substring(0, 2) === '0x') {
            // else if it is a raw key we send it
            const key = parseInt(id, 16);
            this.keyReleaseEvent(key, '0\n');
        }
    }

    /**
     * Disable instance rotation.
     */
    disableRotation() {
        this.instance.toolbarManager.disableButton(this.constructor.name + '_' + ROTATE_KEYCODE);
    }

    /**
     * Enable instance rotation.
     */
    enableRotation() {
        this.instance.toolbarManager.enableButton(this.constructor.name + '_' + ROTATE_KEYCODE);
    }

    /**
     * Add a device button to the renderer toolbar.
     *
     * @param {string}  ID             Button ID.
     * @param {string}  androidKeycode Button keycode.
     * @param {string}  htmlClass      Button CSS class.
     * @param {string}  htmlTitle      Button title.
     */
    registerToolbarButton(ID, androidKeycode, htmlClass, htmlTitle) {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name + '_' + ID,
            iconClass: htmlClass,
            title: htmlTitle,
            dataAttributes: {
                androidKeycode,
            },
            onMousedown: this.mouseButtonPressEvent.bind(this),
            onMouseup: this.mouseButtonReleaseEvent.bind(this),
        });
    }
};
