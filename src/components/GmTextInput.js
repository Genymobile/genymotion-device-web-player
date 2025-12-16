/**
 * Custom Text Input Component
 * Usage: <gm-text-input type="text|number" value="..."></gm-text-input>
 */
import log from 'loglevel';
export class GmTextInput extends HTMLElement {
    #value = '';
    #regexFilter = null;
    #regexValid = null;

    static get observedAttributes() {
        return [
            'value',
            'type',
            'placeholder',
            'min',
            'max',
            'step',
            'disabled',
            'readonly',
            'regex-filter',
            'regex-valid',
            'append-text',
            'unit-text',
            'error-message',
            'strict-range',
        ];
    }

    constructor() {
        super();
    }

    /**
     * Called when custom element is appended to the DOM.
     */
    connectedCallback() {
        if (!this.querySelector('.text-input-container')) {
            this.#render();
        }
    }

    /**
     * Called when an observed attribute changes.
     * @param {string} name - Attribute name.
     * @param {string} oldValue - Old attribute value.
     * @param {string} newValue - New attribute value.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }

        switch (name) {
            case 'value':
                this.value = newValue; // Goes through setter
                break;
            case 'regex-filter':
                try {
                    this.#regexFilter = newValue ? new RegExp(newValue) : null;
                } catch (e) {
                    log.warn('Invalid regex-filter:', newValue);
                    this.#regexFilter = null;
                }
                break;
            case 'regex-valid':
                try {
                    this.#regexValid = newValue ? new RegExp(newValue) : null;
                } catch (e) {
                    log.warn('Invalid regex-valid:', newValue);
                    this.#regexValid = null;
                }
                break;
            case 'error-message':
                this.#updateErrorMessage(newValue);
                break;
            default:
                this.#updateInputAttribute(name, newValue);
                this.#updateUI(name, newValue);
                break;
        }
    }

    /**
     * Get current value.
     * @returns {string} The current value.
     */
    get value() {
        return this.#value;
    }

    /**
     * Set current value.
     * Validates and updates the internal state and UI.
     * @param {string} newValue - The new value.
     */
    set value(newValue) {
        this.setValue(newValue);
    }

