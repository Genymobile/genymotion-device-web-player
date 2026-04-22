/**
 * List of invisible key that can be pressed.
 * For values, see http://doc.qt.io/qt-4.8/qt.html & https://github.com/ccampbell/mousetrap/blob/master/mousetrap.js
 */
const INVISIBLE_KEYS = {
    Backspace: '0x01000003', // backspace (legacy keyCode: 8)
    Tab: '0x01000001', // tab (legacy keyCode: 9)
    Enter: '0x01000005', // enter (legacy keyCode: 13)
    Shift: '0x01000020', // shift (legacy keyCode: 16)
    Control: '0x01000021', // ctrl (legacy keyCode: 17)
    Alt: '0x01000023', // alt (legacy keyCode: 18)
    CapsLock: '0x01000024', // capslock (legacy keyCode: 20)
    Escape: '0x01000000', // escape (legacy keyCode: 27)
    Esc: '0x01000000', // escape (legacy alias)
    ' ': '0x20', // space (ASCII: 32, legacy keyCode: 32)
    Spacebar: '0x20', // space (legacy alias)
    PageUp: '0x01000016', // pageup (legacy keyCode: 33)
    PageDown: '0x01000017', // pagedown (legacy keyCode: 34)
    End: '0x01000011', // end (legacy keyCode: 35)
    Home: '0x01000010', // home (legacy keyCode: 36)
    ArrowLeft: '0x01000012', // left (legacy keyCode: 37)
    ArrowUp: '0x01000013', // up (legacy keyCode: 38)
    ArrowRight: '0x01000014', // right (legacy keyCode: 39)
    ArrowDown: '0x01000015', // down (legacy keyCode: 40)
    Insert: '0x01000006', // ins (legacy keyCode: 45)
    Delete: '0x01000007', // del (legacy keyCode: 46)
    /**
     * Do not propagate Meta to Android. It disables copy/cut/paste special keys when pressed
     *    91: '0x01000022', // meta
     *    93: '0x01000022', // meta
     *    224: '0x01000022', // meta
     */
};

const CTRL_SHORTCUT_KEYS = {
    c: '0x010000cf', // Copy (legacy keyCode: 67)
    v: '0x010000e2', // Paste (legacy keyCode: 86)
    x: '0x010000d0', // Cut (legacy keyCode: 88)
};

/**
 * Instance keyboard plugin.
 * Translate and forward keyboard events to instance.
 */
export default class KeyboardEvents {
    static get name() {
        return 'KeyboardEvents';
    }

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

        this.isListenerAdded = false;
        this.isAutoPasteActive = false;
        this.currentlyPressedKeys = new Map();

        this.instance.store.subscribe(
            ({isKeyboardEventsEnabled}) => {
                if (isKeyboardEventsEnabled) {
                    this.addKeyboardCallbacks();
                } else {
                    this.removeKeyboardCallbacks();
                }
            },
            ['isKeyboardEventsEnabled'],
        );

        this.isAutoPasteActive = this.instance.store.state.isAutoPasteActive;
        this.instance.store.subscribe(
            ({isAutoPasteActive}) => {
                this.isAutoPasteActive = isAutoPasteActive;
            },
            ['isAutoPasteActive'],
        );

