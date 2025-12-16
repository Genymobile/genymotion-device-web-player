/**
 * Custom Switch Component
 * Usage: <gm-switch></gm-switch>
 */
export class GmSwitch extends HTMLElement {
    #checked = false;
    #boundHandleClick;

    static get observedAttributes() {
        return ['checked', 'disabled'];
    }

    constructor() {
        super();
        this.#boundHandleClick = this.#handleClick.bind(this);
    }

    /**
     * Called when custom element is appended to the DOM.
     */
    connectedCallback() {
        // Render if not already rendered (e.g., after a disconnect/reconnect)
        if (!this.querySelector('input')) {
            this.#render();
        }
        this.addEventListener('click', this.#boundHandleClick);
    }

    /**
     * Called when custom element is removed from the DOM.
     */
    disconnectedCallback() {
        this.removeEventListener('click', this.#boundHandleClick);
    }

    /**
     * Called when an observed attribute changes.
     * @param {string} name - Attribute name.
     * @param {string} oldValue - Old attribute value.
     * @param {string} newValue - New attribute value.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'checked') {
            this.checked = newValue !== null;
        }
    }

    /**
     * Get checked state.
     * @returns {boolean} True if checked.
     */
    get checked() {
        return this.#checked;
    }

    /**
     * Set checked state.
     * Updates the UI and the attribute.
     * @param {boolean} value - New checked state.
     */
    set checked(value) {
        if (this.#checked === value) {
            return;
        }

        this.#checked = !!value;
        const input = this.querySelector('input');
        if (input) {
            input.checked = this.#checked;
        }

        if (this.#checked) {
            this.setAttribute('checked', '');
        } else {
            this.removeAttribute('checked');
        }
    }

    /**
     * Renders the component HTML.
     */
    #render() {
        this.classList.add('switch');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = this.#checked;

        const slider = document.createElement('span');
        slider.className = 'switch-slider';

        this.appendChild(input);
        this.appendChild(slider);
    }

    /**
     * Handles click events to toggle state.
     * @param {Event} e - Click event.
     */
    #handleClick(e) {
        e.preventDefault(); // Prevent double toggle if clicking label/input
        this.checked = !this.checked;

        // Dispatch event
        this.dispatchEvent(
            new CustomEvent('gm-switch-change', {
                detail: {checked: this.checked},
                bubbles: true,
            }),
        );
    }
}

customElements.define('gm-switch', GmSwitch);
