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

        // Display widget
        this.renderToolbarButton();
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
        if (this.instance.options.microphone) {
            this.toolbarBtnImage.className = 'gm-icon-button gm-camera-mic-button';
            this.toolbarBtnImage.title = this.i18n.CAMERA_TITLE || 'Camera and microphone injection';
        } else {
            this.toolbarBtnImage.className = 'gm-icon-button gm-camera-button';
            this.toolbarBtnImage.title = this.i18n.CAMERA_TITLE || 'Camera injection';
        }
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        toolbar.appendChild(this.toolbarBtn);

        // if we are using safari, we disable camera since it sends its stream on h264 which is not currently supported
        if (adapterjs.default.browserDetails.browser === 'safari') {
            this.toolbarBtn.className += ' gm-disabled-widget-pop-up';
            this.toolbarBtnImage.className += ' gm-disabled-widget-icon';
        } else {
            // TODO remove ? from this.instance.mediaManager?.toggleVideoStreaming and refacto to avoid error
            this.toolbarBtn.onclick = this.instance.mediaManager?.toggleVideoStreaming;
        }
    }
};
