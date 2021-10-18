'use strict';

/**
 * Screen coordinates utility plugin.
 * Provides utility functions related to mouse inputs & the instance video stream.
 * Used by MouseEvents and MultiTouchEvents plugins.
 */
module.exports = class CoordinateUtils {
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     */
    constructor(instance) {
        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.coordinateUtils = this;

        // Virtual device video stream
        this.video = this.instance.video;
    }

    /**
     * Keep the video stream reference in sync.
     */
    setVideoElement() {
        this.video = this.instance.video;
    }

    /**
     * Determine the position of the instance offset borders.
     *
     * @return {boolean} True if borders are on on the left and right side, else if they are on top and bottom.
     */
    hasLeftAndRightBorders() {
        return this.video.offsetWidth / this.video.offsetHeight > this.video.videoWidth / this.video.videoHeight;
    }

    /**
     * Determine if the instance and the player video share the same orientation.
     *
     * @return {boolean} True if the instance and the player video are in the same orientation.
     */
    hasSameOrientation() {
        return this.video.videoWidth / this.video.videoHeight > 1 &&
            this.video.offsetWidth / this.video.offsetHeight > 1
            ||
            this.video.videoWidth / this.video.videoHeight < 1 &&
            this.video.offsetWidth / this.video.offsetHeight < 1;
    }

    /**
     * Get cumulative offset between a givem element and the top left corner of the web page.
     *
     * @param  {HTMLElement} element DOM element to get the position from.
     * @return {Object}              Offset (top and left).
     */
    getCumulativeOffset(element) {
        let top = 0;
        let left = 0;
        do {
            top += element.offsetTop || 0;
            left += element.offsetLeft || 0;
            element = element.offsetParent;
        } while (element);

        return {
            top: top,
            left: left,
        };
    }

    /**
     * Get the relative (cumulative, offset deduced) x coordinate from an event (touch or mouse).
     *
     * @param  {Event}   event Raw mouse/touch event.
     * @return {number}       Relative x coordinate.
     */
    getRawXCoordinateFromEvent(event) {
        if (typeof event.pageX !== 'undefined') {
            if (typeof event.offsetX !== 'undefined') {
                return event.offsetX;
            }
            return event.pageX - this.getCumulativeOffset(this.video).left;
        }
        return event.clientX - this.getCumulativeOffset(this.video).left;
    }

    /**
     * Get the relative (cumulative, offset deduced) y coordinate from an event (touch or mouse).
     *
     * @param  {Event}   event Raw mouse/touch event.
     * @return {number}       Relative y coordinate.
     */
    getRawYCoordinateFromEvent(event) {
        if (typeof event.pageY !== 'undefined') {
            if (typeof event.offsetY !== 'undefined') {
                return event.offsetY;
            }
            return event.pageY - this.getCumulativeOffset(this.video).top;
        }
        return event.clientY - this.getCumulativeOffset(this.video).top;
    }

    /**
     * Get the final emulated x coordinate. Video ratio & orientation taken into account.
     *
     * @param  {Event}   event Raw mouse/touch event.
     * @return {number}       Relative x coordinate.
     */
    getXCoordinate(event) {
        this.instance.root.focus(); // not on the Y function because we need to focus element only once
        this.setVideoElement();
        const x = this.getRawXCoordinateFromEvent(event);
        let videoRealSizeX, ratio;
        if (this.hasSameOrientation()) {
            if (this.hasLeftAndRightBorders()) {
                videoRealSizeX = this.video.videoWidth / this.video.videoHeight * this.video.offsetHeight;
                const xRatio = this.video.videoWidth / videoRealSizeX;
                const blackBorderSize = (this.video.offsetWidth - videoRealSizeX) / 2;
                return (x - blackBorderSize) * xRatio;
            }
            return this.video.videoWidth / this.video.offsetWidth * x;
        }
        if (this.hasLeftAndRightBorders()) {
            videoRealSizeX = this.video.videoWidth / this.video.videoHeight * this.video.offsetHeight;
            ratio = this.video.videoWidth / videoRealSizeX;
            return (x - (this.video.offsetWidth - videoRealSizeX) / 2) * ratio;
        }
        const videoRealSizeY = this.video.videoHeight / this.video.videoWidth * this.video.offsetWidth;
        ratio = this.video.videoHeight / videoRealSizeY;
        return x * ratio;
    }

    /**
     * Get the final emulated y coordinate. Video ratio & orientation taken into account.
     *
     * @param  {Event}   event Raw mouse/touch event.
     * @return {number}       Relative y coordinate.
     */
    getYCoordinate(event) {
        this.setVideoElement();
        const y = this.getRawYCoordinateFromEvent(event);
        let videoRealSizeX, videoRealSizeY, ratio;
        if (this.hasSameOrientation()) {
            if (this.hasLeftAndRightBorders()) {
                return this.video.videoHeight / this.video.offsetHeight * y;
            }
            videoRealSizeY = this.video.videoHeight / this.video.videoWidth * this.video.offsetWidth;
            const yRatio = this.video.videoHeight / videoRealSizeY;
            const blackBorderTopSize = (this.video.offsetHeight - videoRealSizeY) / 2;
            return (y - blackBorderTopSize) * yRatio;
        }
        if (this.hasLeftAndRightBorders()) {
            videoRealSizeX = this.video.videoWidth / this.video.videoHeight * this.video.offsetHeight;
            ratio = this.video.videoWidth / videoRealSizeX;
            return y * ratio;
        }
        videoRealSizeY = this.video.videoHeight / this.video.videoWidth * this.video.offsetWidth;
        ratio = this.video.videoHeight / videoRealSizeY;
        return (y - (this.video.offsetHeight - videoRealSizeY) / 2) * ratio;
    }
};
