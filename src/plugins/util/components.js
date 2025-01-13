'use strict';

/**
 * Factory function to create a custom switch button.
 * @namespace
 * @typedef {Object} SwitchButton
 * @property {Function} createSwitch - Function to create and return the switch button component.
 * @property {Function} slider - Function to create and return the slider component.
 */

/**
 * Creates a custom switch button component.
 * @function
 * @memberof SwitchButton
 * @param {Object} options - Options for configuring the switch button.
 * @param {Function} [options.onChange] - Optional callback function to be executed when the switch state changes.
 * @returns {HTMLElement} - The switch button component as an HTML element. setState function is exposed to change the state of the switch button.
 */

const switchButton = (() => {
    const createSwitch = ({onChange = null}) => {
        const switchDiv = document.createElement('div');
        switchDiv.className = 'switch';

        const input = document.createElement('input');
        input.type = 'checkbox';

        const slider = document.createElement('span');
        slider.className = 'switch-slider';

        switchDiv.appendChild(input);
        switchDiv.appendChild(slider);

        const setState = (value, triggerOnChange = false) => {
            if (input.checked === value) {
                return;
            }
            input.checked = value;

            // Trigger onChange only if triggerOnChange is true
            if (triggerOnChange && onChange && typeof onChange === 'function') {
                onChange(input.checked);
            }
        };

        const getState = () => input.checked;

        switchDiv.addEventListener('click', () => {
            setState(!input.checked, true);
        });

        return {
            element: switchDiv,
            getState,
            setState,
        };
    };

    return {createSwitch};
})();

/**
 * Creates a custom slider component to set a value between a range.
 * @function
 * @param {Object} options - Options for configuring the slider.
 * @param {Function} [options.onChange] - Optional callback function to be executed when the slider value changes.
 * @param {boolean} [options.triggerOnChange] - Whether or not to trigger onChange when setting the value programmatically.
 * @returns {HTMLElement} - The slider component as an HTML element. setValue function is exposed to change the value of the slider.
 */

const slider = (() => {
    const createSlider = ({onChange = null, onCursorMove = null, min = 0, max = 100, value = 50}) => {
        if (min >= max) {
            throw new Error('`min` must be less than `max`.');
        }

        // Create slider container
        const sliderDiv = document.createElement('div');
        sliderDiv.classList.add('slider');

        // Create progress bar (filled portion)
        const progressBar = document.createElement('div');
        progressBar.classList.add('slider-progress-bar');
        sliderDiv.appendChild(progressBar);

        // Create progress bar (remaining portion)
        const progressBarRemaining = document.createElement('div');
        progressBarRemaining.classList.add('slider-progress-bar-remaining');
        sliderDiv.appendChild(progressBarRemaining);

        // Create the slider cursor
        const sliderCursor = document.createElement('span');
        sliderCursor.classList.add('slider-cursor');
        sliderDiv.appendChild(sliderCursor);

        // Create hidden range input
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = value;
        input.classList.add('slider-input');
        sliderDiv.appendChild(input);

        // Update UI based on the current slider value
        const updateUI = () => {
            requestAnimationFrame(() => {
                const val = parseFloat(input.value);
                const percentage = ((val - min) / (max - min)) * 100;
                const cursorWidth = sliderCursor.offsetWidth;
                const sliderWidth = sliderDiv.offsetWidth;

                const offset = (cursorWidth / 2 / sliderWidth) * 100;
                const adjustedPercentage = `${percentage - offset}%`;

                progressBar.style.width = `${percentage}%`;
                sliderCursor.style.left = adjustedPercentage;

                const calc = ((percentage / 100) * 16 - 8) * -1;
                sliderCursor.style.transform = `translate(${calc}px, -50%)`;
            });
        };

        const getValue = () => parseFloat(input.value);

        const setValue = (newValue, triggerOnChange = false) => {
            if (isNaN(newValue) || newValue < min || newValue > max) {
                console.warn('`value` must be within the range defined by `min` and `max`.');
                return;
            }

            if (input.value === String(newValue)) {
                return;
            }

            input.value = newValue;
            updateUI();

            if (triggerOnChange && onChange && typeof onChange === 'function') {
                onChange(newValue);
            }
        };

        input.addEventListener('input', (event) => {
            updateUI();
            if (onCursorMove) {
                onCursorMove(event.target.value);
            } else if (onChange) {
                onChange(event.target.value);
            }
        });

        input.addEventListener('change', () => {
            updateUI();
            if (onChange) {
                onChange(getValue());
            }
        });

        updateUI();

        return {
            element: sliderDiv,
            getValue,
            setValue,
        };
    };

    return {createSlider};
})();

/**
 * Creates a custom text input component.
 * @function
 * @param {Object} options - Options for configuring the text input.
 * @param {Function} [options.onChange] - Optional callback function to be executed when the text input value changes.
 * @param {string} [options.value] - Optional initial value for the text input.
 * @param {RegExp} [options.regexFilter] - Optional regular expression to filter the input value.
 * @param {string} [options.appendText] - Optional text to append to the input field.
 * @returns {HTMLElement} - The text input component as an HTML element. setValue function is exposed to change the value of the text input.
 */

const textInput = (() => {
    const createTextInput = ({onChange = null, value = '', regexFilter, appendText = ''}) => {
        const inputDiv = document.createElement('div');
        const inputDivContainer = document.createElement('div');
        inputDivContainer.classList.add('text-input-container');

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.classList.add('text-input');

        if (appendText) {
            const appendSpan = document.createElement('span');
            appendSpan.textContent = appendText;
            appendSpan.classList.add('append-text');
            inputDivContainer.appendChild(appendSpan);
        }

        inputDivContainer.insertBefore(input, inputDivContainer.firstChild);
        inputDiv.appendChild(inputDivContainer);

        const setValue = (newValue, triggerOnChange = false) => {
            if (regexFilter && !regexFilter.test(newValue)) {
                console.warn('Invalid value:', newValue);
                return;
            }

            input.value = newValue;

            if (triggerOnChange && onChange) {
                onChange(newValue);
            }
        };

        const getValue = () => input.value;

        const setReadOnly = (readOnly) => {
            input.readOnly = readOnly;
        };

        input.addEventListener('input', (event) => {
            const {value: v, selectionStart} = event.target;
            if (regexFilter && !regexFilter.test(v)) {
                // delete the last character if it doesn't match the regex
                const correctedValue = v.slice(0, selectionStart - 1) + v.slice(selectionStart);
                event.target.value = correctedValue;
                event.target.setSelectionRange(selectionStart - 1, selectionStart - 1);
                return;
            }
            setValue(v, true);
        });

        inputDiv.setValue = setValue;
        inputDiv.getValue = getValue;

        return {
            element: inputDiv,
            setValue,
            getValue,
            setReadOnly,
        };
    };

    return {createTextInput};
})();

module.exports = {switchButton, slider, textInput};
