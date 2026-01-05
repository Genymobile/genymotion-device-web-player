/**
 * Custom Chip/Tag Component
 * Usage: <gm-chip type="success" value="Label"></gm-chip>
 */
export class GmChip extends HTMLElement {
    #type = 'success';
    #value = 'Applied';

    static get observedAttributes() {
        return ['type', 'value'];
    }

    constructor() {
        super();
    }

    /**
     * Called when custom element is appended to the DOM.
     */
    connectedCallback() {
        if (!this.querySelector('.gm-tag-container')) {
            this.style.display = 'inline-block';
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

        if (name === 'type') {
            this.type = newValue;
        } else if (name === 'value') {
            this.value = newValue;
        }
    }

    /**
     * Get chip type.
     * @returns {string} The chip type (e.g., 'success', 'warning').
     */
    get type() {
        return this.#type;
    }

    /**
     * Set chip type.
     * Updates the CSS class.
     * @param {string} newType - The new type.
     */
    set type(newType) {
        if (this.#type === newType) {
            return;
        }

        // Remove old class
        if (this.#type) {
            this.classList.remove('gm-tag-' + this.#type);
        }

        this.#type = newType || 'success';
        this.classList.add('gm-tag-' + this.#type);

        // Reflect to attribute
        if (this.getAttribute('type') !== this.#type) {
            this.setAttribute('type', this.#type);
        }
    }

    /**
     * Get chip value/label.
     * @returns {string} The text content.
     */
    get value() {
        return this.#value;
    }

    /**
     * Set chip value/label.
     * Updates the text content.
     * @param {string} newValue - The new text content.
     */
    set value(newValue) {
        const val = newValue || '';
        if (this.#value === val) {
            return;
        }

        this.#value = val;
        const container = this.querySelector('.gm-tag-container');
        if (container) {
            container.textContent = this.#value;
        }

        if (this.getAttribute('value') !== this.#value) {
            this.setAttribute('value', this.#value);
        }
    }

    /**
     * Get visibility state.
     * @returns {boolean} True if visible.
     */
    get visible() {
        return this.style.visibility !== 'hidden';
    }

    /**
     * Set visibility state.
     * @param {boolean} val - True to show, false to hide.
     */
    set visible(val) {
        this.style.visibility = val ? 'visible' : 'hidden';
    }

    /**
     * Renders the component HTML.
     */
    #render() {
        this.#updateTypeClass();

        const container = document.createElement('div');
        container.className = 'gm-tag-container';
        container.textContent = this.#value;
        this.appendChild(container);
    }

    /**
     * Updates the CSS class based on type.
     */
    #updateTypeClass() {
        if (this.#type) {
            this.classList.add('gm-tag-' + this.#type);
        }
    }
}

customElements.define('gm-chip', GmChip);
