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
     * Determine if the instance and the renderer video share the same orientation.
     *
     * @return {boolean} True if the instance and the renderer video are in the same orientation.
     */
    hasSameOrientation() {
        return (
            (this.video.videoWidth / this.video.videoHeight > 1 &&
                this.video.offsetWidth / this.video.offsetHeight > 1) ||
            (this.video.videoWidth / this.video.videoHeight < 1 && this.video.offsetWidth / this.video.offsetHeight < 1)
        );
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
     * @return {number}       Relative x coordinate (in VM coordinates, rounded to nearest integer).
     */
    getXCoordinate(event) {
        this.instance.root.focus(); // not on the Y function because we need to focus element only once
        this.setVideoElement();

        const x = this.getRawXCoordinateFromEvent(event) - this.getLeftBorder();

        return Math.round(x * this.getXRatio());
    }

    /**
     * Get the final emulated y coordinate. Video ratio & orientation taken into account.
     *
     * @param  {Event}   event Raw mouse/touch event.
     * @return {number}       Relative y coordinate (in VM coordinates, rounded to nearest integer).
     */
    getYCoordinate(event) {
        this.setVideoElement();

        const y = this.getRawYCoordinateFromEvent(event) - this.getTopBorder();
        return Math.round(y * this.getYRatio());
    }

    /**
     * Get the x ratio between screen & emulated size, orientation taken into account.
     * @returns {number} Ratio on X axis.
     */
    getXRatio() {
        let videoRealSizeX;
        if (this.hasSameOrientation()) {
            if (this.hasLeftAndRightBorders()) {
                videoRealSizeX = (this.video.videoWidth / this.video.videoHeight) * this.video.offsetHeight;
                return this.video.videoWidth / videoRealSizeX;
            }
            return this.video.videoWidth / this.video.offsetWidth;
        }
        if (this.hasLeftAndRightBorders()) {
            videoRealSizeX = (this.video.videoWidth / this.video.videoHeight) * this.video.offsetHeight;
            return this.video.videoWidth / videoRealSizeX;
        }
        const videoRealSizeY = (this.video.videoHeight / this.video.videoWidth) * this.video.offsetWidth;
        return this.video.videoHeight / videoRealSizeY;
    }

    /**
     * Get the y ratio between screen & emulated size, orientation taken into account.
     * @returns {number} Ratio on Y axis.
     */
    getYRatio() {
        let videoRealSizeX, videoRealSizeY;
        if (this.hasSameOrientation()) {
            if (this.hasLeftAndRightBorders()) {
                return this.video.videoHeight / this.video.offsetHeight;
            }
            videoRealSizeY = (this.video.videoHeight / this.video.videoWidth) * this.video.offsetWidth;
            return this.video.videoHeight / videoRealSizeY;
        }
        if (this.hasLeftAndRightBorders()) {
            videoRealSizeX = (this.video.videoWidth / this.video.videoHeight) * this.video.offsetHeight;
            return this.video.videoWidth / videoRealSizeX;
        }
        videoRealSizeY = (this.video.videoHeight / this.video.videoWidth) * this.video.offsetWidth;
        return this.video.videoHeight / videoRealSizeY;
    }

    /**
     * Computes and return the height of the horizontal borders, if there is no horizontal border returns 0.
     * @returns {number} Height of the horizontal borders.
     */
    getTopBorder() {
        this.setVideoElement();
        if (this.hasLeftAndRightBorders()) {
            return 0;
        }
        const videoRealSizeY = (this.video.videoHeight / this.video.videoWidth) * this.video.offsetWidth;
        return (this.video.offsetHeight - videoRealSizeY) / 2;
    }

    /**
     * Computes and return the height of the vertical borders, if there is no vertical border returns 0.
     * @returns {number} Height of the vertical borders.
     */
    getLeftBorder() {
        this.setVideoElement();
        if (!this.hasLeftAndRightBorders()) {
            return 0;
        }
        const videoRealSizeX = (this.video.videoWidth / this.video.videoHeight) * this.video.offsetHeight;
        return (this.video.offsetWidth - videoRealSizeX) / 2;
    }

    calculateCoorFromPercent(x, y) {
        const videoSize = this.instance.video.getBoundingClientRect();

        const xFromPercent = (x / 100) * videoSize.width * this.instance.coordinateUtils.getXRatio();
        const yFromPercent =
            (y / 100) *
            (videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
            this.instance.coordinateUtils.getYRatio();

        return {x: Math.floor(xFromPercent), y: Math.floor(yFromPercent)};
    }

    calculateCoorToPercent(x, y) {
        const videoSize = this.instance.video.getBoundingClientRect();

        const xPercent = 100 / ((videoSize.width * this.instance.coordinateUtils.getXRatio()) / x);
        const yPercent =
            100 /
            (((videoSize.height - this.instance.coordinateUtils.getTopBorder() * 2) *
                this.instance.coordinateUtils.getYRatio()) /
                y);
        return {x: Math.round(xPercent), y: Math.round(yPercent)};
    }
};
