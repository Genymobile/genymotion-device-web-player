'use strict';

const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Instance mouse plugin.
 * Forward touch events to instance.
 */
module.exports = class MouseEvents {
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     */
    constructor(instance) {
        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.mouseEvents = this;
        this.instance.mouseEventsEnabled = true;

        this.leftButtonPressed = false;
        this.boundEventListener = this.releaseAtPreviousPositionEvent.bind(this);
    }

    /**
     * Mouse press event handler.
     *
     * @param {Event} event Event.
     */
    onMousePressEvent(event) {
        this.instance.video.muted = false;

        event.preventDefault();
        event.stopPropagation();
        this.leftButtonPressed = true;
        this.instance.x = this.instance.coordinateUtils.getXCoordinate(event);
        this.instance.y = this.instance.coordinateUtils.getYCoordinate(event);

        let json = '';
        if (event.button === 2) {
            log.debug('Right button pressed (' + this.instance.x + 'x' + this.instance.y);
            json = {
                type: 'FAKE_MULTI_TOUCH_PRESS',
                mode: 1, x: this.instance.x, y: this.instance.y,
            };
        } else {
            if (event.ctrlKey || event.metaKey) {
                json = {
                    type: 'FAKE_MULTI_TOUCH_PRESS',
                    mode: event.shiftKey ? 2 : 1, x: this.instance.x, y: this.instance.y,
                };
            } else {
                json = {type: 'MOUSE_PRESS', x: this.instance.x, y: this.instance.y};
            }
        }
        this.instance.sendEvent(json);

        document.addEventListener('mouseup', this.boundEventListener, false);
    }

    /**
     * Mouse release event handler.
     *
     * @param {Event} event Event.
     */
    onMouseReleaseEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        this.leftButtonPressed = false;
        this.instance.x = this.instance.coordinateUtils.getXCoordinate(event);
        this.instance.y = this.instance.coordinateUtils.getYCoordinate(event);
        let json = '';
        if (event.button === 2) {
            log.debug('Right button released (' + this.instance.x + 'x' + this.instance.y);
            json = {
                type: 'FAKE_MULTI_TOUCH_RELEASE',
                mode: 1, x: this.instance.x, y: this.instance.y,
            };
        } else {
            if (event.ctrlKey || event.metaKey) {
                json = {
                    type: 'FAKE_MULTI_TOUCH_RELEASE',
                    mode: event.shiftKey ? 2 : 1, x: this.instance.x, y: this.instance.y,
                };
            } else {
                json = {type: 'MOUSE_RELEASE', x: this.instance.x, y: this.instance.y};
            }
        }
        this.instance.sendEvent(json);

        document.removeEventListener('mouseup', this.boundEventListener, false);
    }

    /**
     * External mouse release event classback.
     * Called when onmouseup event occurs outside of the player.
     *
     * @param {Event} event Event.
     */
    releaseAtPreviousPositionEvent(event) {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.leftButtonPressed = false;
        const json = {
            type: event.ctrlKey || event.metaKey ? 'FAKE_MULTI_TOUCH_RELEASE' : 'MOUSE_RELEASE',
            x: this.instance.x,
            y: this.instance.y,
        };
        this.instance.sendEvent(json);

        document.removeEventListener('mouseup', this.boundEventListener, false);
    }

    /**
     * Mouse move event handler.
     *
     * @param {Event} event Event.
     */
    onMouseMoveEvent(event) {
        if (!this.leftButtonPressed) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.instance.x = this.instance.coordinateUtils.getXCoordinate(event);
        this.instance.y = this.instance.coordinateUtils.getYCoordinate(event);
        const json = {type: 'MOUSE_MOVE', x: this.instance.x, y: this.instance.y};
        this.instance.sendEvent(json);
    }

    /**
     * Mouse move event handler.
     *
     * @param {Event} event Event.
     */
    onMouseWheelEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        this.instance.x = this.instance.coordinateUtils.getXCoordinate(event);
        this.instance.y = this.instance.coordinateUtils.getYCoordinate(event);
        const delta = event.wheelDelta;
        const json = {type: 'WHEEL', x: this.instance.x, y: this.instance.y, delta: delta};
        this.instance.sendEvent(json);
    }

    /**
     * Method called when context menu try to open.
     *
     * @param {Event} event Event.
     */
    cancelContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        event.returnValue = false;
    }

    /**
     * Bind all event handlers to the video wrapper.
     */
    addMouseCallbacks() {
        this.instance.videoWrapper.addEventListener('mousedown', this.onMousePressEvent.bind(this), false);
        this.instance.videoWrapper.addEventListener('mouseup', this.onMouseReleaseEvent.bind(this), false);
        this.instance.videoWrapper.addEventListener('mousemove', this.onMouseMoveEvent.bind(this), false);
        this.instance.videoWrapper.addEventListener('mousewheel', this.onMouseWheelEvent.bind(this), false);
        this.instance.videoWrapper.addEventListener('contextmenu', this.cancelContextMenu.bind(this), false);
    }
};
