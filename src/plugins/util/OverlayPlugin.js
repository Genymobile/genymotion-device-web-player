'use strict';

/**
 * OverlayPlugin
 * Extendable utility to auto-bind and handle genymotion 'closeOverlays' event.
 * Expects implementer to provide list of overlays
 */
module.exports = class OverlayPlugin {
    /**
     * Plugin initialization
     * @param {Object} instance Genymotion player instance
     */
    constructor(instance) {
        this.overlays = [];
        this.savedState = null;
        this.toolbarBtnImage = null;
        this.instance = instance;

        // Listen for close trigger
        this.instance.registerEventCallback('close-overlays', this.closeOverlays.bind(this));
    }

    /**
     * Closes all active overlays and updates toolbar button state
     */
    closeOverlays() {
        this.overlays.forEach((overlay) => {
            if (overlay && !overlay.classList.contains('gm-hidden')) {
                overlay.classList.add('gm-hidden');
                if (overlay.onclose) {
                    overlay.onclose();
                }
            }
        });

        this.instance.emit('keyboard-enable');

        if (this.toolbarBtnImage) {
            this.toolbarBtnImage.classList.remove('gm-active');
        }
    }

    /**
     * Save current button state (icon & click action)
     */
    saveState() {
        if (!this.savedState) {
            this.savedState = {
                toolbarBtn: {
                    className: this.toolbarBtn.className,
                    onclick: this.toolbarBtn.onclick,
                },
                toolbarBtnImage: {
                    className: this.toolbarBtnImage.className,
                },
            };
        }
    }

    /**
     * Re-apply the saved toolbar button state.
     */
    restoreState() {
        if (this.savedState) {
            this.toolbarBtn.className = this.savedState.toolbarBtn.className;
            this.toolbarBtnImage.className = this.savedState.toolbarBtnImage.className;
            this.toolbarBtn.onclick = this.savedState.toolbarBtn.onclick;

            this.savedState = null;
        }
    }

    /**
     * Disable associated toolbar icon.
     */
    disable() {
        if (this.toolbarBtn && this.toolbarBtnImage) {
            this.saveState();

            this.toolbarBtn.className += ' gm-disabled-widget-pop-up';
            this.toolbarBtnImage.className += ' gm-disabled-widget-icon';
            this.toolbarBtn.onclick = null;
        }
    }

    /**
     * Enable associated toolbar icon.
     */
    enable() {
        if (this.toolbarBtn && this.toolbarBtnImage) {
            this.restoreState();
        }
    }
};
