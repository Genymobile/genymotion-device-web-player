'use strict';
const {generateUID} = require('../../utils/helpers');

/**
 * Base class for overlay widget management with drag-and-drop and positioning capabilities
 */
const OVERLAY_DEFAULT_HEIGHT = 100;
const OVERLAY_DEFAULT_WIDTH = 200;
const OVERLAY_BORDER_MARGIN = 10;

class OverlayPlugin {
    /**
     * Initialize overlay plugin instance
     * @param {Object} instance - Parent device renderer instance
     */
    constructor(instance) {
        // Core instance properties
        this.instance = instance;
        this.overlayID = this.constructor.name || generateUID();

        // Modal state management
        this.widget = null;
        this.position = {
            x: null,
            y: null,
        };

        this.initializeEventListeners();
    }

    /*
     * --------------------------
     * Event Management Section
     * --------------------------
     */

    /**
     * Sets up all required event listeners
     */
    initializeEventListeners() {
        this.subscribeToOverlayStateChanges();
        this.setupGlobalClickHandler();
    }

    /**
     * Subscribes to overlay state changes in the store
     */
    subscribeToOverlayStateChanges() {
        this.instance.store.subscribe(
            ({overlay}, {overlay: previousOverlay}) => {
                const isOpening =
                    overlay.widgetsOpened.includes(this.overlayID) &&
                    !previousOverlay.widgetsOpened.includes(this.overlayID);

                const isClosing =
                    !overlay.widgetsOpened.includes(this.overlayID) &&
                    previousOverlay.widgetsOpened.includes(this.overlayID);

                if (isOpening) {
                    this.openOverlay();
                } else if (isClosing) {
                    if (overlay.widgetsOpened.length === 0) {
                        OverlayPlugin.modalZIndex = 100;
                    }
                    if (this.widget) {
                        this.widget.style.zIndex = 10;
                    }
                    this.closeOverlay();
                }
            },
            ['overlay.widgetsOpened'],
        );
    }

    /**
     * Sets up global click handler for overlay dismissal
     */
    setupGlobalClickHandler() {
        if (!OverlayPlugin.hasBeenCalled) {
            this.instance.addListener(document, 'click', this.handleClickOutsideOverlay.bind(this));
            this.instance.addListener(window, 'resize', () => {
                if (this.instance.store.state.overlay.isOpen) {
                    this.closeAllOverlays();
                }
            });
            OverlayPlugin.hasBeenCalled = true;
        }
    }

    /*
     * --------------------------
     * Modal Lifecycle Section
     * --------------------------
     */

    /**
     * @param {Object} [options={}] - Modal configuration options.
     * @param {string|null} [options.title=null] - The title of the modal.
     * @param {string} [options.classes=''] - Additional CSS classes for the modal.
     * @param {number|null} [options.width=null] - The width of the modal in pixels.
     * @param {number|null} [options.height=null] - The height of the modal in pixels.
     *
     * @returns {{ modal: HTMLElement, container: HTMLElement }} The modal elements.
     * @returns {HTMLElement} modal - The main modal element.
     * @returns {HTMLElement} container - The modal body container.
     */
    createTemplateModal(options = {}) {
        const {title = null, classes = '', width = null, height = null} = options;

        const modalElement = this.createModalElement(classes, width, height);
        const modalBody = this.createModalBody();
        const modalHeader = this.createModalHeader(title);

        modalElement.appendChild(modalHeader);
        modalElement.appendChild(modalBody);

        this.initializeModalBehavior(modalElement, modalHeader);
        return {modal: modalElement, container: modalBody};
    }

    /**
     * Creates modal header element with title and close button
     * @param {?string} title - Header title content
     * @returns {HTMLElement} Configured header element
     */
    createModalHeader(title) {
        const header = document.createElement('div');
        header.className = 'gm-modal-header';

        // Create container for title and close button
        const headerContent = document.createElement('div');
        headerContent.className = 'gm-modal-header-content';

        const titleElement = document.createElement('div');
        titleElement.className = 'gm-modal-title';
        titleElement.innerHTML = title || '';
        headerContent.appendChild(titleElement);

        const closeButton = this.createCloseButton();
        headerContent.appendChild(closeButton);

        // Add header content to header
        header.appendChild(headerContent);

        // Add separator
        const separator = document.createElement('div');
        separator.className = 'gm-separator';
        header.appendChild(separator);

        return header;
    }

