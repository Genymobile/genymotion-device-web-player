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
    const createSwitch = ({onChange}) => {
        // Todo reprendre ce code pour passer par une classe
        const switchDiv = document.createElement('div');
        switchDiv.style.position = 'relative';
        switchDiv.style.display = 'inline-block';
        switchDiv.style.width = '50px';
        switchDiv.style.height = '20px';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.style.opacity = '0';
        input.style.width = '0';
        input.style.height = '0';

        const slider = document.createElement('span');
        slider.style.position = 'absolute';
        slider.style.cursor = 'pointer';
        slider.style.top = '0';
        slider.style.left = '0';
        slider.style.right = '0';
        slider.style.bottom = '0';
        slider.style.backgroundColor = '#ccc';
        slider.style.transition = '.4s';
        slider.style.borderRadius = '15px';

        const sliderBefore = document.createElement('span');

        sliderBefore.style.position = 'absolute';
        sliderBefore.style.content = '';
        sliderBefore.style.height = '30px';
        sliderBefore.style.width = '30px';
        sliderBefore.style.left = '-3px';
        sliderBefore.style.bottom = '-5px';
        sliderBefore.style.backgroundColor = 'white';
        sliderBefore.style.transition = '.4s';
        sliderBefore.style.borderRadius = '50%';

        slider.appendChild(sliderBefore);

        switchDiv.appendChild(input);
        switchDiv.appendChild(slider);

        const changeStateRenderer = () => {
            if (input.checked) {
                slider.style.backgroundColor = 'color-mix(in srgb, var(--gm-primary-color), black 45%)';
                sliderBefore.style.backgroundColor = 'var(--gm-primary-color)';
                sliderBefore.style.transform = 'translateX(26px)';
            } else {
                slider.style.backgroundColor = 'color-mix(in srgb, var(--gm-text-color), black 45%)';
                sliderBefore.style.backgroundColor = 'var(--gm-text-color)';
                sliderBefore.style.transform = 'translateX(0)';
            }
            if (onChange && typeof onChange === 'function') {
                onChange(input.checked);
            }
        };

        // Expose a function to change the state of the switch button
        const setState = (value) => {
            // avoid infinite loop
            if (input.checked === value) {
                return;
            }
            input.checked = value;
            changeStateRenderer();
        };

        // Bind event listeners to the switch button click event
        slider.addEventListener('click', () => {
            // Toggle button status on/off
            setState(!input.checked);
        });

        switchDiv.setState = setState;

        return switchDiv;
    };
    return {createSwitch};
})();

/**
 * Creates a custom slider component to set a value between a range.
 * @function
 * @param {Object} options - Options for configuring the slider.
 * @param {Function} [options.onChange] - Optional callback function to be executed when the slider value changes.
 * @returns {HTMLElement} - The slider component as an HTML element. setValue function is exposed to change the value of the slider.
 */

const slider = (() => {
    const createSlider = ({onChange = null, onCursorMove = null, min = 0, max = 100, value = 50}) => {
        // Validate parameters
        if (min >= max) {
            throw new Error('`min` must be less than `max`.');
        }
        if (value < min || value > max) {
            throw new Error('`value` must be within the range defined by `min` and `max`.');
        }

        // Container for the slider
        const sliderDiv = document.createElement('div');
        sliderDiv.classList.add('slider');

        // Progress bar first part
        const progressBar = document.createElement('div');
        progressBar.classList.add('slider-progress-bar');
        sliderDiv.appendChild(progressBar);

        // Progress bar second part
        const progressBarRemaining = document.createElement('div');
        progressBarRemaining.classList.add('slider-progress-bar-remaining');
        sliderDiv.appendChild(progressBarRemaining);

        // Custom cursor element
        const sliderCursor = document.createElement('span');
        sliderCursor.classList.add('slider-cursor');
        sliderDiv.appendChild(sliderCursor);

        // Hidden input range element
        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = value;
        input.classList.add('slider-input');
        sliderDiv.appendChild(input);

        // Update slider UI
        const updateSlider = () => {
            // requestAnimationFrame assures that div element have css properties applied before running the code
            requestAnimationFrame(() => {
                sliderDiv.value = input.value;
                const val = parseFloat(input.value);
                const percentage = ((val - min) / (max - min)) * 100;

                // Actual cursor width in pixels
                const cursorWidth = sliderCursor.offsetWidth;
                const sliderWidth = sliderDiv.offsetWidth;

                // Dynamic adjustment to avoid overflow
                const offset = (cursorWidth / 2 / sliderWidth) * 100; // Offset in percentage
                let adjustedPercentage = percentage;

                adjustedPercentage = `${percentage - offset}%`;

                progressBar.style.width = `${percentage}%`;
                sliderCursor.style.left = `${adjustedPercentage}`;

                // Slider thumb position adjustment
                const calc = ((percentage / 100) * 16 - 8) * -1;
                sliderCursor.style.transform = `translate(${calc}px, -50%)`;
            });
        };

        // Programmatically set the value of the slider
        const setValue = (newValue) => {
            // avoid infinite loop
            if (input.value === newValue) {
                return;
            }
            if (newValue < min || newValue > max) {
                throw new Error('`value` must be within the range defined by `min` and `max`.');
            }
            input.value = newValue;
            updateSlider();
        };

        input.onchange = (event) => {
            if (onChange) {
                onChange(event);
            }
            updateSlider();
        };

        input.oninput = (event) => {
            if (onCursorMove) {
                onCursorMove(event);
            } else if (onChange) {
                onChange(event);
            }
            updateSlider();
        };

        updateSlider();

        sliderDiv.setValue = setValue;
        sliderDiv.value = input.value;
        return sliderDiv;
    };

    return {createSlider};
})();

module.exports = {switchButton, slider};
