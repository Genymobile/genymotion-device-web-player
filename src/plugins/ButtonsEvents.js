'use strict';

const META_KEYCODE = '0x01000022';
const ENTER_KEYCODE = '0x01000005';
const VOLUME_DOWN_KEYCODE = '0x01000070';
const VOLUME_UP_KEYCODE = '0x01000072';
const RECENT_APP_KEYCODE = '0x010000be';
const HOME_KEYCODE = '0x01000010';
const BACK_KEYCODE = '0x01000061';
const POWER_KEYCODE = '0x0100010b';
const ROTATE_KEYCODE = 'gm-rotation';

/**
 * Instance physical buttons plugin.
 * Provides physical buttons (power, volume, ...) control.
 */
module.exports = class ButtonsEvents {
    /**
     * Plugin initialization.
     *
     * @param {Object} instance         Associated instance.
     * @param {Object} i18n             Translations keys for the UI.
     * @param {Object} translateHomeKey Translate HOME key press for the instance.
     */
    constructor(instance, i18n, translateHomeKey) {
        // Reference instance
        this.instance = instance;
        this.translateHomeKey = translateHomeKey;

        // Register plugin
        this.instance.buttonsEvents = this;

        if (this.instance.options.rotation) {
            this.renderToolbarButton(ROTATE_KEYCODE, 'gm-rotate', i18n.BUTTONS_ROTATE || 'Rotate', false);
        }

        if (this.instance.options.volume) {
            this.renderToolbarButton(
                VOLUME_DOWN_KEYCODE, 'gm-sound-down', i18n.BUTTONS_SOUND_DOWN || 'Sound down', false
            );
            this.renderToolbarButton(VOLUME_UP_KEYCODE, 'gm-sound-up', i18n.BUTTONS_SOUND_UP || 'Sound up', false);
        }

        if (this.instance.options.navbar) {
            this.renderToolbarButton(
                RECENT_APP_KEYCODE, 'gm-recent', i18n.BUTTONS_RECENT_APPS || 'Recent applications', true
            );
            this.renderToolbarButton(HOME_KEYCODE, 'gm-home', i18n.BUTTONS_HOME || 'Home', true);
            this.renderToolbarButton(BACK_KEYCODE, 'gm-back', i18n.BUTTONS_BACK || 'Back', true);
        }

        if (this.instance.options.power) {
            this.renderToolbarButton(POWER_KEYCODE, 'gm-power', i18n.BUTTONS_POWER || 'Power', true);
        }

        const buttons = document.getElementsByClassName('gm-icon-button');
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            button.onmousedown = this.mouseButtonPressEvent.bind(this);
            button.onmouseup = this.mouseButtonReleaseEvent.bind(this);
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
        const id = event.target.classList[1];
        if (!id) {
            return;
        }

        if (id === HOME_KEYCODE && this.translateHomeKey) { // home is meta + enter
            this.keyPressEvent(parseInt(META_KEYCODE), '');
            this.keyPressEvent(parseInt(ENTER_KEYCODE), '');
        } else if (id.substring(0, 2) === '0x') { // else if it is a raw key we send it
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
        const id = event.target.classList[1];
        if (!id) {
            return;
        }

        if (id === HOME_KEYCODE && this.translateHomeKey) { // "home" is "meta + enter" on PaaS, "move_home" on SaaS
            this.keyReleaseEvent(parseInt(ENTER_KEYCODE), '');
            this.keyReleaseEvent(parseInt(META_KEYCODE), '');
        } else if (id === ROTATE_KEYCODE) { // rotate is a custom command
            const json = {type: 'ROTATE'};
            this.instance.sendEvent(json);
        } else if (id.substring(0, 2) === '0x') { // else if it is a raw key we send it
            const key = parseInt(id, 16);
            this.keyReleaseEvent(key, '0\n');
        }
    }

    /**
     * Retrieve a button from its class name.
     *
     * @param  {string} className Button class name.
     * @return {Object}           Button state.
     */
    getButtonState(className) {
        const image = this.instance.getChildByClass(this.instance.root, className);
        const button = image.parentNode;

        return {
            image: {
                className: image.className,
            },
            button: {
                className: button.className,
                onclick: button.onclick,
            }
        };
    }

    /**
     * Retrieve a button state identified by its class name.
     *
     * @param {string} className Button class name.
     * @param {Object} state     Button state
     */
    setButtonState(className, state) {
        const image = this.instance.getChildByClass(this.instance.root, className);
        const button = image.parentNode;

        image.className = state.image.className;
        button.className = state.button.className;
        button.onclick = state.button.onclick;
    }

    /**
     * Disable instance rotation.
     */
    disableRotation() {
        if (!this.instance.getChildByClass(this.instance.root, 'gm-rotate')) {
            return; // if we don't have rotation, we can't disable it
        }

        if (!this.savedRotationState) {
            this.savedRotationState = this.getButtonState('gm-rotate');
        }

        const rotationImage = this.instance.getChildByClass(this.instance.root, 'gm-rotate');
        const rotationButton = rotationImage.parentNode;
        rotationButton.className += ' gm-disabled-widget-pop-up';
        rotationImage.className += ' gm-disabled-widget-icon';
        rotationButton.onclick = null;
    }

    /**
     * Enable instance rotation.
     */
    enableRotation() {
        if (!this.instance.getChildByClass(this.instance.root, 'gm-rotate')) {
            return; // if we don't have rotation, we can't disable it
        }

        if (this.savedRotationState) {
            this.setButtonState('gm-rotate', this.savedRotationState);
            this.savedRotationState = null;
        }
    }

    /**
     * Add a device button to the renderer toolbar.
     *
     * @param {string}  androidKeycode Button keycode.
     * @param {string}  htmlClass      Button CSS class.
     * @param {string}  htmlTitle      Button title.
     * @param {boolean} append         Set to true to insert the button at the end.
     */
    renderToolbarButton(androidKeycode, htmlClass, htmlTitle, append) {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        const button = document.createElement('li');
        const image = document.createElement('div');
        image.classList.add('gm-icon-button');
        image.classList.add(androidKeycode);
        image.classList.add(htmlClass);
        image.title = htmlTitle;
        button.appendChild(image);
        if (append) {
            toolbar.appendChild(button);
        } else {
            toolbar.insertBefore(button, toolbar.firstChild);
        }
    }
};
