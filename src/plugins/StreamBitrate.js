'use strict';

/**
 * Stream bitrate plugin.
 * Provides video stream quality (audio and video bitrates) control.
 */
module.exports = class StreamBitrate {
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
        const button = document.createElement('li');
        this.chooser = document.createElement('div');
        this.chooser.className = '.gm-streamrate-chooser gm-icon-button gm-streamrate-button';
        this.chooser.title = this.i18n.STREAMRATE_TITLE || 'High quality';
        button.appendChild(this.chooser);
        toolbar.appendChild(button);
        this.chooser.onclick = () => {
            this.highQuality = !this.highQuality;
            this.chooser.classList.toggle('gm-active');
            if (this.highQuality) {
                const json = {type: 'BITRATE', videoBitrate: 5000, audioBitrate: 192000};
                this.instance.sendEvent(json);
                this.instance.renegotiateWebRTCConnection();
            } else {
                // if we pass 0 here, we just use WebRTC default value
                const json = {type: 'BITRATE', videoBitrate: 0, audioBitrate: 0};
                this.instance.sendEvent(json);
                this.instance.renegotiateWebRTCConnection();
            }
        };
    }
};
