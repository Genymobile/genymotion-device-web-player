'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Instance screenshot plugin.
 * Provides screenshot and video capture.
 */
module.exports = class Screenshot extends OverlayPlugin {
    static get name() {
        return 'Screenshot';
    }
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
        this.instance.screenshot = this;

        // Render components
        this.registerToolbarButton();
    }

    /**
     * Add the buttons to the renderer toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-screenshot-button',
            title: this.i18n.SCREENSHOT_TITLE || 'Screenshot',
            onClick: (event) => {
                this.onScreenshotClick(event);
            },
        });
    }

    /**
     * Take a screenshot.
     *
     * @param {Event} event Event.
     */
    onScreenshotClick(event) {
        event.preventDefault();

        // Setup
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const {video} = this.instance;

        // Set canvas size to render to
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Render into the canvas the current state of video
        if (ctx && video instanceof HTMLVideoElement) {
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, video.videoWidth, video.videoHeight);
        } else {
            return;
        }

        // configure download link
        const downloadLink = document.createElement('a');
        downloadLink.download = 'device-screenshot.png';
        document.body.appendChild(downloadLink);

        // Get canvas data / force download
        let data = canvas.toDataURL('image/png');
        if (data) {
            data = data.replace(/^data:image\/[^;]*/, 'data:application/octet-stream');
        }
        downloadLink.href = data;

        // Trigger download
        downloadLink.click();

        setTimeout(() => {
            document.body.removeChild(downloadLink);
        }, 100);
    }
};
