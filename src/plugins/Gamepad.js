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
     * @param {Object} i18n     Translations keys for the UI.
     */
    constructor(instance, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};

        // Register plugin
        this.instance.gamepad = this;

        this.instance.addListener(window, 'gm-gamepadButtonPressed', this.onGamepadButtonPressed.bind(this));
        this.instance.addListener(window, 'gm-gamepadButtonReleased', this.onGamepadButtonReleased.bind(this));
        this.instance.addListener(window, 'gm-gamepadAxis', this.onGamepadAxisChanged.bind(this));

        this.instance.registerEventCallback('vinput', this.handleConfirmation.bind(this));

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
        this.toolbarBtnImage.className = 'gm-icon-button gm-gamepad-button';
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
        this.instance.addListener(window, 'gm-gamepadConnected', this.handleGamepadPlugged.bind(this));
        this.instance.addListener(window, 'gm-gamepadDisconnected', this.handleGamepadUnplugged.bind(this));

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

    handleGamepadPlugged(event) {
        log.debug('Gamepad plugged');
        const gamepad = event.detail;
        this.generateContent();
        this.sendGamepadPlugEvent(gamepad.localIndex, gamepad.name.split(' ').join('_'),
            gamepad.vendorID, gamepad.productID);
    }

    handleGamepadUnplugged() {
        log.debug('Gamepad unplugged');
        const gamepad = event.detail;
        this.generateContent();
        this.sendGamepadUnplugEvent(gamepad.remoteIndex);
    }

    sendGamepadPlugEvent(index, name, vendorID, productID) {
        const json = {
            channel : 'vinput' , messages : [
                'gamepad_plugin ' + index + ' ' + name + ' ' + vendorID + ' ' + productID
            ]
        };

        this.instance.sendEvent(json);
    }

    sendGamepadUnplugEvent(index) {
        const json = {
            channel : 'vinput' , messages : [
                'gamepad_plugout ' + index
            ]
        };

        this.instance.sendEvent(json);
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

    handleConfirmation(message) {
        const values = message.split(' ');
        if (values[0] === 'gamepad_plugin_confirmation' && values.length === 3) {
            this.instance.gamepadManager.listenForInputs(parseInt(values[1]), parseInt(values[2]));
        }
    }

    onGamepadButtonPressed(event) {
        log.debug('button pressed');

        const json = {
            channel : 'vinput' , messages : [
                'gamepad_press ' + event.detail.gamepadIndex + ' ' + event.detail.buttonIndex
            ]
        };
        this.instance.sendEvent(json);
    }

    onGamepadButtonReleased(event) {
        log.debug('button released');

        const json = {
            channel : 'vinput' , messages : [
                'gamepad_release ' + event.detail.gamepadIndex + ' ' + event.detail.buttonIndex
            ]
        };
        this.instance.sendEvent(json);
    }

    onGamepadAxisChanged(event) {
        log.debug('Axis changed');

        const json = {
            channel : 'vinput' , messages : [
                'gamepad_axis ' + event.detail.gamepadIndex + ' ' + event.detail.axisIndex + ' ' + event.detail.value
            ]
        };
        this.instance.sendEvent(json);
    }
};
