/**
 * Custom Progress Bar Component
 * Usage: <gm-progress-bar value="50" max="100"></gm-progress-bar>
 */
export class GmProgressBar extends HTMLElement {
    #value = 0;
    #max = 100;

    static get observedAttributes() {
        return ['value', 'max'];
    }

    constructor() {
        super();
    }

    /**
     * Called when custom element is appended to the DOM.
     */
    connectedCallback() {
        if (!this.querySelector('.gm-progress-container')) {
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

        if (name === 'value') {
            this.#value = parseFloat(newValue) || 0;
            this.#updateUI();
        } else if (name === 'max') {
            this.#max = parseFloat(newValue) || 100;
            this.#updateUI();
        }
    }

    /**
     * Get current value.
     * @returns {number} The current value.
     */
    get value() {
        return this.#value;
    }

    /**
     * Set current value.
     * Clamps value between 0 and max.
     * @param {number} newValue - The new value.
     */
    set value(newValue) {
        this.#value = Math.max(0, Math.min(newValue, this.#max));
        this.setAttribute('value', this.#value);
        this.#updateUI();
    }

    /**
     * Get max value.
     * @returns {number} The maximum value.
     */
    get max() {
        return this.#max;
    }

    /**
     * Set max value.
     * @param {number} newMax - The new maximum value.
     */
    set max(newMax) {
        this.#max = newMax;
        this.setAttribute('max', this.#max);
        this.#updateUI();
    }

    /**
     * Renders the component HTML.
     */
    #render() {
        const container = document.createElement('div');
        container.className = 'gm-progress-container';

        const bar = document.createElement('div');
        bar.className = 'gm-progress-bar';
        container.appendChild(bar);

        this.appendChild(container);
        this.#updateUI();
    }

    /**
     * Updates the UI based on current value/max.
     */
    #updateUI() {
        const bar = this.querySelector('.gm-progress-bar');
        if (bar) {
            const percentage = Math.min(100, Math.max(0, (this.#value / this.#max) * 100));
            bar.style.width = `${percentage}%`;
        }
    }
}

customElements.define('gm-progress-bar', GmProgressBar);