    /**
     * Creates modal close button element
     * @returns {HTMLElement} Configured close button
     */
    createCloseButton() {
        const button = document.createElement('div');
        button.className = 'gm-modal-close-btn';
        button.onclick = this.toggleWidget.bind(this);
        return button;
    }

    /**
     * Creates base modal body container
     * @returns {HTMLElement} Modal body element
     */
    createModalBody() {
        const body = document.createElement('div');
        body.className = 'gm-modal-body';
        return body;
    }

    /**
     * Creates base modal element structure
     * @param {string} classes - Additional CSS classes
     * @param {?number} width - Modal width in pixels
     * @param {?number} height - Modal height in pixels
     * @returns {HTMLElement} Configured modal element
     */
    createModalElement(classes, width, height) {
        const modal = document.createElement('div');
        modal.className = `gm-modal gm-hidden ${classes}`;

        if (width) {
            modal.style.width = `${width}px`;
        }
        if (height) {
            modal.style.height = `${height}px`;
        }

        return modal;
    }

    /**
     * Initializes dragging and positioning for the modal
     * @param {HTMLElement} modal - Modal element
     * @param {HTMLElement} header - Modal header element (drag handle)
     */
    initializeModalBehavior(modal, header) {
        this.widget = modal;
        this.instance.root.appendChild(modal);
        this.enableDragBehavior(modal, header);
    }

    /*
     * --------------------------
     * Drag & Drop Section
     * --------------------------
     */

    /**
     * Enables drag-and-drop functionality for the modal
     * @param {HTMLElement} modal - Modal element to make draggable
     * @param {HTMLElement} dragHandle - Element that will trigger dragging
     */
    enableDragBehavior(modal, dragHandle) {
        let isDragging = false;
        dragHandle.style.cursor = 'move';

        this.instance.addListener(dragHandle, 'mousedown', (event) => {
            isDragging = true;
            let hasToResetPosition = false;
            const {x: initialX, y: initialY} = this.startDragging(modal);

            const offsetX = event.clientX - modal.offsetLeft;
            const offsetY = event.clientY - modal.offsetTop;
            const wrapperRect = this.instance.wrapper.getBoundingClientRect();
            const wrapperVideoRect = this.instance.playerScreenWrapper.getBoundingClientRect();
            const marginTopAndBottom = this.instance.playerScreenWrapper.offsetTop * 2; // Because video is centered

            const removeMouseMoveListener = this.instance.addListener(document, 'mousemove', (e) => {
                if (!isDragging) {
                    return;
                }

                requestAnimationFrame(() => {
                    let newX = e.clientX - offsetX;
                    let newY = e.clientY - offsetY;
                    hasToResetPosition = false;

                    const modalWidth = modal.offsetWidth;
                    const modalHeight = modal.offsetHeight;

                    // Constrain x and y to be within the wrapper's bounds
                    newX = Math.max(
                        wrapperVideoRect.left - wrapperRect.left,
                        Math.min(wrapperVideoRect.right - wrapperRect.left - modalWidth, newX),
                    );
                    newY = Math.max(
                        0,
                        Math.min(
                            wrapperVideoRect.bottom - modalHeight - wrapperVideoRect.top + marginTopAndBottom,
                            newY,
                        ),
                    );

                    // Magnetic grid (snap to initial position if close)
                    if (Math.abs(initialX - newX) < 30 && Math.abs(initialY - newY) < 30) {
                        newX = initialX;
                        newY = initialY;
                        hasToResetPosition = true;
                    }

                    modal.style.left = `${newX}px`;
                    modal.style.top = `${newY}px`;
                });
            });

            const removeMouseUpListener = this.instance.addListener(document, 'mouseup', () => {
                modal.style.userSelect = 'initial';
                isDragging = false;
                if (hasToResetPosition) {
                    this.position.x = null;
                    this.position.y = null;
                } else {
                    this.position.x = parseInt(modal.style.left.replace('px', ''));
                    this.position.y = parseInt(modal.style.top.replace('px', ''));
                }

                removeMouseMoveListener();
                removeMouseUpListener();
            });
        });
    }

