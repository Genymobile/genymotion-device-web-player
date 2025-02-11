'use strict';

const RESOLUTIONS = [
    {text: '-', value: '0'},
    {text: '240p', value: '240'},
    {text: '360p', value: '360'},
    {text: '480p', value: '480'},
    {text: '720p', value: '720'},
    {text: '1080p', value: '1080'},
];

/**
 * Stream resolution plugin.
 * Provides video stream resolution control.
 */
module.exports = class StreamResolution {
    static get name() {
        return 'StreamResolution';
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
        this.instance.StreamResolution = this;
        this.i18n = i18n || {};

        // Display widget
        this.registerToolbarButton();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-streamres-button',
            title: this.i18n.STREAMRES_TITLE || 'Quality',
            onClick: (event) => {
                if (event.target.tagName === 'OPTION') {
                    return;
                }
                let select = event.target.querySelector('select');
                if (!select) {
                    // draw the select
                    select = document.createElement('select');
                    select.className = 'gm-icon-button gm-streamres-button';
                    select.title = this.i18n.STREAMRES_TITLE || 'Quality';
                    RESOLUTIONS.forEach((resolution) => {
                        select.add(new Option(resolution.text, resolution.value));
                    });
                    select.onchange = () => {
                        const json = {type: 'SIZE', width: Number(select.value)};
                        this.instance.sendEvent(json);
                        select.blur();
                    };

                    event.target.appendChild(select);
                }
            },
        });
    }
};
