/**
 * List of invisible keys that can be pressed.
 * Values are Qt keycodes in base-16 string format.
 */
export const INVISIBLE_KEYS = Object.freeze({
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
});

/**
 * List of Ctrl/Cmd shortcut keys to map to Qt keycodes.
 * Values are Qt keycodes in base-16 string format.
 */
export const CTRL_SHORTCUT_KEYS = Object.freeze({
    c: '0x010000cf', // Copy (legacy keyCode: 67)
    v: '0x010000e2', // Paste (legacy keyCode: 86)
    x: '0x010000d0', // Cut (legacy keyCode: 88)
});
