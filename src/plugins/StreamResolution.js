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
        this.select = document.createElement('select');
        this.select.className = 'gm-icon-button gm-streamres-button';
        this.select.title = this.i18n.STREAMRES_TITLE || 'Quality';
        RESOLUTIONS.forEach((resolution) => {
            this.select.add(new Option(resolution.text, resolution.value));
        });
        this.select.onchange = this.onStreamResolutionChange.bind(this);
        toolbar.appendChild(this.select);
    }

    /**
     * Apply the selected stream resolution.
     */
    onStreamResolutionChange() {
        const json = {type: 'SIZE', width: Number(this.select.value)};
        this.instance.sendEvent(json);
        this.select.blur();
    }
};
