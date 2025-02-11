'use strict';

/**
 * Stream bitrate plugin.
 * Provides video stream quality (audio and video bitrates) control.
 */
module.exports = class StreamBitrate {
    static get name() {
        return 'StreamBitrate';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     * @param {Object} i18n     Translations keys for the UI.
     */
    constructor(instance, i18n) {
        // Reference instance
        this.instance = instance;

        // Register plugin
        this.instance.StreamBitrate = this;
        this.i18n = i18n || {};

        this.highQuality = false;

        // Display widget
        this.registerToolbarButton();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-streamrate-chooser',
            title: this.i18n.STREAMRATE_TITLE || 'High quality',
            onClick: () => {
                this.highQuality = !this.highQuality;
                if (this.highQuality) {
                    this.toolbarBtn.setActive();

                    const json = {type: 'BITRATE', videoBitrate: 5000, audioBitrate: 192000};
                    this.instance.sendEvent(json);
                    this.instance.renegotiateWebRTCConnection();
                } else {
                    this.toolbarBtn.setActive(false);

                    // if we pass 0 here, we just use WebRTC default value
                    const json = {type: 'BITRATE', videoBitrate: 0, audioBitrate: 0};
                    this.instance.sendEvent(json);
                    this.instance.renegotiateWebRTCConnection();
                }
            },
        });
    }
};
