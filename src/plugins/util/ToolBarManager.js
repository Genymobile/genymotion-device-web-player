'use strict';
const log = require('loglevel');
class ToolbarManager {
    /**
     * Initialize ToolbarManager
     * @param {Object} instance - The instance to be managed.
     */
    constructor(instance) {
        this.instance = instance;
        this.toolbar = document.querySelector('.gm-toolbar ul');
        this.floatingToolbar = document.querySelector('.gm-floating-toolbar ul');

        if (!this.toolbar) {
            log.error('Toolbar container not found.');
            return;
        }
        if (this.instance.options.floatingToolbar && !this.floatingToolbar) {
            log.error('Floating toolbar container not found.');
            return;
        }

        this.buttonRegistry = new Map(); // Store registered buttons
    }

    /**
     * Register a button definition.
     * @param {Object} options - Button options.
     * @returns {Object} Control functions for the button.
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
            return null;
        }

        // Create HTML element
        const button = document.createElement('li');
        const buttonIcon = document.createElement('div');
        buttonIcon.className = `gm-icon-button ${iconClass}`;
        buttonIcon.title = title;
        for (const [key, value] of Object.entries(dataAttributes)) {
            buttonIcon.setAttribute(`data-${key}`, value);
        }
        button.appendChild(buttonIcon);

        if (onClick) {
            button.onclick = onClick;
        }
        if (onMousedown) {
            button.onmousedown = onMousedown;
        }
        if (onMouseup) {
            button.onmouseup = onMouseup;
        }

        // Store the button definition and elements in the registry
        this.buttonRegistry.set(id, {
            iconClass,
            title,
            onClick,
            onMousedown,
            onMouseup,
            dataAttributes,
            isDisabled,
            button,
            buttonIcon
        });

        // Return control functions for future manipulation
        return {
            disable: () => this.disableButton(id),
            enable: () => this.enableButton(id),
            addClass: (className) => this.addButtonClass(id, className),
            removeClass: (className) => this.removeButtonClass(id, className),
            setActive: (isActive = true) => this.setButtonActive(id, isActive),
            setIndicator: (typeOfIndicator) => this.setButtonIndicator(id, typeOfIndicator),
            getIndicator: () => this.getButtonIndicator(id),
            htmlElement: button
        };
    }

    /**
     * Render a registered button in the toolbar.
     * @param {string} id - The ID of the button to render.
     * @param {boolean} isInfloatingBar - Whether the button is in a floating toolbar.
     */
    renderButton(id, isInfloatingBar = false) {
        if (!this.buttonRegistry.has(id)) {
            log.warn(`No button registered with ID "${id}".`);
            return;
        }

        const buttonData = this.buttonRegistry.get(id);
        const {button} = buttonData;

        // Adding HTML element to the DOM
        if (isInfloatingBar) {
            this.floatingToolbar.appendChild(button);
        } else {
            this.toolbar.appendChild(button);
        }

        // Update registry with isInfloatingBar
        this.buttonRegistry.set(id, {
            ...buttonData,
            isInfloatingBar,
        });
    }

    /**
     * Disable a button by ID.
     * @param {string} id - The ID of the button.
     */
    disableButton(id) {
        const buttonData = this.buttonRegistry.get(id);
        if (!buttonData) {
            log.error(`No registred button found with ID "${id}".`);
            return;
        }

        buttonData.isDisabled = true;

        if (!buttonData.button) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        const {button, buttonIcon} = buttonData;
        this.instance.tooltipManager.setTooltip(
            button,
            this.instance.options.i18n.NOT_SUPPORTED || 'Not currently supported',
            this.instance.options.toolbarPosition === 'right' ? 'left':'right'
        );
        buttonIcon.classList.add('gm-disabled-icon-button');

        button.onclick = null;
        button.onmousedown = null;
        button.onmouseup = null;
    }

