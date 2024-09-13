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
     */
    constructor(instance) {
        // Reference instance
        this.instance = instance;

        // we register for fullscreen event changes
        if (document.addEventListener) {
            this.instance.addListener(document, 'webkitfullscreenchange', this.onFullscreenEvent.bind(this), false);
            this.instance.addListener(document, 'fullscreenchange', this.onFullscreenEvent.bind(this), false);
        }

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

        if (this.isTemplateFullscreen()) {
            /**
             * If the template is fullscreen, there is a splash screen that ask the user
             * to allow the fullscreen. It is needed due to HTML5 requirements.
             */
            const fullscreenMessage = this.instance.getChildByClass(this.instance.root, 'gm-fullscreen-message');
            fullscreenMessage.onclick = () => {
                fullscreenMessage.classList.add('hide');
                this.instance.wrapper.classList.remove('hide');
                this.goFullscreen(this.instance.root);
            };
        } else {
            /**
             * Else we add a button that will allows the user to set/unset the
             * fullscreen for the given genycloud instance
             */
            this.button = document.createElement('li');
            this.image = document.createElement('div');
            this.image.className = 'gm-icon-button gm-fullscreen-button';
            this.image.title = 'Fullscreen';
            this.button.appendChild(this.image);
            toolbar.appendChild(this.button);

            // when clicked on the button, should we enter or exit fullscreen
            this.button.onclick = () => {
                if (this.fullscreenEnabled()) {
                    this.exitFullscreen();
                } else {
                    this.goFullscreen(this.instance.root);
                }
            };
        }
    }

    /**
     * Enter fullscreen mode.
     *
     * @param {HTMLElement} element DOM element to set fullscreen on.
     */
    goFullscreen(element) {
        this.instance.wrapper.classList.add('gm-fullscreen');
        this.image.classList.add('gm-active');
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
        this.image.classList.remove('gm-active');
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
     * Determine whether the template is configured to be displayed in fullscreen or not.
     *
     * @return {boolean} Whether the template is configured to be displayed in fullscreen or not.
     */
    isTemplateFullscreen() {
        return Boolean(this.instance.getChildByClass(this.instance.root, 'gm-fullscreen-message'));
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
