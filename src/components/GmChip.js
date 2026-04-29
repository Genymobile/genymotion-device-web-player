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

        this.#type = newType;
        if (this.#type) {
            this.setAttribute('type', this.#type);
        } else {
            this.removeAttribute('type');
        }
        this.#updateUI();
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
        if (this.#value) {
            this.setAttribute('value', this.#value);
        } else {
            this.removeAttribute('value');
        }
        this.#updateUI();
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
        // Initial render structure
        const container = document.createElement('div');
        container.className = 'gm-tag-container';
        this.appendChild(container);

        this.#updateUI();
    }

    /**
     * Updates the UI (classes and text) based on internal state.
     */
    #updateUI() {
        this.classList.forEach((cls) => {
            if (cls.startsWith('gm-tag-')) {
                this.classList.remove(cls);
            }
        });

        if (this.#type) {
            this.classList.add('gm-tag-' + this.#type);
        }

        // Update Text
        const container = this.querySelector('.gm-tag-container');
        if (container) {
            container.textContent = this.#value;
        }
    }
}

customElements.define('gm-chip', GmChip);