    /**
     * Enable a button by ID.
     * @param {string} id - The ID of the button.
     */
    enableButton(id) {
        const buttonData = this.buttonRegistry.get(id);
        if (!buttonData) {
            log.error(`No registred button found with ID "${id}".`);
            return;
        }

        buttonData.isDisabled = false;

        if (!buttonData.button) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        const {button, buttonIcon, onClick, onMousedown, onMouseup} = buttonData;

        this.instance.tooltipManager.removeTooltip(button);

        buttonIcon.classList.remove('gm-disabled-icon-button');

        if (onClick) {
            button.onclick = onClick;
        }
        if (onMousedown) {
            button.onmousedown = onMousedown;
        }
        if (onMouseup) {
            button.onmouseup = onMouseup;
        }
    }

    /**
     * Add a class to the button.
     * @param {string} id - The ID of the button.
     * @param {string} className - The class to add.
     */
    addButtonClass(id, className) {
        const buttonData = this.buttonRegistry.get(id);
        if (!buttonData || !buttonData.buttonIcon) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        buttonData.buttonIcon.classList.add(className);
    }

    /**
     * Remove a class from the button.
     * @param {string} id - The ID of the button.
     * @param {string} className - The class to remove.
     */
    removeButtonClass(id, className) {
        const buttonData = this.buttonRegistry.get(id);
        if (!buttonData || !buttonData.buttonIcon) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        buttonData.buttonIcon.classList.remove(className);
    }

    /**
     * setButtonActive - Set a button as active.
     * @param {string} id - The ID of the button.
     * @param {boolean} isActive - Whether the button is active.
     */
    setButtonActive(id, isActive) {
        const buttonData = this.buttonRegistry.get(id);
        if (!buttonData || !buttonData.button) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        if (isActive) {
            buttonData.buttonIcon.classList.add('gm-active');
        } else {
            buttonData.buttonIcon.classList.remove('gm-active');
        }
    }

    /**
     * setButtonIndicator - Set an indicator on a button.
     * @param {string} id - The ID of the button.
     * @param {string} typeOfIndicator - The type of indicator to set. Values: 'active', 'notification'. '' to remove the indicator.
     */
    setButtonIndicator(id, typeOfIndicator) {
        const buttonData = this.buttonRegistry.get(id);

        if (!buttonData) {
            log.error(`No registred button found with ID "${id}".`);
            return;
        }

        buttonData.indicator = typeOfIndicator;

        // button registred but nor rendered yet
        if (!buttonData.button) {
            log.warn(`No rendered button found with ID "${id}".`);
            return;
        }

        // erase all class starting with gm-toolbar-dot-
        buttonData.button.className = [...buttonData.button.classList]
            .filter((cls) => !cls.startsWith('gm-toolbar-dot-'))
            .join(' ');

        if (typeOfIndicator && typeOfIndicator.length) {
            buttonData.button.classList.add('gm-toolbar-dot-' + typeOfIndicator);
        }
    }

    /**
     * Gets the current indicator value for a specific button
     * @param {string} id - The unique identifier of the button
     * @returns {string} The current indicator value of the button, or an empty string if the button doesn't exist or has no indicator
     */
    getButtonIndicator(id) {
        if (this.buttonRegistry.has(id)) {
            return this.buttonRegistry.get(id).indicator ?? '';
        }
        return '';
    }
    /**
     * Retrieves a button from the registry by its ID.
     *
     * @param {string} id - The unique identifier of the button.
     * @returns {Object|undefined} The button object if found, otherwise undefined.
     */
    getButtonById(id) {
        return this.buttonRegistry.get(id);
    }

    /**
     * Render a separator in the toolbar.
     * @param {boolean} isInfloatingBar - Whether the separator is in a floating toolbar.
     */
    renderSeparator(isInfloatingBar = false) {
        const separator = document.createElement('li');
        if (isInfloatingBar) {
            separator.className = 'gm-v-separator';
            this.floatingToolbar.appendChild(separator);
        } else {
            separator.className = 'gm-separator';
            this.toolbar.appendChild(separator);
        }
    }
}

module.exports = ToolbarManager;