    /**
     * Handles drag start initialization
     * @param {HTMLElement} modal - Modal element
     * @returns {Object} Initial x/y coordinates
     */
    startDragging(modal) {
        const {button: toolbarButton} = this.instance.toolbarManager.getButtonById(this.constructor.name);
        const initialPosition = this.calculateModalPosition(toolbarButton, this.instance.options.toolbarPosition);

        modal.style.position = 'absolute';
        modal.style.zIndex = ++OverlayPlugin.modalZIndex;
        modal.style.userSelect = 'none';
        return initialPosition;
    }

    /*
     * --------------------------
     * Positioning & Rendering Section
     * --------------------------
     */

    // CheckModalPositionOutsideVideoWrapper generated by ai
    /**
     * Checks if modal is within video wrapper bounds
     * @returns {boolean} True if modal is outside video wrapper bounds, false otherwise
     */
    checkModalPositionOutsideVideoWrapper() {
        const videoWrapperRect = this.instance.playerScreenWrapper.getBoundingClientRect();
        const modalRect = this.widget.getBoundingClientRect();
        // modal can be set outside by CSS, so if position is saved we take this position
        const calcModalRect = {
            right: modalRect.right,
            bottom: modalRect.bottom,
        };
        if (this.position.x !== null) {
            calcModalRect.left = this.position.x;
            calcModalRect.right = this.position.x + modalRect.width;
        }
        if (this.position.y !== null) {
            calcModalRect.top = this.position.y;
            calcModalRect.bottom = this.position.y + modalRect.height;
        }

        // Check if modal is outside video wrapper bounds
        if (
            calcModalRect.right > videoWrapperRect.width ||
            calcModalRect.bottom > videoWrapperRect.height
        ) {
            return true;
        }
        return false;
    }

    /**
     * Calculates optimal position for modal display
     * @param {HTMLElement} triggerElement - Element that triggered the modal
     * @param {string} toolbarPosition - Toolbar position ('left', 'right')
     * @returns {Object} Calculated x/y coordinates
     */
    calculateModalPosition(triggerElement, toolbarPosition) {
        const triggerRect = triggerElement.getBoundingClientRect();
        const modalWidth = this.widget.offsetWidth || OVERLAY_DEFAULT_HEIGHT;
        const modalHeight = this.widget.offsetHeight || OVERLAY_DEFAULT_WIDTH;
        const wrapperRect = this.instance.wrapper.getBoundingClientRect();
        const wrapperVideoRect = this.instance.playerScreenWrapper.getBoundingClientRect();
        const marginTopAndBottom =
            modalHeight + triggerRect.top > wrapperVideoRect.bottom
                ? this.instance.playerScreenWrapper.offsetTop * 2
                : this.instance.playerScreenWrapper.offsetTop;

        let x = 0,
            y = 0;

        switch (toolbarPosition) {
            case 'left':
                x = wrapperVideoRect.left - wrapperRect.left + OVERLAY_BORDER_MARGIN;
                y = triggerRect.top - wrapperVideoRect.top + marginTopAndBottom;

                // Adjust for vertical overflow
                if (triggerRect.top + modalHeight > wrapperVideoRect.bottom) {
                    y = Math.max(
                        0,
                        Math.min(
                            wrapperVideoRect.bottom -
                                modalHeight -
                                wrapperVideoRect.top +
                                marginTopAndBottom -
                                OVERLAY_BORDER_MARGIN,
                            y,
                        ),
                    );
                }
                break;
            case 'right':
            default:
                x = wrapperVideoRect.width - modalWidth - OVERLAY_BORDER_MARGIN;
                y = triggerRect.top - wrapperVideoRect.top + marginTopAndBottom;

                // Adjust for vertical overflow
                if (triggerRect.top + modalHeight > wrapperVideoRect.bottom) {
                    y = Math.max(
                        0,
                        Math.min(
                            wrapperVideoRect.bottom -
                                modalHeight -
                                wrapperVideoRect.top +
                                marginTopAndBottom -
                                OVERLAY_BORDER_MARGIN,
                            y,
                        ),
                    );
                }
                break;
        }

        return {x, y};
    }

