
/**
 * Custom Progress Bar Component
 * Replaces the legacy progressBar factory.
 * Usage: <gm-progress value="0" max="100"></gm-progress>
 */
export class GmProgress extends HTMLElement {
    static get observedAttributes() {
        return ['value', 'max'];
    }

    constructor() {
        super();
        this._value = 0;
        this._max = 100;
        this._onChange = null;
    }

    connectedCallback() {
        if (!this.querySelector('.gm-progress-container')) {
            this.render();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'value':
                this.value = parseFloat(newValue) || 0;
                break;
            case 'max':
                this.max = parseFloat(newValue) || 100;
                break;
        }
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'gm-progress-container';

        this.bar = document.createElement('div');
        this.bar.className = 'gm-progress-bar';
        this.container.appendChild(this.bar);

        this.appendChild(this.container);
        this.update();
    }

    update() {
        if (this.bar) {
            const percentage = Math.min(100, Math.max(0, (this._value / this._max) * 100));
            this.bar.style.width = `${percentage}%`;
        }
    }

    // Public API

    get value() {
        return this._value;
    }

    set value(newValue) {
        const val = Math.max(0, Math.min(newValue, this._max));
        if (this._value !== val) {
            this._value = val;
            this.setAttribute('value', val); // Reflect to attribute
            this.update();
            if (this._onChange) {
                this._onChange(val);
            }
        }
    }

    get max() {
        return this._max;
    }

    set max(newMax) {
        this._max = newMax;
        this.setAttribute('max', newMax); // Reflect to attribute
        this.update();
    }

    // Legacy compatibility
    setValue(newValue) {
        this.value = newValue;
    }

    getValue() {
        return this.value;
    }

    setMax(newMax) {
        this.max = newMax;
    }

    set onChange(callback) {
        this._onChange = callback;
    }
}

customElements.define('gm-progress', GmProgress);
