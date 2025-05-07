'use strict';

const Instance = require('../mocks/DeviceRenderer');

describe('Floating Toolbar', () => {
    describe('when floatingToolbar is true', () => {
        test('should display floating toolbar', () => {
            new Instance({floatingToolbar: true});
            const floatingToolbar = document.querySelector('.gm-floating-toolbar-wrapper');
            expect(floatingToolbar).not.toBeNull();
            expect(floatingToolbar.style.display).not.toBe('none');
        });
    });

    describe('when floatingToolbar is false', () => {
        test('should not display floating toolbar', () => {
            new Instance({floatingToolbar: false});
            const floatingToolbar = document.querySelector('.gm-floating-toolbar-wrapper');
            expect(floatingToolbar).toBeNull();
        });
    });
});
