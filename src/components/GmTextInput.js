
import log from 'loglevel';

/**
 * Custom Text Input Component
 * Replaces the legacy createTextInput factory.
 * Usage: <gm-text-input></gm-text-input>
 */
export class GmTextInput extends HTMLElement {
    static get observedAttributes() {
        return ['value', 'placeholder', 'disabled', 'readonly', 'append-text', 'unit-text', 'error-message'];
    }

    constructor() {
        super();
        this._value = '';
        this._regexFilter = null;
        this._regexValidField = null;
        this._onChange = null;
        this._onBlur = null;
    }

    connectedCallback() {
        if (!this.querySelector('input')) {
            this.render();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'value':
                this.value = newValue || '';
                break;
            case 'placeholder':
                const input = this.querySelector('input');
                if (input) input.placeholder = newValue || '';
                break;
            case 'disabled':
                const inputDisabled = this.querySelector('input');
                if (inputDisabled) inputDisabled.disabled = newValue !== null;
                break;
            case 'readonly':
                const inputReadOnly = this.querySelector('input');
                if (inputReadOnly) inputReadOnly.readOnly = newValue !== null;
                break;
            case 'append-text':
                this.renderAppendText(newValue);
                break;
            case 'unit-text':
                this.renderUnitText(newValue);
                break;
            case 'error-message':
                this.setErrorMessage(newValue);
                break;
        }
    }

    render() {
        this.classList.add('text-input');

        const container = document.createElement('div');
        container.classList.add('text-input-container');

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.value = this._value;
        this.input.classList.add('input');
        if (this.hasAttribute('placeholder')) {
            this.input.placeholder = this.getAttribute('placeholder');
        }
        if (this.hasAttribute('readonly')) {
            this.input.readOnly = true;
        }
        if (this.hasAttribute('disabled')) {
            this.input.disabled = true;
        }

        container.appendChild(this.input);

        if (this.hasAttribute('append-text')) {
            this.renderAppendText(this.getAttribute('append-text'), container);
        }

        this.appendChild(container);

        // Bottom container for messages/units
        this.bottomContainer = document.createElement('div');
        this.bottomContainer.classList.add('text-input-bottom');

        this.messageElement = document.createElement('div');
        this.messageElement.classList.add('text-input-message', 'hidden');
        this.bottomContainer.appendChild(this.messageElement);

        this.unitElement = document.createElement('div');
        this.unitElement.classList.add('text-input-unit');
        if (this.hasAttribute('unit-text')) {
            this.unitElement.textContent = this.getAttribute('unit-text');
        } else {
            this.unitElement.classList.add('hidden');
        }
        this.bottomContainer.appendChild(this.unitElement);

        this.appendChild(this.bottomContainer);

        this.updateBottomVisibility();

        // Event Listeners
        this.input.addEventListener('input', (e) => {
            const { value: v, selectionStart } = e.target;

            if (this._regexFilter && !this._regexFilter.test(v)) {
                // Restore previous valid value (simplified logic compared to legacy but safer)
                // Legacy logic: slice out the last char. 
                // Let's try to replicate legacy logic if possible, or just reject the change.
                const correctedValue = v.slice(0, selectionStart - 1) + v.slice(selectionStart);
                e.target.value = correctedValue;
                e.target.setSelectionRange(selectionStart - 1, selectionStart - 1);
                return;
            }

            this._value = e.target.value;

            this.dispatchEvent(new CustomEvent('gm-input', {
                detail: { value: this._value },
                bubbles: true
            }));

            if (this._onChange) {
                this._onChange(this._value);
            }
        });

        this.input.addEventListener('blur', (e) => {
            if (this._onBlur) {
                this._onBlur(e.target.value);
            }
            this.dispatchEvent(new CustomEvent('gm-blur', {
                detail: { value: this._value },
                bubbles: true
            }));
        });
    }

    renderAppendText(text, container = null) {
        const targetContainer = container || this.querySelector('.text-input-container');
        if (!targetContainer) return;

        let appendSpan = targetContainer.querySelector('.append-text');
        if (text) {
            if (!appendSpan) {
                appendSpan = document.createElement('span');
                appendSpan.classList.add('append-text');
                targetContainer.appendChild(appendSpan);
            }
            appendSpan.textContent = text;
        } else if (appendSpan) {
            appendSpan.remove();
        }
    }

    renderUnitText(text) {
        if (!this.unitElement) return;

        if (text) {
            this.unitElement.textContent = text;
            if (!this.messageElement || this.messageElement.classList.contains('hidden')) {
                this.unitElement.classList.remove('hidden');
            }
        } else {
            this.unitElement.classList.add('hidden');
        }
        this.updateBottomVisibility();
    }

    updateBottomVisibility() {
        if (!this.bottomContainer) return;

        const hasMessage = this.messageElement && !this.messageElement.classList.contains('hidden');
        const hasUnit = this.unitElement && !this.unitElement.classList.contains('hidden');

        if (!hasMessage && !hasUnit) {
            this.bottomContainer.classList.add('hidden');
        } else {
            this.bottomContainer.classList.remove('hidden');
        }
    }

    setErrorMessage(message) {
        if (!this.messageElement) return;

        if (message) {

            this.messageElement.setAttribute('data-error', message);
            this.messageElement.classList.add('gm-error');
            this.messageElement.classList.remove('hidden');

            if (this.unitElement) this.unitElement.classList.add('hidden');
        } else {
            this.messageElement.classList.remove('gm-error');
            this.messageElement.removeAttribute('data-error');
            this.messageElement.classList.add('hidden');

            if (this.unitElement && this.getAttribute('unit-text')) {
                this.unitElement.classList.remove('hidden');
            }
        }
        this.updateBottomVisibility();
    }

    checkValidity() {
        if (this._regexValidField && this.input) {
            return this._regexValidField.test(this.input.value);
        }
        return true;
    }

    get value() {
        return this._value;
    }

    set value(newValue) {
        if (this._regexFilter && !this._regexFilter.test(newValue)) {
            log.warn('Invalid value:', newValue);
            return;
        }
        this._value = newValue;
        if (this.input) {
            this.input.value = newValue;
        }
    }

    // Legacy compatibility
    setValue(newValue, triggerOnChange = false) {
        this.value = newValue;
        if (triggerOnChange && this._onChange) {
            this._onChange(newValue);
        }
    }

    getValue() {
        return this.value;
    }

    setReadOnly(readOnly) {
        if (readOnly) {
            this.setAttribute('readonly', '');
        } else {
            this.removeAttribute('readonly');
        }
    }

    set regexFilter(regex) {
        this._regexFilter = regex;
    }

    set regexValidField(regex) {
        this._regexValidField = regex;
    }

    set onChange(callback) {
        this._onChange = callback;
    }

    set onBlur(callback) {
        this._onBlur = callback;
    }
}

customElements.define('gm-text-input', GmTextInput);
