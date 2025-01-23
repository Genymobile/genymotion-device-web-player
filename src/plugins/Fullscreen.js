'use strict';

/**
 * Display fullscreen plugin.
 * Gives the ability to display the renderer on the whole screen.
 */
module.exports = class Fullscreen {
    static get name() {
        return 'Fullscreen';
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
        this.i18n = i18n || {};

        // we register for fullscreen event changes
        this.instance.addListener(document, 'webkitfullscreenchange', this.onFullscreenEvent.bind(this), false);
        this.instance.addListener(document, 'fullscreenchange', this.onFullscreenEvent.bind(this), false);

        this.instance.apiManager.registerFunction({
            name: 'fullscreen',
            category: 'video',
            fn: () => {
                if (this.fullscreenEnabled()) {
                    this.exitFullscreen();
                } else {
                    this.goFullscreen(this.instance.root);
                }
            },
            description:
                // eslint-disable-next-line max-len
                'Toggle fullscreen mode for the video player. If the player is currently in fullscreen, it will exit fullscreen; otherwise, it will enter fullscreen mode.',
        });
        // Display widget
        this.registerToolbarButton();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-fullscreen-button',
            title: this.i18n.FULLSCREEN || 'Fullscreen',
            onClick: () => {
                if (this.fullscreenEnabled()) {
                    this.exitFullscreen();
                } else {
                    this.goFullscreen(this.instance.root);
                }
            },
        });
    }

    /**
     * Enter fullscreen mode.
     *
     * @param {HTMLElement} element DOM element to set fullscreen on.
     */
    goFullscreen(element) {
        this.instance.wrapper.classList.add('gm-fullscreen');
        this.instance.toolbarManager.addButtonClass(this.constructor.name, 'gm-active');
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        }
    }

    /**
     * Determine whether fullscreen mode is active or not.
     *
     * @return {boolean} Whether fullscreen mode is active or not.
     */
    fullscreenEnabled() {
        return document.fullscreenElement || document.webkitFullscreenElement;
    }

    /**
     * Exit fullscreen mode.
     */
    exitFullscreen() {
        this.instance.wrapper.classList.remove('gm-fullscreen');
        this.instance.toolbarManager.removeButtonClass(this.constructor.name, 'gm-active');
        if (!this.fullscreenEnabled()) {
            return; // do not try to remove fulllscreen if it is not active
        }
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }

    /**
     * Fullscreen event listener.
     */
    onFullscreenEvent() {
        // if we lose fullscreen, we have to make sure that it has correctly exited
        if (!this.fullscreenEnabled()) {
            this.exitFullscreen();
        }
    }
};
