'use strict';

const adapterjs = require('webrtc-adapter');
const OverlayPlugin = require('./util/OverlayPlugin');

const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Instance camera plugin.
 * Provides client webcam and camera control.
 */
module.exports = class Camera extends OverlayPlugin {
    static get name() {
        return 'Camera';
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
        this.instance.camera = this;

        // Display widget
        this.registerToolbarButton();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: this.instance.options.microphone ? 'gm-camera-mic-button' : 'gm-camera-button',
            title: this.instance.options.microphone
                ? this.i18n.CAMERA_MIC_TITLE || 'Camera and microphone injection'
                : this.i18n.CAMERA_TITLE || 'Camera injection',
            onClick: () => this.instance.mediaManager.toggleVideoStreaming(),
        });
    }

    enable() {
        const videoCapabilities = RTCRtpSender.getCapabilities('video');
        if (videoCapabilities.codecs.some((codec) => codec.mimeType === 'video/H264')) {
            super.enable();
        } else {
            this.instance.toolbarManager.disableButton(this.constructor.name);
        }
    }
};
