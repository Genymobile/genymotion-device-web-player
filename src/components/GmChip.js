
/**
 * Custom Chip Component
 * Replaces the legacy chipTag factory.
 * Usage: <gm-chip type="success">Applied</gm-chip>
 */
export class GmChip extends HTMLElement {
    static get observedAttributes() {
        return ['type', 'value'];
    }

    constructor() {
        super();
        this._type = 'success';
        this._value = 'Applied';
    }

    connectedCallback() {
        if (!this.querySelector('.gm-tag-container')) {
            this.render();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'type':
                this._type = newValue || 'success';
                this.updateType();
                break;
            case 'value':
                this._value = newValue || '';
                this.updateValue();
                break;
        }
    }

    render() {
        this.updateType();

        this.container = document.createElement('div');
        this.container.className = 'gm-tag-container';
        this.container.textContent = this._value;

        this.appendChild(this.container);
    }

    updateType() {
        // Remove existing gm-tag-* classes
        this.classList.forEach(cls => {
            if (cls.startsWith('gm-tag-')) {
                this.classList.remove(cls);
            }
        });
        this.classList.add(`gm-tag-${this._type}`);
    }

    updateValue() {
        if (this.container) {
            this.container.textContent = this._value;
        }
    }

    // Public API

    get type() {
        return this._type;
    }

    set type(newType) {
        this.setAttribute('type', newType);
    }

    setType(newType) {
        this.type = newType;
    }

    get value() {
        return this._value;
    }

    set value(newValue) {
        this.setAttribute('value', newValue);
    }

    setValue(newValue) {
        this.value = newValue;
    }
}

customElements.define('gm-chip', GmChip);
