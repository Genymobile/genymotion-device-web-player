'use strict';
const {generateUID} = require('../../utils/helpers');

/**
 * OverlayPlugin
 * Parent for widget (plugin)
 */
class OverlayPlugin {
    /**
     * Plugin initialization
     * @param {Object} instance device renderer instance
     */
    constructor(instance) {
        // widget must be set on child class, it's the dialog element
        this.widget = null;
        this.overlayID = generateUID();
        this.toolbarBtnImage = null;
        this.savedState = null;
        this.instance = instance;

        // Listen for close trigger
        this.instance.store.subscribe(
            ({overlay}) => {
                if (overlay.widgetOpened.includes(this.overlayID)) {
                    this.openOverlay();
                } else {
                    this.closeOverlay();
                }
            },
            ['overlay.widgetOpened'],
        );

        // Attach listener for first object created only
        if (!OverlayPlugin.hasBeenCalled) {
            this.instance.addListener(document, 'click', this.clickHandlerCloseOverlay.bind(this));

            OverlayPlugin.hasBeenCalled = true;
        }
    }

    /**
     * Creates a template modal with a title and additional classes.
     *
     * @param {Object} [options={}] - Options for the modal.
     * @param {string|null} [options.title=null] - The title of the modal. If null, no title will be set.
     * @param {string} [options.classes=''] - Additional classes to add to the modal container.
     * @returns {Object} An object containing the modal and container elements.
     * @returns {HTMLElement} return.modal - The modal element.
     * @returns {HTMLElement} return.container - The container element inside the modal.
     */
    createTemplateModal(options = {}) {
        const {title = null, classes = '', width = null, height = null} = options;
        const divModal = document.createElement('div');
        divModal.className = `gm-modal gm-hidden ${classes}`;
        const divBody = document.createElement('div');
        divBody.className = 'gm-modal-body';

        if (width) {
            divModal.style.width = `${width}px`;
        }
        if (height) {
            divModal.style.height = `${height}px`;
        }

        // Generate title
        const divHeader = document.createElement('div');
        divHeader.className = 'gm-modal-header';
        const divTitle = document.createElement('div');
        divTitle.className = 'gm-modal-title';
        divTitle.innerHTML = title;
        divHeader.appendChild(divTitle);

        // Add close button
        const close = document.createElement('div');
        close.onclick = this.toggleWidget.bind(this);
        close.className = 'gm-modal-close-btn';
        divHeader.appendChild(close);

        divModal.appendChild(divHeader);

        divModal.appendChild(divBody);

        return {
            modal: divModal,
            container: divBody,
        };
    }
    /**
     * Closes overlay and updates toolbar button state
     */
    closeOverlay() {
        if (this.widget && !this.widget.classList.contains('gm-hidden')) {
            this.widget.classList.add('gm-hidden');
            if (this.widget.onclose) {
                this.widget.onclose();
            }
        }
        this.instance.toolbarManager.setActiveButton(this.constructor.name, false);
    }

    openOverlay() {
        if (this.widget && this.widget.classList.contains('gm-hidden')) {
            this.widget.classList.remove('gm-hidden');
        }

        this.instance.toolbarManager.setActiveButton(this.constructor.name, true);
        this.instance.store.dispatch({
            type: 'ADD_TRACKED_EVENT',
            payload: {
                category: 'widget',
                action: 'open',
                name: this.constructor.name,
            },
        });
    }

    /**
     * Disable associated toolbar icon.
     */
    disable() {
        this.instance.toolbarManager.disableButton(this.constructor.name);
    }

    /**
     * Enable associated toolbar icon.
     */
    enable() {
        this.instance.toolbarManager.enableButton(this.constructor.name);
    }

    /**
     * Toggle widget visibility
     */
    toggleWidget() {
        this.instance.store.dispatch({
            type: 'OVERLAY_OPEN',
            payload: {
                overlayID: this.overlayID,
                toOpen: this.widget.classList.contains('gm-hidden'),
            },
        });
    }

    clickHandlerCloseOverlay(event) {
        if (
            // TODO change delete gm-overlay when all widget are migrated
            event.target.closest('.gm-modal') === null &&
            event.target.closest('.gm-overlay') === null &&
            !event.target.classList.contains('gm-icon-button') &&
            !event.target.classList.contains('gm-dont-close') &&
            this.instance.store.state.overlay.isOpen
        ) {
            this.instance.store.dispatch({type: 'OVERLAY_OPEN', payload: {toOpen: false}});
        }
    }
}

OverlayPlugin.hasBeenCalled = false;

module.exports = OverlayPlugin;
