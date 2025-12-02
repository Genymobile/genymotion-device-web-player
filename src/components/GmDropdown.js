
import log from 'loglevel';

/**
 * Custom Dropdown Component
 * Replaces the legacy dropdownSelect factory.
 * Usage: <gm-dropdown></gm-dropdown>
 */
export class GmDropdown extends HTMLElement {
    static get observedAttributes() {
        return ['value', 'placeholder', 'disabled', 'has-checkmark', 'max-height'];
    }

    constructor() {
        super();
        this._items = [];
        this._value = '';
        this._placeholder = 'Select...';
        this._disabled = false;
        this._hasCheckmark = false;
        this._maxHeight = null;
        this._isOpen = false;
        this._onChange = null; // Legacy callback support

        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    connectedCallback() {
        if (!this.querySelector('.dropdown')) {
            this.render();
        }
        document.addEventListener('click', this.handleDocumentClick);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.handleDocumentClick);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'value':
                this.value = newValue;
                break;
            case 'placeholder':
                this._placeholder = newValue || 'Select...';
                this.updateSelectedDisplay();
                break;
            case 'disabled':
                this.disabled = newValue !== null;
                break;
            case 'has-checkmark':
                this._hasCheckmark = newValue !== null;
                this.renderItems();
                break;
            case 'max-height':
                this._maxHeight = newValue;
                if (this.menuDiv) {
                    this.menuDiv.style.maxHeight = newValue ? `${newValue}px` : '';
                }
                break;
        }
    }

    render() {
        this.classList.add('dropdown-component'); // Wrapper class if needed, or just use host

        this.dropdownDiv = document.createElement('div');
        this.dropdownDiv.className = 'dropdown';
        if (this._disabled) this.dropdownDiv.classList.add('disabled');

        // Selected Value Display
        this.selectedValueDiv = document.createElement('div');
        this.selectedValueDiv.className = 'dropdown-selected';
        this.selectedValueDiv.addEventListener('click', (e) => {
            if (!this._disabled) {
                this.toggleMenu();
                e.stopPropagation();
            }
        });
        this.dropdownDiv.appendChild(this.selectedValueDiv);

        // Menu
        this.menuDiv = document.createElement('div');
        this.menuDiv.className = 'dropdown-menu';
        if (this._maxHeight) {
            this.menuDiv.style.maxHeight = `${this._maxHeight}px`;
        }
        this.dropdownDiv.appendChild(this.menuDiv);

        this.appendChild(this.dropdownDiv);
        this.updateSelectedDisplay();
        this.renderItems();
    }

    handleDocumentClick(event) {
        if (this._isOpen && !this.contains(event.target)) {
            this.closeMenu();
        }
    }

    toggleMenu() {
        if (this._isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this._isOpen = true;
        this.dropdownDiv.classList.add('open');
        this.synchronizeMenuWidth();
    }

    closeMenu() {
        this._isOpen = false;
        this.dropdownDiv.classList.remove('open');
    }

    synchronizeMenuWidth() {
        if (this.selectedValueDiv && this.menuDiv) {
            const width = this.selectedValueDiv.offsetWidth;
            this.menuDiv.style.width = `${width}px`;
        }
    }

    updateSelectedDisplay() {
        if (!this.selectedValueDiv) return;

        const selectedItem = this._items.find(item => {
            const itemValue = typeof item === 'object' ? item.value : item;
            return String(itemValue) === String(this._value);
        });

        if (selectedItem) {
            if (typeof selectedItem === 'object') {
                this.selectedValueDiv.innerHTML = selectedItem.valueToDisplay || selectedItem.element?.innerHTML || selectedItem.value;
            } else {
                this.selectedValueDiv.textContent = selectedItem;
            }
        } else {
            this.selectedValueDiv.textContent = this._placeholder;
        }
    }

    renderItems() {
        if (!this.menuDiv) return;

        this.menuDiv.innerHTML = '';

        this._items.forEach(item => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-item';

            let itemValue;
            if (typeof item === 'string') {
                optionDiv.innerHTML = item;
                itemValue = item;
            } else if (typeof item === 'object') {
                if (item.element && item.element instanceof HTMLElement) {
                    optionDiv.appendChild(item.element.cloneNode(true));
                } else {
                    optionDiv.innerHTML = item.valueToDisplay || item.value;
                }
                itemValue = item.value;
            }

            optionDiv.addEventListener('click', (e) => {
                this.setValue(itemValue, true);
                this.closeMenu();
                e.stopPropagation();
            });

            // Checkmark logic
            if (this._hasCheckmark && String(itemValue) === String(this._value)) {
                const checkmark = document.createElement('div');
                checkmark.className = 'dropdown-checkmark';
                optionDiv.appendChild(checkmark);
            }

            this.menuDiv.appendChild(optionDiv);
        });
    }

    // Public API

    get value() {
        return this._value;
    }

    set value(newValue) {
        if (this._value === newValue) return;
        this._value = newValue;
        this.updateSelectedDisplay();
        if (this._hasCheckmark) {
            this.renderItems(); // Re-render to update checkmarks
        }
    }

    setValue(newValue, triggerEvent = false) {
        this.value = newValue;
        if (triggerEvent) {
            this.dispatchEvent(new CustomEvent('gm-change', {
                detail: { value: newValue },
                bubbles: true
            }));
            if (this._onChange) {
                this._onChange(newValue);
            }
        }
    }

    getValue() {
        return this.value;
    }

    get items() {
        return this._items;
    }

    set items(newItems) {
        this._items = newItems || [];
        // If current value is not in new items, reset to empty (unless it's just initial setup)
        const valueExists = this._items.some(item => {
            const val = typeof item === 'object' ? item.value : item;
            return String(val) === String(this._value);
        });

        if (!valueExists && this._value) {
            // Optional: Reset value if it's no longer valid? 
            // Legacy behavior: "if selectedValue is not in the newItems, reset the selectedValue" (visually to Select...)
            // But let's keep the internal value for now unless explicitly cleared, but update display.
            this.updateSelectedDisplay();
        } else {
            this.updateSelectedDisplay();
        }
        this.renderItems();
    }

    updateOptions(newItems) {
        this.items = newItems;
    }

    get disabled() {
        return this._disabled;
    }

    set disabled(val) {
        this._disabled = val;
        if (this.dropdownDiv) {
            if (val) {
                this.dropdownDiv.classList.add('disabled');
            } else {
                this.dropdownDiv.classList.remove('disabled');
            }
        }
        if (val) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    setDisabled(status) {
        this.disabled = status;
    }

    // Legacy setter
    set onChange(callback) {
        this._onChange = callback;
    }
}

customElements.define('gm-dropdown', GmDropdown);
