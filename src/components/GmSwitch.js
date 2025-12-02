
/**
 * Custom Switch Component
 * Replaces the legacy createSwitch factory.
 * Usage: <gm-switch></gm-switch>
 */
export class GmSwitch extends HTMLElement {
    static get observedAttributes() {
        return ['checked', 'disabled'];
    }

    constructor() {
        super();
        this._checked = false;
    }

    connectedCallback() {
        if (!this.querySelector('input')) {
            this.render();
        }
        this.addEventListener('click', this._handleClick.bind(this));
    }

    disconnectedCallback() {
        this.removeEventListener('click', this._handleClick.bind(this));
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'checked') {
            this.checked = newValue !== null;
        }
    }

    render() {
        this.classList.add('switch');

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = this._checked;

        const slider = document.createElement('span');
        slider.className = 'switch-slider';

        this.appendChild(input);
        this.appendChild(slider);
    }

    _handleClick(e) {
        // Prevent default to handle state manually or let the input handle it?
        // The legacy implementation toggled manually on div click.
        // If we click the component, we should toggle.
        // If we click the input directly, it toggles itself.

        // If the click target is the input, let it propagate but update state?
        // Legacy: switchDiv.addEventListener('click', () => setState(!input.checked, true));

        // Let's emulate legacy behavior:
        e.preventDefault(); // Prevent double toggle if clicking label/input
        this.checked = !this.checked;

        // Dispatch event
        this.dispatchEvent(new CustomEvent('gm-change', {
            detail: { checked: this.checked },
            bubbles: true
        }));
    }

    get checked() {
        return this._checked;
    }

    set checked(value) {
        if (this._checked === value) return;

        this._checked = !!value;
        const input = this.querySelector('input');
        if (input) {
            input.checked = this._checked;
        }

        if (this._checked) {
            this.setAttribute('checked', '');
        } else {
            this.removeAttribute('checked');
        }
    }

    // Legacy compatibility method
    setState(value) {
        this.checked = value;
    }

    // Legacy compatibility method
    getState() {
        return this.checked;
    }
}

customElements.define('gm-switch', GmSwitch);
