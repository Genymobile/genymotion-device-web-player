'use strict';

/**
 * Instance multi touch plugin.
 * Forward multi touch events to instance.
 */
module.exports = class MultiTouchEvents {
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     */
    constructor(instance) {
        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.touchEvents = this;
        this.instance.touchEventsEnabled = true;
    }

    /**
     * Called when the user starts touching the screen
     *
     * @param {Event} event Event.
     */
    onScreenTouchStart(event) {
        event.preventDefault();
        event.stopPropagation();

        const json = {type: 'MULTI_TOUCH', nb: event.targetTouches.length, mode: 0, points: []};
        for (let i = 0; i < event.targetTouches.length; i++) {
            const touch = event.targetTouches[i];

            this.instance.x = this.instance.coordinateUtils.getXCoordinate(touch);
            this.instance.y = this.instance.coordinateUtils.getYCoordinate(touch);

            json.points.push({x: this.instance.x, y: this.instance.y});
        }
        this.instance.sendEvent(json);
    }

    /**
     * Called when the user is moving on the screen.
     *
     * @param {Event} event Event.
     */
    onScreenTouchMove(event) {
        event.preventDefault();
        event.stopPropagation();

        const json = {type: 'MULTI_TOUCH', nb: event.targetTouches.length, mode: 2, points: []};
        for (let i = 0; i < event.targetTouches.length; i++) {
            const touch = event.targetTouches[i];

            this.instance.x = this.instance.coordinateUtils.getXCoordinate(touch);
            this.instance.y = this.instance.coordinateUtils.getYCoordinate(touch);

            json.points.push({x: this.instance.x, y: this.instance.y});
        }
        this.instance.sendEvent(json);
    }

    /**
     * Called when the user stops touching the screen.
     *
     * @param {Event} event Event.
     */
    onScreenTouchEnd(event) {
        event.preventDefault();
        event.stopPropagation();

        const json = {type: 'MULTI_TOUCH', nb: event.targetTouches.length, mode: 1, points: []};
        for (let i = 0; i < event.targetTouches.length; i++) {
            const touch = event.targetTouches[i];

            this.instance.x = this.instance.coordinateUtils.getXCoordinate(touch);
            this.instance.y = this.instance.coordinateUtils.getYCoordinate(touch);

            json.points.push({x: this.instance.x, y: this.instance.y});
        }
        this.instance.sendEvent(json);
    }

    /**
     * Bind all event handlers to the video wrapper.
     */
    addTouchCallbacks() {
        this.instance.addListener(this.instance.videoWrapper, 'touchstart', this.onScreenTouchStart.bind(this), false);
        this.instance.addListener(this.instance.videoWrapper, 'touchend', this.onScreenTouchEnd.bind(this), false);
        this.instance.addListener(this.instance.videoWrapper, 'touchmove', this.onScreenTouchMove.bind(this), false);
    }
};
