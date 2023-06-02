'use strict';

const log = require('loglevel');
log.setDefaultLevel('debug');

const OverlayPlugin = require('./util/OverlayPlugin');

/**
 * Instance gamepad plugin.
 */
module.exports = class Gamepad extends OverlayPlugin {
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     * @param {Object} gamepadManager Gamepad manager.
     * @param {Object} i18n     Translations keys for the UI.
     */
    constructor(instance, gamepadManager, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};
        this.manager = gamepadManager;

        // Register plugin
        this.instance.gamepad = this;

        window.addEventListener('gm-gamepadButtonPressed', this.onGamepadButtonPressed.bind(this));
        window.addEventListener('gm-gamepadButtonReleased', this.onGamepadButtonReleased.bind(this));

        // Display widget
        this.renderToolbarButton();
        this.renderWidget();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-battery-button';
        this.toolbarBtnImage.title = this.i18n.GAMEPAD_TITLE || 'Gamepad';
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        this.toolbarBtn.onclick = this.toggleWidget.bind(this);
        toolbar.appendChild(this.toolbarBtn);
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        this.widget = document.createElement('div');
        this.container = document.createElement('div');

        // Generate title
        const title = document.createElement('div');
        title.className = 'gm-title';
        title.innerHTML = this.i18n.GAMEPAD_TITLE || 'Gamepad';
        this.container.appendChild(title);

        // Generate content wrapper
        this.content = document.createElement('div');
        this.container.appendChild(this.content);
        this.generateContent();
        window.addEventListener('gm-gamepadConnected', this.generateContent.bind(this));
        window.addEventListener('gm-gamepadDisconnected', this.generateContent.bind(this));

        // Setup
        this.widget.className = 'gm-overlay gm-gamepad-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.onclick = this.toggleWidget.bind(this);
        close.className = 'gm-close-btn';

        this.widget.appendChild(close);
        this.widget.appendChild(this.container);

        // Render into document
        this.overlays.push(this.widget);
        this.instance.root.appendChild(this.widget);
    }

    /**
     * Generate the list of gamepads in the widget
     */
    generateContent() {
        this.content.replaceChildren();
        const gamepads = this.instance.gamepadManager.getGamepads();
        if (gamepads.length === 0) {
            this.content.innerHTML = 'No gamepad detected, please plug one or press a button';
        } else {
            const ul = document.createElement('ul');
            for (const gamepad of gamepads) {
                if (gamepad.state === 'plugged') {
                    const li = document.createElement('li');
                    li.innerHTML = gamepad.name;
                    ul.appendChild(li);
                }
            }
            this.content.appendChild(ul);
        }
    }

    /**
     * Display or hide the widget.
     */
    toggleWidget() {
        // Notify other callers
        if (this.widget.classList.contains('gm-hidden')) {
            this.instance.emit('close-overlays');
            this.instance.emit('keyboard-disable');
        } else {
            this.instance.emit('keyboard-enable');
        }

        // Toggle display
        this.widget.classList.toggle('gm-hidden');
        this.toolbarBtnImage.classList.toggle('gm-active');
    }

    gamepadButtonToKeyboardButton(button) {
        switch (button) {
        case 0: // BUTTON_A
            return 304;
        case 1: // BUTTON_B
            return 305;
        case 2: // BUTTON_X
            return 307;
        case 3: // BUTTON_Y
            return 308;
        case 4: // BUTTON_L1
            return 310;
        case 5: // BUTTON_R1
            return 311;
        case 6: // BUTTON_L2
            return 312;
        case 7: // BUTTON_R2
            return 313;
        case 8: // BUTTON_SELECT
            return 314;
        case 9: // BUTTON_START
            return 315;
        case 10: // BUTTON_THUMBL
            return 317;
        case 11: // BUTTON_THUMBR
            return 318;
        case 12: // DPAD_UP
            return 103;
        case 13: // DPAD_DOWN
            return 108;
        case 14: // DPAD_LEFT
            return 105;
        case 15: // DPAD_RIGHT
            return 106;
        default:
            return null;
        }
    }

    onGamepadButtonPressed(event) {
        log.debug('button pressed');
        log.debug(event.detail);

        const json = {
            type: 'KEYBOARD_PRESS',
            keychar: '',
            keycode: this.gamepadButtonToKeyboardButton(event.detail.buttonIndex),
        };
        this.instance.sendEvent(json);
    }

    onGamepadButtonReleased(event) {
        log.debug('button released');
        log.debug(event.detail);

        const json = {
            type: 'KEYBOARD_RELEASE',
            keychar: '',
            keycode: this.gamepadButtonToKeyboardButton(event.detail.buttonIndex),
        };
        this.instance.sendEvent(json);
    }
};
