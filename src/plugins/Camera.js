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

        this.streaming = false;

        // Display widget
        this.renderToolbarButton();
    }

    /**
     * Add the button to the player toolbar.
     */
    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-camera-button';
        this.toolbarBtnImage.title = this.i18n.CAMERA_TITLE || 'Use webcam as camera';
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        toolbar.appendChild(this.toolbarBtn);

        // if we are using safari, we disable camera since it sends its stream on h264 which is not currently supported
        if (adapterjs.default.browserDetails.browser === 'safari') {
            this.toolbarBtn.className += ' gm-disabled-widget-pop-up';
            this.toolbarBtnImage.className += ' gm-disabled-widget-icon';
        } else {
            this.toolbarBtn.onclick = this.toggleStreaming.bind(this);
        }
    }

    /**
     * Toggle local video forward forwarding.
     * Redirect the client webcam video stream to the instance.
     */
    toggleStreaming() {
        if (!this.streaming) {
            this.startStreaming();
        } else {
            this.stopStreaming();
        }
    }

    /**
     * Initialize and start client webcam video stream.
     */
    startStreaming() {
        if (!navigator.mediaDevices) {
            return;
        }

        navigator.mediaDevices.getUserMedia({
            audio: this.instance.options.microphone,
            video: {
                width:1280,
                height: 720,
            },
        })
            .catch((err) => {
                this.onVideoStreamError(err);
            })
            .then((mediaStream) => {
                log.debug('Client video stream ready');
                this.streaming = true;
                this.localStream = mediaStream;
                this.instance.addLocalStream(mediaStream);
            });
    }

    /**
     * Client video stream error handler.
     *
     * @param {Error} error Camera stream error.
     */
    onVideoStreamError(error) {
        log.warn('Can\'t start client video stream', error);
    }

    /**
     * Stop client webcam video stream.
     */
    stopStreaming() {
        log.debug('removed local stream');
        this.instance.removeLocalStream(this.localStream);
        this.localStream = null;
        this.streaming = false;
    }

    /**
     * Get client webcam video stream.
     *
     * @return {MediaStream} Client video stream
     */
    getClientVideoStream() {
        return this.localStream;
    }
};