    /**
     * Sets the value programmatically, with optional event emission.
     * @param {string} newValue - The new value.
     * @param {Object} [options] - Options.
     * @param {boolean} [options.emit] - Whether to dispatch 'change' and 'input' events. Default false.
     */
    setValue(newValue, {emit = false} = {}) {
        const strValue = String(newValue ?? '');
        if (this.#value === strValue) {
            return;
        }

        // Respect regex-filter on programmatic set (restore legacy behavior)
        if (this.#regexFilter && !this.#regexFilter.test(strValue) && strValue !== '') {
            log.warn('GmTextInput: Ignored invalid value set programmatically:', strValue);
            return;
        }

        // Strict Range Enforcement (prevent programmatically setting beyond limits)
        if (this.hasAttribute('strict-range') && this.getAttribute('type') === 'number' && strValue !== '') {
            const min = parseFloat(this.getAttribute('min'));
            const max = parseFloat(this.getAttribute('max'));
            const val = parseFloat(strValue);

            // Block invalid number (NaN)
            if (isNaN(val)) {
                log.warn('GmTextInput: Ignored NaN value set programmatically (strict-range):', strValue);
                return;
            }

            // Block negative input if min is non-negative
            if (!isNaN(min) && min >= 0 && val < 0) {
                log.warn('GmTextInput: Ignored negative value set programmatically (strict-range):', strValue);
                return;
            }
            // Block values greater than max
            if (!isNaN(max) && val > max) {
                log.warn('GmTextInput: Ignored value > max set programmatically (strict-range):', strValue);
                return;
            }
        }

        this.#value = strValue;
        if (this.input) {
            this.input.value = this.#value;
        }

        if (emit) {
            this.dispatchEvent(
                new CustomEvent('gm-text-input-input', {
                    detail: {value: this.#value},
                    bubbles: true,
                }),
            );
            this.dispatchEvent(
                new CustomEvent('gm-text-input-change', {
                    detail: {value: this.#value},
                    bubbles: true,
                }),
            );
        }
    }

    /**
     * Check if the input is valid.
     * @returns {boolean} True if valid.
     */
    checkValidity() {
        // If native validity fails (e.g. number range), return false
        if (this.input && !this.input.checkValidity()) {
            return false;
        }
        // If custom regex valid field
        if (this.#regexValid) {
            return this.#regexValid.test(this.#value);
        }
        return true;
    }

    /**
     * Set a custom error message.
     * @param {string} message - The error message to display.
     */
    setErrorMessage(message) {
        this.setAttribute('error-message', message);
    }

    /**
     * Renders the component HTML.
     */
    #render() {
        this.classList.add('text-input');

        const container = document.createElement('div');
        container.classList.add('text-input-container');

        this.input = document.createElement('input');
        this.input.classList.add('input');
        // Initial attributes
        this.#updateInputAttribute('type', this.getAttribute('type') || 'text');
        this.#updateInputAttribute('placeholder', this.getAttribute('placeholder'));
        this.#updateInputAttribute('min', this.getAttribute('min'));
        this.#updateInputAttribute('max', this.getAttribute('max'));
        this.#updateInputAttribute('step', this.getAttribute('step'));
        this.input.disabled = this.hasAttribute('disabled');
        this.input.readOnly = this.hasAttribute('readonly');
        this.input.value = this.#value;

        // Note: append-text is handled in updateUI because it requires DOM manipulation

        container.appendChild(this.input);
        this.appendChild(container);

        // Bottom container for error/unit
        const bottomContainer = document.createElement('div');
        bottomContainer.classList.add('text-input-bottom');

        this.errorMessageEl = document.createElement('div');
        // Do not add gm-error initially
        this.errorMessageEl.classList.add('text-input-message');
        // Set initial visibility hidden instead of class
        this.errorMessageEl.style.visibility = 'hidden';
        bottomContainer.appendChild(this.errorMessageEl);

        this.unitTextEl = document.createElement('div');
        this.unitTextEl.classList.add('text-input-unit');
        bottomContainer.appendChild(this.unitTextEl);

        this.appendChild(bottomContainer);

        // Events
        this.input.addEventListener('input', this.#handleInput.bind(this));
        // We listen to change/blur on input to dispatch our own change event
        this.input.addEventListener('change', this.#handleChange.bind(this));

        this.input.addEventListener('blur', () => {
            this.dispatchEvent(
                new CustomEvent('gm-text-input-blur', {
                    detail: {value: this.#value},
                    bubbles: true,
                }),
            );
        });

        // Initial UI updates
        this.#updateUI('append-text', this.getAttribute('append-text'));
        this.#updateUI('unit-text', this.getAttribute('unit-text'));
        this.#updateErrorMessage(this.getAttribute('error-message'));
    }

    /**
     * Updates an attribute on the internal input element.
     * @param {string} name - Attribute name.
     * @param {string} value - Attribute value.
     */
    #updateInputAttribute(name, value) {
        if (!this.input) {
            return;
        }

        if (value === null) {
            this.input.removeAttribute(name);
        } else {
            this.input.setAttribute(name, value);
        }

        // Handle boolean attributes
        if (name === 'disabled') {
            this.input.disabled = value !== null;
        } else if (name === 'readonly') {
            this.input.readOnly = value !== null;
        }
    }

    /**
     * Updates specific UI elements based on attributes.
     * @param {string} name - Attribute name.
     * @param {string} value - Attribute value.
     */
    #updateUI(name, value) {
        // Guard against DOM not being ready (e.g. before connectedCallback)
        if (!this.querySelector('.text-input-container')) {
            return;
        }

        if (name === 'append-text') {
            const container = this.querySelector('.text-input-container');
            let appendSpan = container.querySelector('.append-text');
            if (value) {
                if (!appendSpan) {
                    appendSpan = document.createElement('span');
                    appendSpan.classList.add('append-text');
                    container.appendChild(appendSpan);
                }
                appendSpan.textContent = value;
            } else if (appendSpan) {
                appendSpan.remove();
            }
        } else if (name === 'unit-text') {
            if (this.unitTextEl) {
                this.unitTextEl.textContent = value || '';
                this.#updateBottomVisibility();
            }
        }
    }

    /**
     * Updates the error message display.
     * @param {string} message - Error message.
     */
    #updateErrorMessage(message) {
        if (!this.errorMessageEl) {
            return;
        }

        if (message) {
            // CSS likely uses ::after { content: attr(data-error); }
            this.errorMessageEl.setAttribute('data-error', message);
            this.errorMessageEl.classList.add('gm-error');
            this.errorMessageEl.style.visibility = 'visible';
            if (this.unitTextEl) {
                this.unitTextEl.classList.add('hidden');
            }
        } else {
            this.errorMessageEl.style.visibility = 'hidden';
            this.errorMessageEl.classList.remove('gm-error');
            this.errorMessageEl.removeAttribute('data-error');
            if (this.unitTextEl) {
                this.unitTextEl.classList.remove('hidden');
            }
        }
        this.#updateBottomVisibility();
    }

    /**
     * Updates the visibility of the bottom container.
     */
    #updateBottomVisibility() {
        const bottom = this.querySelector('.text-input-bottom');
        if (!bottom) {
            return;
        }
        bottom.classList.remove('hidden');
    }

