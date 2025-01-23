'use strict';
const log = require('loglevel');

class ToolbarManager {
    /**
     * Initialize ToolbarManager
     * @param {Object} instance - The main application instance.
     */
    constructor(instance) {
        this.instance = instance;
        this.toolbar = document.querySelector('.gm-toolbar ul');

        if (!this.toolbar) {
            log.error('Toolbar container not found.');
            return;
        }

        this.buttonRegistry = new Map(); // Registry for button definitions
        this.renderedButtons = new Map(); // Track rendered buttons by ID
    }

    /**
     * Register a button definition in the registry.
     * @param {Object} options - Button options.
     */
    registerButton({
        id,
        iconClass,
        title = '',
        onClick = null,
        onMousedown = null,
        onMouseup = null,
        dataAttributes = {},
        isDisabled = false,
    }) {
        if (this.buttonRegistry.has(id)) {
            log.warn(`Button with ID "${id}" is already registered.`);
            return;
        }

        this.buttonRegistry.set(id, {iconClass, title, onClick, onMousedown, onMouseup, dataAttributes, isDisabled});
    }

    /**
     * Render a registered button into the toolbar.
     * @param {string} id - The ID of the button to render.
     */
    renderButton(id) {
        if (!this.buttonRegistry.has(id)) {
            log.warn(`No button registered with ID "${id}".`);
            return;
        }

        if (this.renderedButtons.has(id)) {
            log.warn(`Button with ID "${id}" is already rendered.`);
            return;
        }

        const {iconClass, title, onClick, onMousedown, onMouseup, dataAttributes, isDisabled} =
            this.buttonRegistry.get(id);

        const button = document.createElement('li');
        const buttonIcon = document.createElement('div');

        buttonIcon.className = `gm-icon-button ${iconClass}`;
        buttonIcon.title = title;

        for (const [key, value] of Object.entries(dataAttributes)) {
            buttonIcon.setAttribute(`data-${key}`, value);
        }

        button.appendChild(buttonIcon);
        this.toolbar.appendChild(button);
        if (!isDisabled) {
            if (onClick) {
                button.onclick = onClick;
            }
            if (onMousedown) {
                button.onmousedown = onMousedown;
            }
            if (onMouseup) {
                button.onmouseup = onMouseup;
            }
        } else {
            button.classList.add('gm-disabled-widget-pop-up');
            buttonIcon.classList.add('gm-disabled-widget-icon');
        }

        this.renderedButtons.set(id, {button, buttonIcon, onClick, onMousedown, onMouseup});
    }

    renderSeparator() {
        const separator = document.createElement('li');
        separator.className = 'gm-separator';
        this.toolbar.appendChild(separator);
    }

    /**
     * Disable a button by updating its state and UI.
     * @param {string} id - The ID of the button to disable.
     */
    disableButton(id) {
        // Update the registry
        if (this.buttonRegistry.has(id)) {
            const buttonData = this.buttonRegistry.get(id);
            buttonData.isDisabled = true;

            // Update the rendered button if it exists
            if (this.renderedButtons.has(id)) {
                const {button, buttonIcon} = this.renderedButtons.get(id);

                button.classList.add('gm-disabled-widget-pop-up');
                buttonIcon.classList.add('gm-disabled-widget-icon');

                /*
                 * Calculate location of the button to display the pop-up next
                 * and update the CSS variable.
                 * This trick is used to position the pop-up next to the button in the toolbar which has an overflow.
                 */
                const rect = button.getBoundingClientRect();
                const x = parseFloat(rect.width) + 20;
                button.style.setProperty('--gm-working-disabled-widget-pop-up-x', x + 'px');

                button.onclick = null;
                button.onmousedown = null;
                button.onmouseup = null;
            }
        } else {
            log.warn(`No button registered with ID "${id}".`);
        }
    }

    /**
     * Enable a button by updating its state and UI.
     * @param {string} id - The ID of the button to enable.
     */
    enableButton(id) {
        // Update the registry
        if (this.buttonRegistry.has(id)) {
            const buttonData = this.buttonRegistry.get(id);
            buttonData.isDisabled = false;

            // Update the rendered button if it exists
            if (this.renderedButtons.has(id)) {
                const {button, buttonIcon, onClick, onMousedown, onMouseup} = this.renderedButtons.get(id);

                button.classList.remove('gm-disabled-widget-pop-up');
                buttonIcon.classList.remove('gm-disabled-widget-icon');

                button.onclick = onClick;
                button.onmousedown = onMousedown;
                button.onmouseup = onMouseup;
            }
        } else {
            log.warn(`No button registered with ID "${id}".`);
        }
    }
    /**
     * @param {string} id - The ID of the button to remove.
     * @param {string} newClass - The class to add to the button.
     */
    addButtonClass(id, newClass) {
        const buttonData = this.renderedButtons.get(id);
        if (!buttonData) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        const {buttonIcon} = buttonData;
        buttonIcon.classList.add(newClass);
    }

    /**
     * @param {string} id - The ID of the button to remove.
     * @param {string} oldClass - The class
     */
    removeButtonClass(id, oldClass) {
        const buttonData = this.renderedButtons.get(id);
        if (!buttonData) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        const {buttonIcon} = buttonData;
        buttonIcon.classList.remove(oldClass);
    }
}

module.exports = ToolbarManager;
