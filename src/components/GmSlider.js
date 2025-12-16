/**
 * Custom Slider Component
 * Usage: <gm-slider min="0" max="100" value="50"></gm-slider>
 */
export class GmSlider extends HTMLElement {
    #min = 0;
    #max = 100;
    #value = 50;
    #onCursorMove = null;

    static get observedAttributes() {
        return ['min', 'max', 'value', 'disabled'];
    }

    constructor() {
        super();
    }

    connectedCallback() {
        if (!this.querySelector('.slider-input')) {
            this.render();
        }
        this.updateUI();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }

        switch (name) {
            case 'min':
                this.#min = parseFloat(newValue);
                break;
            case 'max':
                this.#max = parseFloat(newValue);
                break;
            case 'value':
                this.value = parseFloat(newValue);
                break;
            case 'disabled': {
                const input = this.querySelector('input');
                if (input) {
                    input.disabled = newValue !== null;
                }
                break;
            }
            default:
                break;
        }

        // Update input attributes if it exists
        const input = this.querySelector('.slider-input');
        if (input) {
            if (name === 'min') {
                input.min = this.#min;
            }
            if (name === 'max') {
                input.max = this.#max;
            }
        }

        if (name !== 'value') {
            // value change triggers updateUI via setter
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
        this.input.min = this.#min;
        this.input.max = this.#max;
        this.input.value = this.#value;
        this.input.classList.add('slider-input');
        this.appendChild(this.input);

        // Event listeners
        this.input.addEventListener('input', (event) => {
            this.#value = parseFloat(event.target.value);
            this.updateUI();

            if (this.#onCursorMove) {
                this.#onCursorMove(this.#value);
            }

            // Dispatch input event for real-time updates
            this.dispatchEvent(
                new CustomEvent('gm-slider-input', {
                    detail: {value: this.#value},
                    bubbles: true,
                }),
            );
        });

        this.input.addEventListener('change', (event) => {
            this.#value = parseFloat(event.target.value);
            this.updateUI();

            // Dispatch change event for final value
            this.dispatchEvent(
                new CustomEvent('gm-slider-change', {
                    detail: {value: this.#value},
                    bubbles: true,
                }),
            );
        });
    }

    updateUI() {
        if (!this.input || !this.sliderCursor) {
            return;
        }

        requestAnimationFrame(async () => {
            /*
             * if CSS isn't ready cursorWidth & sliderWidth haven't size, so we loop to waiting CSS ready
             */
            const start = performance.now();
            while (this.sliderCursor.offsetWidth === 0 || this.offsetWidth === 0) {
                // After 5s we stop the loop
                if (performance.now() - start > 5000) {
                    // log.warn('Timeout: CSS not applied'); // Optional logging
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            const val = this.#value;
            const min = this.#min;
            const max = this.#max;

            const percentage = ((val - min) / (max - min)) * 100;
            const cursorWidth = this.sliderCursor.offsetWidth;
            const sliderWidth = this.offsetWidth;

            // Avoid division by zero
            if (sliderWidth === 0) {
                return;
            }

            const offset = (cursorWidth / 2 / sliderWidth) * 100;
            const adjustedPercentage = `${percentage - offset}%`;

            if (this.progressBar) {
                this.progressBar.style.width = `${percentage}%`;
            }
            if (this.sliderCursor) {
                this.sliderCursor.style.left = adjustedPercentage;
                const calc = ((percentage / 100) * cursorWidth - cursorWidth / 2) * -1;
                this.sliderCursor.style.transform = `translate(${calc}px, -50%)`;
            }
        });
    }

    // Expose min/max as properties to support direct assignments (e.g., el.min = 0)
    get min() {
        return this.#min;
    }

    set min(newMin) {
        const val = parseFloat(newMin);
        if (isNaN(val)) {
            return;
        }
        this.#min = val;
        if (this.input) {
            this.input.min = this.#min;
        }
        // If value is below new min, keep UI consistent
        if (this.#value < this.#min) {
            this.#value = this.#min;
            if (this.input) {
                this.input.value = this.#value;
            }
        }
        this.updateUI();
    }

    get max() {
        return this.#max;
    }

    set max(newMax) {
        const val = parseFloat(newMax);
        if (isNaN(val)) {
            return;
        }
        this.#max = val;
        if (this.input) {
            this.input.max = this.#max;
        }
        // If value is above new max, keep UI consistent
        if (this.#value > this.#max) {
            this.#value = this.#max;
            if (this.input) {
                this.input.value = this.#value;
            }
        }
        this.updateUI();
    }

    get value() {
        return this.#value;
    }

    set value(newValue) {
        const val = parseFloat(newValue);
        if (isNaN(val)) {
            return;
        }

        if (this.#value === val) {
            return;
        }

        this.#value = val;
        if (this.input) {
            this.input.value = this.#value;
        }
        this.updateUI();
    }

    set onCursorMove(callback) {
        this.#onCursorMove = callback;
    }
}

customElements.define('gm-slider', GmSlider);
