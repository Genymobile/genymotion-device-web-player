
import log from 'loglevel';

/**
 * Custom Slider Component
 * Replaces the legacy createSlider factory.
 * Usage: <gm-slider min="0" max="100" value="50"></gm-slider>
 */
export class GmSlider extends HTMLElement {
    static get observedAttributes() {
        return ['min', 'max', 'value', 'disabled'];
    }

    constructor() {
        super();
        this._min = 0;
        this._max = 100;
        this._value = 50;
        this._onCursorMove = null;
    }

    connectedCallback() {
        if (!this.querySelector('.slider-input')) {
            this.render();
        }
        this.updateUI();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'min':
                this._min = parseFloat(newValue);
                break;
            case 'max':
                this._max = parseFloat(newValue);
                break;
            case 'value':
                this.value = parseFloat(newValue);
                break;
            case 'disabled':
                const input = this.querySelector('input');
                if (input) {
                    input.disabled = newValue !== null;
                }
                break;
        }

        // Update input attributes if it exists
        const input = this.querySelector('.slider-input');
        if (input) {
            if (name === 'min') input.min = this._min;
            if (name === 'max') input.max = this._max;
        }

        if (name !== 'value') { // value change triggers updateUI via setter
            this.updateUI();
        }
    }

    render() {
        this.classList.add('slider');

        // Create progress bar (filled portion)
        this.progressBar = document.createElement('div');
        this.progressBar.classList.add('slider-progress-bar');
        this.appendChild(this.progressBar);

        // Create progress bar (remaining portion)
        this.progressBarRemaining = document.createElement('div');
        this.progressBarRemaining.classList.add('slider-progress-bar-remaining');
        this.appendChild(this.progressBarRemaining);

        // Create the slider cursor
        this.sliderCursor = document.createElement('span');
        this.sliderCursor.classList.add('slider-cursor');
        this.appendChild(this.sliderCursor);

        // Create hidden range input
        this.input = document.createElement('input');
        this.input.type = 'range';
        this.input.min = this._min;
        this.input.max = this._max;
        this.input.value = this._value;
        this.input.classList.add('slider-input');
        this.appendChild(this.input);

        // Event listeners
        this.input.addEventListener('input', (event) => {
            this._value = parseFloat(event.target.value);
            this.updateUI();

            if (this._onCursorMove) {
                this._onCursorMove(this._value);
            }

            // Dispatch input event for real-time updates
            this.dispatchEvent(new CustomEvent('gm-input', {
                detail: { value: this._value },
                bubbles: true
            }));
        });

        this.input.addEventListener('change', (event) => {
            this._value = parseFloat(event.target.value);
            this.updateUI();

            // Dispatch change event for final value
            this.dispatchEvent(new CustomEvent('gm-change', {
                detail: { value: this._value },
                bubbles: true
            }));
        });
    }

    updateUI() {
        if (!this.input || !this.sliderCursor) return;

        requestAnimationFrame(async () => {
            // if CSS isn't ready cursorWidth & sliderWidth haven't size, so we loop to waiting CSS ready
            // This logic is ported from the legacy component
            const start = performance.now();
            while (this.sliderCursor.offsetWidth === 0 || this.offsetWidth === 0) {
                // After 5s we stop the loop
                if (performance.now() - start > 5000) {
                    // log.warn('Timeout: CSS not applied'); // Optional logging
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            const val = this._value;
            const min = this._min;
            const max = this._max;

            const percentage = ((val - min) / (max - min)) * 100;
            const cursorWidth = this.sliderCursor.offsetWidth;
            const sliderWidth = this.offsetWidth;

            // Avoid division by zero
            if (sliderWidth === 0) return;

            const offset = (cursorWidth / 2 / sliderWidth) * 100;
            const adjustedPercentage = `${percentage - offset}%`;

            if (this.progressBar) this.progressBar.style.width = `${percentage}%`;
            if (this.sliderCursor) {
                this.sliderCursor.style.left = adjustedPercentage;
                const calc = ((percentage / 100) * cursorWidth - (cursorWidth / 2)) * -1;
                this.sliderCursor.style.transform = `translate(${calc}px, -50%)`;
            }
        });
    }

    get value() {
        return this._value;
    }

    set value(newValue) {
        const val = parseFloat(newValue);
        if (isNaN(val)) return;

        // Clamp value? Legacy didn't seem to strictly clamp but warned.
        // Let's respect min/max for UI consistency
        // if (val < this._min) val = this._min;
        // if (val > this._max) val = this._max;

        if (this._value === val) return;

        this._value = val;
        if (this.input) {
            this.input.value = this._value;
        }
        this.updateUI();
    }

    // Legacy compatibility
    setValue(newValue, triggerOnChange = false) {
        this.value = newValue;
        if (triggerOnChange) {
            this.dispatchEvent(new CustomEvent('gm-change', {
                detail: { value: this._value },
                bubbles: true
            }));
        }
    }

    getValue() {
        return this.value;
    }

    set onCursorMove(callback) {
        this._onCursorMove = callback;
    }
}

customElements.define('gm-slider', GmSlider);