    /*
     * --------------------------
     * Event Handlers Section
     * --------------------------
     */

    /**
     * Handles clicks outside modal content to close active overlay
     * @param {MouseEvent} event - Native click event
     */
    handleClickOutsideOverlay(event) {
        const isValidClickTarget =
            !event.target.closest('.gm-modal') &&
            !event.target.closest('video') &&
            !event.target.closest('.gm-toolbar') &&
            !event.target.classList.contains('gm-dont-close') &&
            !event.target.closest('.gm-floating-toolbar');

        if (isValidClickTarget && this.instance.store.state.overlay.isOpen) {
            this.instance.store.dispatch({
                type: 'OVERLAY_OPEN',
                payload: {toOpen: false},
            });
        }
    }

    /*
     * --------------------------
     * State Management Section
     * --------------------------
     */

    /**
     * Handles overlay open state
     * private method, trigger the store action to open the overlay instead of calling this method directly
     */
    openOverlay() {
        const {button: toolbarButton} = this.instance.toolbarManager.getButtonById(this.constructor.name);
        const isModalOutsideVideoWrapper = this.checkModalPositionOutsideVideoWrapper();

        if (isModalOutsideVideoWrapper) {
            this.position.x = null;
            this.position.y = null;
        }
        const useSavedPosition = this.position.x !== null && this.position.y !== null;

        const position = useSavedPosition
            ? this.position
            : this.calculateModalPosition(toolbarButton, this.instance.options.toolbarPosition);

        this.applyModalPosition(position);
        this.instance.toolbarManager.setButtonActive(this.constructor.name, true);
        this.widget.style.zIndex = ++OverlayPlugin.modalZIndex;

        // Dispatch tracked event
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
     * Closes overlay and updates toolbar button state.
     * private method, trigger the store action to close the overlay instead of calling this method directly
     */
    closeOverlay() {
        if (this.widget && this.widget.classList.contains('gm-visible')) {
            this.widget.classList.add('gm-hidden');
            this.widget.classList.remove('gm-visible');
            if (this.widget.onclose) {
                this.widget.onclose();
            }
        }
        this.instance.toolbarManager.setButtonActive(this.constructor.name, false);
    }

    /**
     * Closes all widgets
     */
    closeAllOverlays() {
        this.instance.store.dispatch({
            type: 'OVERLAY_OPEN',
            payload: {toOpen: false},
        });
    }

    /**
     * Applies calculated position to modal element
     * @param {Object} position - x/y coordinates
     */
    applyModalPosition(position) {
        this.widget.style.left = `${position.x}px`;
        this.widget.style.top = `${position.y}px`;
        this.widget.classList.add('gm-visible');
        this.widget.classList.remove('gm-hidden');
    }

    /**
     * Toggle widget visibility.
     */
    toggleWidget() {
        this.instance.store.dispatch({
            type: 'OVERLAY_OPEN',
            payload: {
                overlayID: this.overlayID,
            },
        });
    }

    /**
     * open the widget
     * Exposed method, openOverlay is a private method
     */
    openWidget() {
        this.instance.store.dispatch({
            type: 'OVERLAY_OPEN',
            payload: {
                overlayID: this.overlayID,
                toOpen: true,
            },
        });
    }

    /**
     * close the widget
     * Exposed method, closeOverlay is a private method
     */
    closeWidget() {
        this.instance.store.dispatch({
            type: 'OVERLAY_OPEN',
            payload: {
                overlayID: this.overlayID,
                toOpen: false,
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
     * Sets the title of the modal.
     * @param {string} title - The title to set.
     */
    setTitle(title) {
        this.widget.querySelector('.gm-modal-title').innerHTML = title;
    }
}

// Static properties for shared state management
OverlayPlugin.hasBeenCalled = false; // Singleton check for global listeners
OverlayPlugin.modalZIndex = 100; // Z-index management for modal stacking

module.exports = OverlayPlugin;
