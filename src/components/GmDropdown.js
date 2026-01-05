export class GmDropdown extends HTMLElement {
    #items = [];
    #value = '';
    #hasCheckmark = false;
    #dropdownMaxHeight = null;
    #disabled = false;
    #isOpen = false;

    constructor() {
        super();
    }

    /**
     * Called when custom element is appended to the DOM.
     */
    connectedCallback() {
        // Prevent double rendering
        if (this.querySelector('.dropdown-selected')) {
            return;
        }

        this.#render();
    }

    /**
     * Renders the component structure.
     */
    #render() {
        this.classList.add('dropdown');
        if (this.#disabled) {
            this.classList.add('disabled');
        }

        // Selected Value Display
        this.selectedValueDiv = document.createElement('div');
        this.selectedValueDiv.className = 'dropdown-selected';
        this.selectedValueDiv.textContent = this.#getDisplayValue(this.#value) || 'Select...';
        this.appendChild(this.selectedValueDiv);

        // Menu container
        this.dropdownMenuDiv = document.createElement('div');
        this.dropdownMenuDiv.className = 'dropdown-menu';
        if (this.#dropdownMaxHeight) {
            this.dropdownMenuDiv.style.maxHeight = this.#dropdownMaxHeight + 'px';
        }
        this.appendChild(this.dropdownMenuDiv);

        // Event Listeners
        this.selectedValueDiv.addEventListener('click', (e) => {
            if (this.#disabled) {
                return;
            }
            e.stopPropagation();
            this.#toggleMenu();
        });

        // Close the dropdown if the user clicks outside of it
        document.addEventListener('click', (e) => {
            if (!this.contains(e.target)) {
                this.#closeMenu();
            }
        });

        this.#renderOptions();
    }

    /**
     * Get the current value.
     * @returns {string|number} The current value.
     */
    get value() {
        return this.#value;
    }

    /**
     * Set the value.
     * Updates the UI and triggers a change event if the value has changed (unless suppressing event).
     * @param {string|number} newValue - The new value to set.
     */
    set value(newValue) {
        if (this.#value === newValue) {
            return;
        }
        this.#updateInternalState(newValue, false);
    }

    /**
     * Get the list of items.
     * @returns {Array} List of items.
     */
    get items() {
        return this.#items;
    }

    /**
     * Set the list of items.
     * Supported formats:
     * - String: 'Item Label'
     * - Object (Rich HTML): { element: HTMLElement, value: 'val' }
     * - Object (Plain): { value: 'val', valueToDisplay: 'Display Text' }
     * Re-renders the options and clears the value if it's no longer present.
     * @param {Array<string|{element: HTMLElement, value: any}|{value: any, valueToDisplay: string}>} newItems - List of items.
     */
    set items(newItems) {
        this.#items = newItems;
        if (this.dropdownMenuDiv) {
            this.#renderOptions();
            const found = this.#items.some((i) => (i.value ?? i) === this.#value);
            if (!found) {
                this.#value = '';
                this.selectedValueDiv.textContent = 'Select...';
            }
        }
    }

    get hasCheckmark() {
        return this.#hasCheckmark;
    }

    set hasCheckmark(val) {
        this.#hasCheckmark = val;
        if (this.dropdownMenuDiv) {
            this.#updateCheckmarks();
        }
    }

    get dropdownMaxHeight() {
        return this.#dropdownMaxHeight;
    }

    set dropdownMaxHeight(val) {
        this.#dropdownMaxHeight = val;
        if (this.dropdownMenuDiv) {
            this.dropdownMenuDiv.style.maxHeight = val + 'px';
        }
    }

    get disabled() {
        return this.#disabled;
    }

    set disabled(val) {
        this.#disabled = val;
        if (this.classList) {
            // Check if classList exists (i.e., element is connected)
            if (val) {
                this.classList.add('disabled');
                this.#closeMenu();
            } else {
                this.classList.remove('disabled');
            }
        }
    }

    /**
     * Helper to retrieve the display label for a given value.
     * @param {string} val - The value to look for.
     * @returns {string} The display text.
     */
    #getDisplayValue(val) {
        if (!this.#items) {
            return val;
        }
        const item = this.#items.find((i) => (i.value ?? i) === val);
        if (!item) {
            return val;
        }
        if (typeof item === 'string') {
            return item;
        }
        return item.valueToDisplay ?? item.element?.textContent ?? item.value;
    }

    /**
     * Updates the internal state and UI.
     * @param {string|number} newValue - The new value.
     * @param {boolean} triggerChange - Whether to dispatch a change event.
     */
    #updateInternalState(newValue, triggerChange = true) {
        // Find corresponding item
        const item = this.#items.find((i) => (i.value ?? i) === newValue);

        // Update UI if connected
        if (this.selectedValueDiv) {
            let display = newValue;
            if (item) {
                if (typeof item === 'string') {
                    display = item;
                } else {
                    display = item.valueToDisplay ?? item.element?.innerHTML ?? item.value;
                }
            }
            this.selectedValueDiv.innerHTML = display || 'Select...';
        }

        this.#value = newValue;
        if (this.dropdownMenuDiv) {
            this.#updateCheckmarks();
        }

        if (triggerChange) {
            this.dispatchEvent(
                new CustomEvent('gm-dropdown-change', {
                    detail: {value: newValue},
                    bubbles: true,
                }),
            );
        }
    }

    /**
     * Renders the dropdown options.
     */
    #renderOptions() {
        if (!this.dropdownMenuDiv) {
            return;
        }
        this.dropdownMenuDiv.innerHTML = '';

        this.#items.forEach((item) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-item';

            if (typeof item === 'string') {
                optionDiv.innerHTML = item;
            } else if (item.element instanceof HTMLElement) {
                optionDiv.appendChild(item.element);
            } else if (item.valueToDisplay) {
                optionDiv.textContent = item.valueToDisplay;
            } else {
                return;
            }

            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = typeof item === 'object' ? item.value : item;
                this.#updateInternalState(val, true);
                this.#closeMenu();
            });

            this.dropdownMenuDiv.appendChild(optionDiv);
        });

        this.#updateCheckmarks();
    }

    /**
     * Updates the checkmark indicators on selected items.
     */
    #updateCheckmarks() {
        if (!this.#hasCheckmark || !this.dropdownMenuDiv) {
            return;
        }

        this.#items.forEach((item, index) => {
            let parent;
            if (typeof item === 'object' && item.element) {
                parent = item.element.parentElement;
            } else {
                /*
                 * If item is string, we don't have reference to DOM element easily unless we stored it.
                 * Fallback: childNodes array.
                 */
                parent = this.dropdownMenuDiv.children[index];
            }

            // Remove existing check
            const existing = parent.querySelector('.dropdown-checkmark');
            if (existing) {
                existing.remove();
            }

            const itemVal = typeof item === 'object' ? item.value : item;
            if (itemVal === this.#value) {
                const check = document.createElement('div');
                check.className = 'dropdown-checkmark';
                parent.appendChild(check);
            }
        });
    }

    /**
     * Toggles the dropdown menu visibility.
     */
    #toggleMenu() {
        if (this.#isOpen) {
            this.#closeMenu();
        } else {
            this.#openMenu();
        }
    }

    /**
     * Opens the dropdown menu.
     */
    #openMenu() {
        this.classList.add('open');
        this.#isOpen = true;
        this.#synchronizeMenuWidth();
    }

    /**
     * Closes the dropdown menu.
     */
    #closeMenu() {
        this.classList.remove('open');
        this.#isOpen = false;
    }

    /**
     * Synchronizes the menu width with the selected value div.
     */
    #synchronizeMenuWidth() {
        if (this.selectedValueDiv && this.dropdownMenuDiv) {
            const width = this.selectedValueDiv.offsetWidth;
            this.dropdownMenuDiv.style.width = `${width}px`;
        }
    }
}

customElements.define('gm-dropdown', GmDropdown);