    /**
     * Handles input events from the internal input element.
     * @param {Event} e - Input event.
     */
    #handleInput(e) {
        const newValue = e.target.value;
        const selectionStart = e.target.selectionStart;

        // Regex Filter logic: revert if not matching
        if (this.#regexFilter && !this.#regexFilter.test(newValue) && newValue !== '') {
            // Revert
            e.target.value = this.#value;
            // Restore selection if possible
            if (
                e.target.type === 'text' ||
                e.target.type === 'search' ||
                e.target.type === 'password' ||
                e.target.type === 'tel' ||
                e.target.type === 'url'
            ) {
                e.target.setSelectionRange(Math.max(0, selectionStart - 1), Math.max(0, selectionStart - 1));
            }
            return;
        }

        /*
         * Strict Range Enforcement (prevent typing beyond limits)
         * Only apply if 'strict-range' attribute is present
         */
        if (this.hasAttribute('strict-range') && this.getAttribute('type') === 'number' && newValue !== '') {
            const min = parseFloat(this.getAttribute('min'));
            const max = parseFloat(this.getAttribute('max'));
            const val = parseFloat(newValue);

            // Block negative input if min is non-negative
            if (!isNaN(min) && min >= 0 && val < 0) {
                e.target.value = this.#value;
                return;
            }
            // Block values greater than max
            if (!isNaN(max) && val > max) {
                e.target.value = this.#value;
                return;
            }
        }

        this.#value = newValue;

        this.dispatchEvent(
            new CustomEvent('gm-text-input-input', {
                detail: {value: this.#value},
                bubbles: true,
            }),
        );

        // Dispatch change event immediately for validation on input
        this.dispatchEvent(
            new CustomEvent('gm-text-input-change', {
                detail: {value: this.#value},
                bubbles: true,
            }),
        );
    }

    /**
     * Handles change events from the internal input element.
     * @param {Event} e - Change event.
     */
    #handleChange(e) {
        /*
         * We already dispatched change on input, but to be safe for non-input changes (paste? though paste triggers input)
         * or just blur events.
         * Avoid duplicate events if possible, but duplicate change is usually harmless for validation.
         */
        e.stopPropagation(); // Stop native change bubbling
        this.dispatchEvent(
            new CustomEvent('gm-text-input-change', {
                detail: {value: this.#value},
                bubbles: true,
            }),
        );
    }
}

customElements.define('gm-text-input', GmTextInput);
