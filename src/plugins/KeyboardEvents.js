'use strict';

/**
 * List of invisible key that can be pressed.
 * For values, see http://doc.qt.io/qt-4.8/qt.html & https://github.com/ccampbell/mousetrap/blob/master/mousetrap.js
 */
const INVISIBLE_KEYS = {
    8: '0x01000003', // backspace
    9: '0x01000001', // tab
    13: '0x01000005', // enter
    16: '0x01000020', // shift
    17: '0x01000021', // ctrl
    18: '0x01000023', // alt
    20: '0x01000024', // capslock
    27: '0x01000000', // escape
    32: '0x20', // space
    33: '0x01000016', // pageup
    34: '0x01000017', // pagedown
    35: '0x01000011', // end
    36: '0x01000010', // home
    37: '0x01000012', // left
    38: '0x01000013', // up
    39: '0x01000014', // right
    40: '0x01000015', // down
    45: '0x01000006', // ins
    46: '0x01000007', // del
    /**
     * Do not propagate Meta to Android. It disables copy/cut/paste special keys when pressed
     *    91: '0x01000022', // meta
     *    93: '0x01000022', // meta
     *    224: '0x01000022', // meta
     */
};

const CTRL_SHORTCUT_KEYS = {
    67: '0x010000cf', // Copy
    86: '0x010000e2', // Paste
    88: '0x010000d0', // Cut
};

/**
 * Instance keyboard plugin.
 * Translate and forward keyboard events to instance.
 */
module.exports = class KeyboardEvents {
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     */
    constructor(instance) {
        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.keyboardEvents = this;
        this.instance.keyboardEventsEnabled = true;

        this.transmitKeys = true;
        this.isListenerAdded = false;
        this.currentlyPressedKeys = new Map();

        // Listen for keyboard disable
        this.instance.registerEventCallback('keyboard-disable', () => {
            this.transmitKeys = false;
        });

        // Listen for keyboard enable
        this.instance.registerEventCallback('keyboard-enable', () => {
            this.transmitKeys = true;
        });
    }

    /**
     * Cancel all pressed keys.
     * This is mainly used to avoid continuously pressed keys because of alt+tab
     * or any other command that remove focus (blur) the page.
     */
    cancelAllPressedKeys() {
        this.currentlyPressedKeys.forEach((value) => {
            const text = '';
            const json = {
                type: 'KEYBOARD_RELEASE',
                keychar: text,
                keycode: value,
            };
            this.instance.sendEvent(json);
        });
        this.currentlyPressedKeys.clear();
    }

    /**
     * Called when the user press a writable key (A-Z + 0-9 + symbols), send event to instance.
     *
     * @param {Event} event Event.
     */
    onKeyPress(event) {
        if (!this.transmitKeys) {
            return;
        }
        const key = event.charCode;
        let text = event.key || String.fromCharCode(key);
        if (text === 'Spacebar') {
            text = ' ';
        }
        let json = {
            type: 'KEYBOARD_PRESS',
            keychar: text,
            keycode: key,
        };
        this.instance.sendEvent(json);
        json = {
            type: 'KEYBOARD_RELEASE',
            keychar: text,
            keycode: key,
        };
        this.instance.sendEvent(json);
    }

    /**
     * Called when the user press a key. Handle special events like backspace.
     *
     * @param  {Event}   event Event.
     * @return {boolean}       Whether or not the event must continue propagation.
     */
    onKeyDown(event) {
        if (!this.transmitKeys) {
            return true;
        }

        let key;
        /**
         * Convert invisible key or shortcut keys when ctrl/meta are pressed
         * to Qt keycode in Base-16.
         * We only handle shortcut keys (c,x,v) up when ctrl or meta are pressed:
         * for OSX, onKeyUp() is never fired when meta is pressed so we need to emulate it.
         */
        if (CTRL_SHORTCUT_KEYS[event.keyCode] && event.ctrlKey) {
            key = parseInt(CTRL_SHORTCUT_KEYS[event.keyCode], 16);
        } else if (CTRL_SHORTCUT_KEYS[event.keyCode] && event.metaKey) {
            key = parseInt(CTRL_SHORTCUT_KEYS[event.keyCode], 16);
            let json = {
                type: 'KEYBOARD_PRESS',
                keychar: '',
                keycode: key,
            };
            this.instance.sendEvent(json);
            json = {
                type: 'KEYBOARD_RELEASE',
                keychar: '',
                keycode: key,
            };
            this.instance.sendEvent(json);
            // No need to propagate event or the character will also be send
            event.preventDefault();
            event.stopPropagation();
            event.returnValue = false;
            return false;
        } else if (INVISIBLE_KEYS[event.keyCode]) {
            key = parseInt(INVISIBLE_KEYS[event.keyCode], 16);
        } else {
            return true;
        }

        const json = {
            type: 'KEYBOARD_PRESS',
            keychar: '',
            keycode: key,
        };
        this.instance.sendEvent(json);
        this.currentlyPressedKeys.set(key, key);
        event.preventDefault();
        event.stopPropagation();
        event.returnValue = false;
        return false;
    }

    /**
     * Called when the user release a key. Handle special events like backspace
     *
     * @param  {Event}   event Event.
     * @return {boolean}       Whether or not the event must continue propagation.
     */
    onKeyUp(event) {
        if (!this.transmitKeys) {
            return true;
        }

        let key;
        /**
         * Convert invisible key or shortcut keys when ctrl/meta are pressed
         * to Qt keycode in Base-16.
         * We only handle shortcut keys (c,x,v) up when ctrl is pressed:
         * for OSX, onKeyUp() is never fired when meta is pressed so no need
         * to handle the case here since we emulate a down up in onKeyDown() in this case.
         */
        if (CTRL_SHORTCUT_KEYS[event.keyCode] && event.ctrlKey) {
            key = parseInt(CTRL_SHORTCUT_KEYS[event.keyCode], 16);
        } else if (INVISIBLE_KEYS[event.keyCode]) {
            key = parseInt(INVISIBLE_KEYS[event.keyCode], 16);
        } else {
            return true;
        }

        const json = {
            type: 'KEYBOARD_RELEASE',
            keychar: '',
            keycode: key,
        };
        this.instance.sendEvent(json);
        this.currentlyPressedKeys.delete(key);
        event.preventDefault();
        event.stopPropagation();
        event.returnValue = false;
        return false;
    }

    /**
     * Bind all event listener callback.
     */
    addKeyboardCallbacks() {
        this.instance.root.tabIndex = 0;

        if (!this.isListenerAdded) {
            // This avoid having continuously pressed keys because of alt+tab or any other command that blur from tab
            window.addEventListener('blur', this.cancelAllPressedKeys.bind(this));

            if (!this.keyboardCallbacks) {
                this.keyboardCallbacks = new Map([
                    ['keypress', this.onKeyPress.bind(this)],
                    ['keydown', this.onKeyDown.bind(this)],
                    ['keyup', this.onKeyUp.bind(this)]
                ]);
            }
            this.instance.root.focus();
            this.keyboardCallbacks.forEach((value, key) => {
                window.addEventListener(key, value);
            });
            this.isListenerAdded = true;
        }
    }

    /**
     * Remove the event handlers callbacks (if they were created)
     */
    removeKeyboardCallbacks() {
        if (!this.keyboardCallbacks || !this.isListenerAdded) {
            return;
        }
        window.removeEventListener('blur', this.cancelAllPressedKeys.bind(this));
        this.keyboardCallbacks.forEach((value, key) => {
            window.removeEventListener(key, value);
        });
        this.isListenerAdded = false;
    }
};
