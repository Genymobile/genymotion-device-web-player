/**
 * TooltipManager
 * Allows you to dynamically add tooltips to any HTML element.
 * Usage: tooltipManager.setTooltip(element, 'Tooltip text', 'top');
 */
export default class TooltipManager {
    constructor(instance) {
        this.instance = instance;
        this.tooltipElement = null;
        this.createTooltipElement();
    }

    /**
     * Creates the DOM element for the tooltip (unique, reused)
     */
    createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'gm-tooltip';

        this.instance.root.appendChild(this.tooltipElement);

        const body = document.createElement('div');
        body.className = 'gm-tooltip-body';
        this.tooltipElement.appendChild(body);

        const arrowElement = document.createElement('div');
        arrowElement.className = 'gm-tooltip-arrow';
        this.tooltipElement.appendChild(arrowElement);
    }

    /**
     * Adds a tooltip to an HTML element
     * @param {HTMLElement} element - The target element
     * @param {string} text - The tooltip text
     * @param {string} [position] - 'top'|'bottom'|'left'|'right' - Optional. Preferred position for the element. If not specified, the position will be determined in the following order of preference: 'bottom', 'left', 'right', 'top'.
     * @param {string} [classes] - Optional. Additional classes to add to the tooltip.
     * @param {boolean} [isHTML] - Optional. If true, the tooltip text will be treated as HTML. ⚠️ SECURITY: This can lead to XSS vulnerabilities if the text is not sanitized or injected by users
     */
    setTooltip(element, text, position, classes = null, isHTML = false) {
        // ⚠️ isHTML is used to display HTML content in the tooltip. It should be used with caution, especially if the text content is user-generated (translation, ...).
        if (!element) {
            return;
        }

        this.removeTooltip(element); // Clean up first if already present
        const mouseEnter = () => this.showTooltip(element, text, position, classes, isHTML);
        const mouseLeave = () => this.hideTooltip(classes);

        element.gmTooltipListeners = {mouseEnter, mouseLeave};
        element.addEventListener('mouseenter', mouseEnter);
        element.addEventListener('mouseleave', mouseLeave);
    }

    /**
     * Removes the tooltip from an HTML element
     * @param {HTMLElement} element - The target element
     */
    removeTooltip(element) {
        if (element && element.gmTooltipListeners) {
            element.removeEventListener('mouseenter', element.gmTooltipListeners.mouseEnter);
            element.removeEventListener('mouseleave', element.gmTooltipListeners.mouseLeave);
            delete element.gmTooltipListeners;
        }
    }

    /**
     * Displays the tooltip at the correct position
     * @param {HTMLElement} target - The target element
     * @param {string} text - The text to display
     * @param {string} [preferredPosition] - Preferred position ('top', 'bottom', 'left', 'right')
     */

    showTooltip(target, text, preferredPosition, classes, isHTML) {
        if (classes) {
            classes.split(' ').forEach((cl) => {
                this.tooltipElement.classList.add(cl);
            });
        }
        if (isHTML) {
            this.tooltipElement.querySelector('.gm-tooltip-body').innerHTML = text;
        } else {
            this.tooltipElement.querySelector('.gm-tooltip-body').textContent = text;
        }
        this.tooltipElement.classList.remove('top', 'bottom', 'left', 'right');
        this.resetArrowPosition();

        const pos = this.computePosition(target, preferredPosition);
        this.tooltipElement.style.left = pos.left + 'px';
        this.tooltipElement.style.top = pos.top + 'px';
        this.tooltipElement.classList.add(pos.position);
        this.tooltipElement.classList.remove('gm-hideTooltip');
        this.tooltipElement.classList.add('gm-showTooltip');
    }

    /**
     * Hides the tooltip
     * @param {string|string[]} [classes] - Optional class or array of classes to remove from the tooltip element
     */
    hideTooltip(classes) {
        this.tooltipElement.classList.remove('gm-showTooltip');
        this.tooltipElement.classList.add('gm-hideTooltip');
        if (classes) {
            /*
             * ⚠️ Chrome may skip CSS transitions if style changes happen too quickly
             * Using two requestAnimationFrame calls to ensure consistent animation start,
             * especially across browsers like Firefox and Chrome.
             * This gives the browser enough time to apply initial styles before transitioning.
             */
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    classes.split(' ').forEach((cl) => {
                        this.tooltipElement.classList.remove(cl);
                    });
                });
            });
        }
    }

    /**
     * Calculates the best position for the tooltip
     * @param {HTMLElement} target - The target element
     * @param {string} [preferred] - Preferred position
     * @returns {{left: number, top: number, position: string}} Object containing the coordinates and the chosen position
     */
    computePosition(target, preferred) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const spacing = 10;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 8;
        const maxLeft = Math.max(padding, viewportWidth - tooltipRect.width - padding);
        const maxTop = Math.max(padding, viewportHeight - tooltipRect.height - padding);
        // These functions ensure the tooltip stays within the viewport and adjust the arrow position accordingly
        const clampLeft = (left, position, top) => {
            const clamped = Math.min(Math.max(padding, left), maxLeft);
            if (clamped !== left) {
                this.updateArrowPosition(target, position, clamped, top);
            }
            return clamped;
        };
        const clampTop = (top, position, left) => {
            const clamped = Math.min(Math.max(padding, top), maxTop);
            if (clamped !== top) {
                this.updateArrowPosition(target, position, left, clamped);
            }
            return clamped;
        };
        // These functions check if the tooltip fits within the viewport
        const fitsHorizontally = (left) => left >= padding && left + tooltipRect.width <= viewportWidth - padding;
        const fitsVertically = (top) => top >= padding && top + tooltipRect.height <= viewportHeight - padding;
        const positions = preferred ? [preferred] : ['bottom', 'left', 'right', 'top'];
        for (const pos of positions) {
            let left, top;
            switch (pos) {
                case 'top': {
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
                    top = rect.top - tooltipRect.height - spacing;
                    if (fitsVertically(top)) {
                        return {left: clampLeft(left, 'top', top), top: clampTop(top, 'top', left), position: 'top'};
                    }
                    break;
                }
                case 'left': {
                    left = rect.left - tooltipRect.width - spacing;
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    if (fitsHorizontally(left)) {
                        return {left: clampLeft(left, 'left', top), top: clampTop(top, 'left', left), position: 'left'};
                    }
                    break;
                }
                case 'right': {
                    left = rect.right + spacing;
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    if (fitsHorizontally(left)) {
                        return {
                            left: clampLeft(left, 'right', top),
                            top: clampTop(top, 'right', left),
                            position: 'right',
                        };
                    }
                    break;
                }
                case 'bottom': {
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
                    top = rect.bottom + spacing;
                    if (fitsVertically(top)) {
                        return {
                            left: clampLeft(left, 'bottom', top),
                            top: clampTop(top, 'bottom', left),
                            position: 'bottom',
                        };
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }
        const left = rect.left + (rect.width - tooltipRect.width) / 2;
        const top = rect.bottom + spacing;
        return {left: clampLeft(left, 'bottom', top), top: clampTop(top, 'bottom', left), position: 'bottom'};
    }

    resetArrowPosition() {
        const arrow = this.tooltipElement.querySelector('.gm-tooltip-arrow');
        if (!arrow) {
            return;
        }
        arrow.style.removeProperty('--gm-tooltip-arrow-left');
        arrow.style.removeProperty('--gm-tooltip-arrow-top');
    }

    updateArrowPosition(target, position, tooltipLeft, tooltipTop) {
        const arrow = this.tooltipElement.querySelector('.gm-tooltip-arrow');
        if (!arrow) {
            return;
        }

        const targetRect = target.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const padding = 12;

        if (position === 'top' || position === 'bottom') {
            const targetCenterX = targetRect.left + targetRect.width / 2;
            const tooltipLeftValue = typeof tooltipLeft === 'number' ? tooltipLeft : tooltipRect.left;
            const arrowLeft = targetCenterX - tooltipLeftValue;
            const clampedLeft = Math.min(Math.max(padding, arrowLeft), tooltipRect.width - padding);
            arrow.style.setProperty('--gm-tooltip-arrow-left', `${clampedLeft}px`);
        }

        if (position === 'left' || position === 'right') {
            const targetCenterY = targetRect.top + targetRect.height / 2;
            const tooltipTopValue = typeof tooltipTop === 'number' ? tooltipTop : tooltipRect.top;
            const arrowTop = targetCenterY - tooltipTopValue;
            const clampedTop = Math.min(Math.max(padding, arrowTop), tooltipRect.height - padding);
            arrow.style.setProperty('--gm-tooltip-arrow-top', `${clampedTop}px`);
        }
    }
}
