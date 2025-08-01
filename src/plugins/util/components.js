'use strict';
const log = require('loglevel');
/**
 * Module for creating custom switch button components.
 * @module switchButton
 */
const switchButton = (() => {
    /**
     * Creates a custom switch button component.
     * @param {Object} options - Configuration options for the switch button
     * @param {Function} [options.onChange] - Callback function triggered when switch state changes
     * @param {string} [options.classes] - Additional CSS classes to apply to the switch button
     * @returns {Object} Object containing the switch button element and control methods
     * @property {HTMLElement} element - The switch button DOM element
     * @property {Function} setState - Method to programmatically set the switch state
     * @property {Function} getState - Method to get the current switch state
     */
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
 * Module for creating custom slider components.
 * @module slider
 */
const slider = (() => {
    /**
     * Creates a custom slider component to set a value between a range.
     * @function
     * @param {Object} options - Options for configuring the slider
     * @param {Function} [options.onChange] - Optional callback function to be executed when the slider value changes
     * @param {Function} [options.onCursorMove] - Optional callback function to be executed when the cursor moves
     * @param {number} [options.min=0] - Minimum value of the slider
     * @param {number} [options.max=100] - Maximum value of the slider
     * @param {number} [options.value=50] - Initial value of the slider
     * @param {string} [options.classes=''] - Additional CSS classes to apply to the slider
     * @returns {Object} Object containing the slider element and control methods
     * @property {HTMLElement} element - The slider DOM element
     * @property {Function} setValue - Method to programmatically set the slider value
     * @property {Function} getValue - Method to get the current slider value
     */
    const createSlider = ({onChange = null, onCursorMove = null, min = 0, max = 100, value = 50, classes = ''}) => {
        if (min >= max) {
            throw new Error('`min` must be less than `max`.');
        }

        // Create slider container
        const sliderDiv = document.createElement('div');
        sliderDiv.className = classes;
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
 * Module for creating custom text input components.
 * @module textInput
 */

const textInput = (() => {
    /**
     * Creates a custom text input component.
     * @param {Object} options - Configuration options for the text input
     * @param {Function} [options.onChange] - Callback function triggered when input value changes
     * @param {Function} [options.onBlur] - Callback function triggered when input loses focus
     * @param {string} [options.value=''] - Initial value for the text input
     * @param {RegExp} [options.regexFilter] - Regular expression to filter input values
     * @param {RegExp} [options.regexValidField] - Regular expression to validate input values
     * @param {string} [options.appendText=''] - Text to append to the input field
     * @param {string} [options.unitText=''] - Text shown when there's no error message
     * @param {string} [options.classes=''] - Additional CSS classes for the input container
     * @param {string} [options.placeholder=''] - Placeholder text for the input
     * @param {boolean} [options.messageField=false] - Whether to show message field
     * @returns {Object} Object containing the text input component and methods
     * @returns {HTMLElement} returns.element - The text input component as an HTML element
     * @returns {Function} returns.setValue - Function to update the input value
     * @returns {Function} returns.checkValidity - Function to check if the input value is valid
     * @returns {Function} returns.setReadOnly - Function to set the read-only status of the input
     * @returns {Function} returns.setErrorMessage - Function to set the error message of the input
     */

    const createTextInput = ({
        onChange = null,
        onBlur = null,
        value = '',
        regexFilter,
        regexValidField,
        appendText = '',
        unitText = '',
        classes = '',
        placeholder = '',
        messageField = false,
    }) => {
        const inputDiv = document.createElement('div');
        inputDiv.className = classes;
        inputDiv.classList.add('text-input');
        const inputDivContainer = document.createElement('div');
        inputDivContainer.classList.add('text-input-container');

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
        inputDiv.appendChild(inputDivContainer);

        // Create bottom message container that will hold either error or unit text
        const bottomContainer = document.createElement('div');
        bottomContainer.classList.add('text-input-bottom');
        // Hide bottom container if neither messageField nor unitText is present
        if (!messageField && !unitText) {
            bottomContainer.classList.add('hidden');
        }
        inputDiv.appendChild(bottomContainer);

        // Create error message element
        const inputMessage = document.createElement('div');
        inputMessage.classList.add('text-input-message');
        if (!messageField) {
            inputMessage.classList.add('hidden');
        }
        bottomContainer.appendChild(inputMessage);

        // Create unit text element
        const unitTextSpan = document.createElement('div');
        unitTextSpan.textContent = unitText;
        unitTextSpan.classList.add('text-input-unit');
        if (!unitText) {
            unitTextSpan.classList.add('hidden');
        }
        bottomContainer.appendChild(unitTextSpan);

        // Initialize visibility based on presence of unit text

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
                inputMessage.classList.add('hidden');
                if (unitText) {
                    unitTextSpan.classList.remove('hidden');
                } else {
                    unitTextSpan.classList.add('hidden');
                }
                return;
            }
            inputMessage.classList.add('error');
            inputMessage.setAttribute('data-error', message);
            inputMessage.classList.remove('hidden');
            unitTextSpan.classList.add('hidden');
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

        input.addEventListener('blur', (event) => {
            if (onBlur) {
                onBlur(event.target.value);
            }
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

/**
 * Module for creating custom dropdown components.
 * @module dropdownSelect
 */

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
     * @property {HTMLElement} element - The dropdown DOM element
     * @property {Function} getValue - Method to get the current selected value
     * @property {Function} setValue - Method to set the selected value
     * @property {Function} updateOptions - Method to update the options displayed in the dropdown menu
     * @property {Function} setDisabled - Method to set the disabled status of the dropdown
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

/**
 * Module for creating custom chip tag components.
 * @module chipTag
 */

const chipTag = (() => {
    let tagDiv = null;
    /**
     * Creates a custom chip tag component.
     * @param {Object} options - Configuration options for the chip tag
     * @param {string} [options.type='success'] - Type of the chip tag
     * @param {string} [options.text='Applied'] - Text to display in the chip tag
     * @returns {Object} Object containing the chip tag element and methods
     * @property {HTMLElement} element - The chip tag DOM element
     * @property {Function} setType - Method to set the type of the chip tag
     * @property {Function} setValue - Method to set the text of the chip tag
     */
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

/**
 * Module for creating custom progress bar components.
 * @module progressBar
 */

const progressBar = (() => {
    /**
     * Creates a custom progress bar component.
     * @param {Object} options - Configuration options
     * @param {Function} [options.onChange] - Callback function triggered when progress value changes
     * @param {number} [options.value=0] - Initial value
     * @param {number} [options.max=100] - Maximum value
     * @returns {Object} - Progress bar instance
     */
    const createProgressBar = ({value = 0, onChange = null, max = 100} = {}) => {
        // Create container
        const container = document.createElement('div');
        container.className = 'gm-progress-container';

        // Create bar
        const bar = document.createElement('div');
        bar.className = 'gm-progress-bar';
        container.appendChild(bar);

        // Update the bar width
        const update = () => {
            const percentage = Math.min(100, Math.max(0, (value / max) * 100));
            bar.style.width = `${percentage}%`;
        };

        const setValue = (newValue) => {
            value = Math.max(0, Math.min(newValue, max));
            update();
            if (onChange) {
                onChange(value);
            }
        };

        if (onChange) {
            onChange(value);
        }

        // Initial render
        update();

        return {
            element: container,
            setValue,
            getValue: () => value,
            setMax: (newMax) => {
                max = newMax;
                update();
            },
        };
    };

    return {createProgressBar};
})();

module.exports = {switchButton, slider, textInput, dropdownSelect, chipTag, progressBar};
