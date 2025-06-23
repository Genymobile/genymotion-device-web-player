'use strict';

const Instance = require('../mocks/DeviceRenderer');

describe('TooltipManager', () => {
    let tooltipManager;
    let button;

    beforeEach(() => {
        const instance = new Instance();

        tooltipManager = instance.tooltipManager;
        button = document.createElement('button');
        button.textContent = 'Toolbar Button';
        document.body.appendChild(button);
    });

    it('should add a tooltip to a button and show it on mouseover', () => {
        tooltipManager.setTooltip(button, 'Tooltip text', 'top');
        // Simulate mouseenter
        button.dispatchEvent(new Event('mouseenter'));
        // Tooltip should be visible (has gm-showTooltip class)
        const tooltip = document.querySelector('.gm-tooltip');
        expect(tooltip).not.toBeNull();
        expect(tooltip.classList.contains('gm-showTooltip')).toBe(true);
        // Tooltip text should be correct
        expect(tooltip.querySelector('.gm-tooltip-body').textContent).toBe('Tooltip text');
    });

    it('should hide the tooltip on mouseleave', () => {
        tooltipManager.setTooltip(button, 'Tooltip text', 'top');
        button.dispatchEvent(new Event('mouseenter'));
        button.dispatchEvent(new Event('mouseleave'));
        const tooltip = document.querySelector('.gm-tooltip');
        expect(tooltip.classList.contains('gm-showTooltip')).toBe(false);
    });
});
