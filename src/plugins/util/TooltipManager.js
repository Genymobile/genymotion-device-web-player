'use strict';

/**
 * TooltipManager
 * Allows you to dynamically add tooltips to any HTML element.
 * Usage: tooltipManager.setTooltip(element, 'Tooltip text', 'top');
 */
class TooltipManager {
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
     *  @param {string} [classes] - Optional. Additional classes to add to the tooltip.
     */
    setTooltip(element, text, position, classes=null) {
        if (!element) {
            return;
        }

        this.removeTooltip(element); // Clean up first if already present
        const mouseEnter = () => this.showTooltip(element, text, position, classes);
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

    showTooltip(target, text, preferredPosition, classes) {
        if (classes) {
            classes.split(' ').forEach((cl) => {
                this.tooltipElement.classList.add(cl);
            });
        }
        this.tooltipElement.querySelector('.gm-tooltip-body').textContent = text;
        this.tooltipElement.classList.remove('top', 'bottom', 'left', 'right');

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
        const positions = preferred ? [preferred] : ['bottom', 'left', 'right', 'top'];
        for (const pos of positions) {
            let left, top;
            switch (pos) {
                case 'top': {
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
                    top = rect.top - tooltipRect.height - spacing;
                    if (top > 0) {
                        return {left: Math.max(8, left), top, position: 'top'};
                    }
                    break;
                }
                case 'left': {
                    left = rect.left - tooltipRect.width - spacing;
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    if (left > 0) {
                        return {left, top: Math.max(8, top), position: 'left'};
                    }
                    break;
                }
                case 'right': {
                    left = rect.right + spacing;
                    top = rect.top + (rect.height - tooltipRect.height) / 2;
                    if (left + tooltipRect.width < window.innerWidth) {
                        return {left, top: Math.max(8, top), position: 'right'};
                    }
                    break;
                }
                case 'bottom': {
                    left = rect.left + (rect.width - tooltipRect.width) / 2;
                    top = rect.bottom + spacing;
                    if (top + tooltipRect.height < window.innerHeight) {
                        return {left: Math.max(8, left), top, position: 'bottom'};
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
        return {left: Math.max(8, left), top, position: 'bottom'};
    }
}

module.exports = TooltipManager;
