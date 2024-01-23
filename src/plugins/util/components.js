'use strict';

/**
 * Factory function to create a custom switch button.
 * @namespace
 * @typedef {Object} SwitchButton
 * @property {Function} createSwitch - Function to create and return the switch button component.
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
                slider.style.backgroundColor = '#E6195E';
                sliderBefore.style.transform = 'translateX(26px)';
            } else {
                slider.style.backgroundColor = '#ccc';
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

module.exports = {switchButton};