        // activate the plugin listening
        this.instance.store.dispatch({type: 'KEYBOARD_EVENTS_ENABLED', payload: true});
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
     * Called when the user press a key. Handle special events like backspace.
     *
     * @param  {Event}   event Event.
     * @return {boolean}       Whether or not the event must continue propagation.
     */
    onKeyDown(event) {
        const normalizedKey = (event.key || '').toLowerCase();
        let key;

        // Auto-paste is handled by Clipboard plugin, skip keyboard mapping for Ctrl/Cmd+V.
        if (this.isAutoPasteActive && normalizedKey === 'v' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        /**
         * Convert invisible key or shortcut keys when ctrl/meta are pressed
         * to Qt keycode in Base-16.
         * We only handle shortcut keys (c,x,v) up when ctrl or meta are pressed:
         * for OSX, onKeyUp() is never fired when meta is pressed so we need to emulate it.
         */
        // Ctrl + C/V/X: map shortcut key to matching Qt keycode.
        if (CTRL_SHORTCUT_KEYS[normalizedKey] && event.ctrlKey) {
            key = parseInt(CTRL_SHORTCUT_KEYS[normalizedKey], 16);
        // Meta (Cmd on macOS) + C/V/X: emulate press+release in keydown because keyup may not fire.
        } else if (CTRL_SHORTCUT_KEYS[normalizedKey] && event.metaKey) {
            key = parseInt(CTRL_SHORTCUT_KEYS[normalizedKey], 16);
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
            return false;
        // Non printable/special keys (Enter, Backspace, arrows, ...).
        } else if (INVISIBLE_KEYS[event.key]) {
            key = parseInt(INVISIBLE_KEYS[event.key], 16);
        // Printable characters without modifiers: send press+release immediately.
        } else if (event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const text = event.key;
            const charCode = text.charCodeAt(0);
            let json = {
                type: 'KEYBOARD_PRESS',
                keychar: text,
                keycode: charCode,
            };
            this.instance.sendEvent(json);
            json = {
                type: 'KEYBOARD_RELEASE',
                keychar: text,
                keycode: charCode,
            };
            this.instance.sendEvent(json);
            event.preventDefault();
            event.stopPropagation();
            return false;
        // Unhandled key combination: let browser/default listeners process it.
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
        return false;
    }

    /**
     * Called when the user release a key. Handle special events like backspace
     *
     * @param  {Event}   event Event.
     * @return {boolean}       Whether or not the event must continue propagation.
     */
    onKeyUp(event) {
        const normalizedKey = (event.key || '').toLowerCase();
        let key;

        // Auto-paste is handled by Clipboard plugin, skip keyboard mapping for Ctrl/Cmd+V.
        if (this.isAutoPasteActive && normalizedKey === 'v' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        /**
         * Convert invisible key or shortcut keys when ctrl/meta are pressed
         * to Qt keycode in Base-16.
         * We only handle shortcut keys (c,x,v) up when ctrl is pressed:
         * for OSX, onKeyUp() is never fired when meta is pressed so no need
         * to handle the case here since we emulate a down up in onKeyDown() in this case.
         */
        // Ctrl + C/V/X: release the mapped Qt shortcut key.
        if (CTRL_SHORTCUT_KEYS[normalizedKey] && event.ctrlKey) {
            key = parseInt(CTRL_SHORTCUT_KEYS[normalizedKey], 16);
        // Non printable/special keys: release mapped key.
        } else if (INVISIBLE_KEYS[event.key]) {
            key = parseInt(INVISIBLE_KEYS[event.key], 16);
        // Nothing to release for other keys here.
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
        return false;
    }

    /**
     * Bind all event listener callback.
     */
    addKeyboardCallbacks() {
        if (!this.isListenerAdded) {
            // This avoid having continuously pressed keys because of alt+tab or any other command that blur from tab
            this.removeBlurListener = this.instance.addListener(window, 'blur', this.cancelAllPressedKeys.bind(this));

            if (!this.keyboardCallbacks) {
                this.keyboardCallbacks = [
                    {event: 'keydown', handler: this.onKeyDown.bind(this), removeListener: null},
                    {event: 'keyup', handler: this.onKeyUp.bind(this), removeListener: null},
                    {
                        event: 'click',
                        handler: () => {
                            // need to be able to capture key events on the video element when it is clicked
                            this.instance.video.tabIndex = 0;
                            this.instance.video.focus();
                        },
                        removeListener: null,
                    },
                ];
            }
            this.instance.root.focus();
            this.keyboardCallbacks.forEach((item, index, array) => {
                array[index].removeListener = this.instance.addListener(this.instance.video, item.event, item.handler);
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
        this.removeBlurListener();
        this.keyboardCallbacks.forEach((item) => {
            item.removeListener();
        });
        this.isListenerAdded = false;
    }
}
