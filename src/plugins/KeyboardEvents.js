import {CTRL_SHORTCUT_KEYS, INVISIBLE_KEYS} from './util/qt-keycodes';

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
        const eventsToSend = [];
        let pressedKeyToTrack = null;

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
        switch (true) {
            // Ctrl + C/V/X: map shortcut key to matching Qt keycode.
            case Boolean(CTRL_SHORTCUT_KEYS[normalizedKey] && event.ctrlKey): {
                const key = parseInt(CTRL_SHORTCUT_KEYS[normalizedKey], 16);
                eventsToSend.push({
                    type: 'KEYBOARD_PRESS',
                    keychar: '',
                    keycode: key,
                });
                pressedKeyToTrack = key;
                break;
            }
            // Meta (Cmd on macOS) + C/V/X: emulate press+release in keydown because keyup may not fire.
            case Boolean(CTRL_SHORTCUT_KEYS[normalizedKey] && event.metaKey): {
                const key = parseInt(CTRL_SHORTCUT_KEYS[normalizedKey], 16);
                eventsToSend.push({
                    type: 'KEYBOARD_PRESS',
                    keychar: '',
                    keycode: key,
                });
                eventsToSend.push({
                    type: 'KEYBOARD_RELEASE',
                    keychar: '',
                    keycode: key,
                });
                break;
            }
            // Non printable/special keys (Enter, Backspace, arrows, ...).
            case Boolean(INVISIBLE_KEYS[event.key]): {
                const key = parseInt(INVISIBLE_KEYS[event.key], 16);
                eventsToSend.push({
                    type: 'KEYBOARD_PRESS',
                    keychar: '',
                    keycode: key,
                });
                pressedKeyToTrack = key;
                break;
            }
            // Printable characters without modifiers: send press+release immediately.
            case Boolean(event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey): {
                const text = event.key;
                const charCode = text.charCodeAt(0);
                eventsToSend.push({
                    type: 'KEYBOARD_PRESS',
                    keychar: text,
                    keycode: charCode,
                });
                eventsToSend.push({
                    type: 'KEYBOARD_RELEASE',
                    keychar: text,
                    keycode: charCode,
                });
                break;
            }
            // Unhandled key combination: let browser/default listeners process it.
            default:
                return true;
        }

        eventsToSend.forEach((json) => {
            this.instance.sendEvent(json);
        });

        if (pressedKeyToTrack !== null) {
            this.currentlyPressedKeys.set(pressedKeyToTrack, pressedKeyToTrack);
        }

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
        const eventsToSend = [];
        let releasedKeyToUntrack = null;

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
        switch (true) {
            // Ctrl + C/V/X: release the mapped Qt shortcut key.
            case Boolean(CTRL_SHORTCUT_KEYS[normalizedKey] && event.ctrlKey): {
                const key = parseInt(CTRL_SHORTCUT_KEYS[normalizedKey], 16);
                eventsToSend.push({
                    type: 'KEYBOARD_RELEASE',
                    keychar: '',
                    keycode: key,
                });
                releasedKeyToUntrack = key;
                break;
            }
            // Non printable/special keys: release mapped key.
            case Boolean(INVISIBLE_KEYS[event.key]): {
                const key = parseInt(INVISIBLE_KEYS[event.key], 16);
                eventsToSend.push({
                    type: 'KEYBOARD_RELEASE',
                    keychar: '',
                    keycode: key,
                });
                releasedKeyToUntrack = key;
                break;
            }
            // Nothing to release for other keys here.
            default:
                return true;
        }

        eventsToSend.forEach((json) => {
            this.instance.sendEvent(json);
        });

        if (releasedKeyToUntrack !== null) {
            this.currentlyPressedKeys.delete(releasedKeyToUntrack);
        }

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
