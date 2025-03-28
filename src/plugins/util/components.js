'use strict';
const log = require('loglevel');

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
    const createSwitch = ({onChange = null, classes = ''}) => {
        const switchDiv = document.createElement('div');
        switchDiv.className = classes + ' switch';

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
                log.warn('`value` must be within the range defined by `min` and `max`.');
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
    const createTextInput = ({
        onChange = null,
        value = '',
        regexFilter,
        regexValidField,
        appendText = '',
        classes = '',
        placeholder = '',
        messageField = false,
    }) => {
        const inputDiv = document.createElement('div');
        inputDiv.className = classes;
        inputDiv.classList.add('text-input');
        const inputDivContainer = document.createElement('div');
        inputDivContainer.classList.add('text-input-container');

        const inputMessage = document.createElement('div');
        inputMessage.classList.add('text-input-message');
        inputDiv.appendChild(inputDivContainer);
        inputDiv.appendChild(inputMessage);
        if (!messageField) {
            inputMessage.style.display = 'none';
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.classList.add('input');
        input.placeholder = placeholder;

        if (appendText) {
            const appendSpan = document.createElement('span');
            appendSpan.textContent = appendText;
            appendSpan.classList.add('append-text');
            inputDivContainer.appendChild(appendSpan);
        }

        inputDivContainer.insertBefore(input, inputDivContainer.firstChild);

        const setValue = (newValue, triggerOnChange = false) => {
            if (regexFilter && !regexFilter.test(newValue)) {
                log.warn('Invalid value:', newValue);
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

        const setErrorMessage = (message) => {
            if (!message) {
                inputMessage.classList.remove('error');
                inputMessage.removeAttribute('data-error');
                return;
            }
            inputMessage.classList.add('error');
            inputMessage.setAttribute('data-error', message);
        };

        const checkValidity = () => {
            if (regexValidField && regexValidField.test(input.value)) {
                return true;
            }
            return false;
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
            checkValidity,
            setReadOnly,
            setErrorMessage,
        };
    };

    return {createTextInput};
})();

const dropdownSelect = (() => {
    /**
     * Creates a custom dropdown component.
     * @param {Object} options - Configuration options for the dropdown.
     * @param {Array} [options.items] - The initial list of items to display in the dropdown menu.
     * @param {Function} [options.onChange] - Optional callback triggered when the selected value changes.
     * @param {string} [options.value] - Initial selected value.
     * @param {boolean} [options.hasCheckmark] - Whether to display a checkmark next to the selected item.
     * @param {string} [options.classes] - Additional classes to apply to the dropdown.
     * @param {number} [options.dropdownMaxHeight] - Maximum height of the dropdown menu.
     * @returns {Object} - Dropdown component with methods to interact with it.
     */
    const createDropdown = ({
        items = [],
        onChange = null,
        value = '',
        hasCheckmark = false,
        classes = '',
        dropdownMaxHeight = null,
    }) => {
        let selectedValue = value ?? 'Select...';
        const dropdownDiv = document.createElement('div');
        dropdownDiv.className = classes + ' dropdown';

        // Create the div displaying the selected value
        const selectedValueDiv = document.createElement('div');
        selectedValueDiv.className = 'dropdown-selected';
        selectedValueDiv.textContent = value ?? 'Select...';
        dropdownDiv.appendChild(selectedValueDiv);

        // Create the menu div where options will be appended
        const dropdownMenuDiv = document.createElement('div');
        dropdownMenuDiv.className = 'dropdown-menu';
        if (dropdownMaxHeight) {
            dropdownMenuDiv.style.maxHeight = dropdownMaxHeight + 'px';
        }
        dropdownDiv.appendChild(dropdownMenuDiv);

        /**
         * Synchronizes the width of the dropdown menu to match the selected value display.
         */
        const synchronizeMenuWidth = () => {
            const width = selectedValueDiv.offsetWidth;
            dropdownMenuDiv.style.width = `${width}px`;
        };

        /**
         * Adds a checkmark to the selected item in the dropdown.
         * @param {Array} itemsArr - The list of items to display in the dropdown menu.
         */
        const addCheckmark = (itemsArr) => {
            itemsArr.forEach((item) => {
                // remove all checkmark
                const checkmarkDiv = item.element.parentElement.querySelector('.dropdown-checkmark');
                if (checkmarkDiv) {
                    item.element.parentElement.removeChild(checkmarkDiv);
                }

                if (item.value === selectedValue || item === selectedValue) {
                    const checkmark = document.createElement('div');
                    checkmark.className = 'dropdown-checkmark';
                    item.element.parentElement.appendChild(checkmark);
                }
            });
        };

        /**
         * Gets the current selected value from the dropdown.
         * @returns {string} - The current selected value.
         */
        const getValue = () => selectedValue;

        /**
         * Sets the selected value in the dropdown and triggers onChange if necessary.
         * @param {object} item - The new selected item.
         * @param {boolean} [triggerOnChange=false] - Whether to trigger the onChange callback.
         */
        const setValue = (item, triggerOnChange = false) => {
            let itemValue, valueToDisplay;
            if (typeof item === 'object' && 'value' in item && 'element' in item) {
                itemValue = item.value;
                valueToDisplay = item.valueToDisplay ?? item.element.innerHTML ?? item.value;
            }

            // Only update if the new value is different from the current one
            if (selectedValueDiv.innerHTML === itemValue || selectedValueDiv.innerHTML === valueToDisplay) {
                return;
            }

            selectedValueDiv.innerHTML = valueToDisplay || itemValue;
            selectedValue = itemValue;

            // update options checkmark if the value is selected
            if (hasCheckmark) {
                addCheckmark(items);
            }

            // Trigger onChange callback if provided
            if (triggerOnChange && onChange) {
                onChange(selectedValue);
            }
        };

        /**
         * Updates the options displayed in the dropdown menu.
         * Clears current options and appends the new ones.
         * @param {Array} newItems - The new list of items to display in the dropdown.
         */
        const updateOptions = (newItems) => {
            items = newItems;
            // Clear current options before appending new ones
            dropdownMenuDiv.innerHTML = '';
            // if selectedValue is not in the newItems, reset the selectedValue
            if (!newItems.some((item) => item.value === selectedValue)) {
                selectedValueDiv.textContent = 'Select...';
            }

            // Iterate through newItems to create and append dropdown options
            newItems.forEach((item) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'dropdown-item';

                // Check if the item is a string, object with label, or a custom element
                if (typeof item === 'string') {
                    optionDiv.innerHTML = item;
                } else if (
                    typeof item === 'object' &&
                    typeof item.value !== 'undefined' &&
                    item.element &&
                    item.element instanceof HTMLElement
                ) {
                    optionDiv.appendChild(item.element);
                } else {
                    log.warn('Invalid item. Need at least props element and value. Item', item);
                    return;
                }

                // Add event listener for option click
                optionDiv.addEventListener('click', () => {
                    setValue(item, true);
                    dropdownDiv.classList.remove('open');
                });

                dropdownMenuDiv.appendChild(optionDiv);
            });
        };

        // Initialize dropdown with provided items
        updateOptions(items);
        // update options checkmark if the value is selected
        if (hasCheckmark) {
            addCheckmark(items);
        }

        // Toggle dropdown visibility when the selected value div is clicked
        selectedValueDiv.addEventListener('click', () => {
            synchronizeMenuWidth();
            dropdownDiv.classList.toggle('open');
        });

        // Close the dropdown if the user clicks outside of it
        document.addEventListener('click', (event) => {
            if (!dropdownDiv.contains(event.target)) {
                dropdownDiv.classList.remove('open');
            }
        });

        const setDisabled = (status = false) => {
            // Set the disabled status of the dropdown
            if (status) {
                dropdownDiv.classList.add('disabled');
            } else {
                dropdownDiv.classList.remove('disabled');
            }
        };
        // Return the dropdown element and helper methods for interaction
        return {
            element: dropdownDiv,
            getValue,
            setValue,
            updateOptions, // Expose method to dynamically update options
            setDisabled,
        };
    };

    // Expose createDropdown method for external usage
    return {createDropdown};
})();

const chipTag = (() => {
    let tagDiv = null;
    const createChip = ({type = 'success', text = 'Applied'} = {}) => {
        tagDiv = document.createElement('div');
        tagDiv.className = 'gm-tag-' + type;

        const container = document.createElement('div');
        container.className = 'gm-tag-container';
        container.textContent = text;
        tagDiv.appendChild(container);

        const setType = (newType) => {
            tagDiv.className = 'gm-tag-' + newType;
        };

        const setValue = (newText) => {
            container.textContent = newText;
        };

        return {
            element: tagDiv,
            setType,
            setValue,
        };
    };

    return {createChip};
})();

module.exports = {switchButton, slider, textInput, dropdownSelect, chipTag};
