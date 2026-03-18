import Instance from '../mocks/DeviceRenderer.js';

describe('Toolbar Visibility', () => {
    describe('Floating Toolbar', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        test('should be hidden if toolbar is empty', () => {
            const instance = new Instance({floatingToolbar: true});
            const floatingToolbarWrapper = document.querySelector('.gm-floating-toolbar-wrapper');
            const toolbarWrapper = document.querySelector('.gm-toolbar-wrapper');

            // Check existence
            expect(floatingToolbarWrapper).not.toBeNull();

            // Simulate visibility update
            instance.toolbarManager.updateToolbarVisibility(
                instance.options.displayToolbar, instance.options.floatingToolbar);

            // Should be hidden because empty
            expect(floatingToolbarWrapper.classList.contains('hidden')).toBe(true);
            expect(toolbarWrapper.classList.contains('hidden')).toBe(true);
        });

        test('should be visible when buttons are added', () => {
            const instance = new Instance({floatingToolbar: true});
            const floatingToolbarWrapper = document.querySelector('.gm-floating-toolbar-wrapper');

            // Add a button to floating toolbar
            instance.toolbarManager.registerButton({
                id: 'test-btn',
                iconClass: 'test-icon'
            });
            instance.toolbarManager.renderButton('test-btn', true);

            // Update visibility
            instance.toolbarManager.updateToolbarVisibility(
                instance.options.displayToolbar, instance.options.floatingToolbar);

            // Should be visible
            expect(floatingToolbarWrapper.classList.contains('hidden')).toBe(false);
        });

        test('should not exist when floatingToolbar option is false', () => {
            new Instance({floatingToolbar: false});
            const floatingToolbarWrapper = document.querySelector('.gm-floating-toolbar-wrapper');
            expect(floatingToolbarWrapper.classList.contains('hidden')).toBe(true);
        });
    });

    describe('Main Toolbar', () => {
        afterEach(() => {
            document.body.innerHTML = '';
        });

        test('should be hidden by default (empty)', () => {
            const instance = new Instance({displayToolbar: true});
            const toolbarWrapper = document.querySelector('.gm-toolbar-wrapper');

            expect(toolbarWrapper).not.toBeNull();

            instance.toolbarManager.updateToolbarVisibility(
                instance.options.displayToolbar, instance.options.floatingToolbar);

            expect(toolbarWrapper.classList.contains('hidden')).toBe(true);
        });

        test('should be visible when buttons are added', () => {
            const instance = new Instance({displayToolbar: true});
            const toolbarWrapper = document.querySelector('.gm-toolbar-wrapper');

            instance.toolbarManager.registerButton({
                id: 'main-btn',
                iconClass: 'test-icon'
            });
            instance.toolbarManager.renderButton('main-btn', false);

            instance.toolbarManager.updateToolbarVisibility(
                instance.options.displayToolbar, instance.options.floatingToolbar);

            expect(toolbarWrapper.classList.contains('hidden')).toBe(false);
        });

        test('should be hidden when displayToolbar is false', () => {
            const instance = new Instance({displayToolbar: false});
            const toolbarWrapper = document.querySelector('.gm-toolbar-wrapper');

            // Add button to ensure it's hidden even if not empty
            instance.toolbarManager.registerButton({
                id: 'main-btn',
                iconClass: 'test-icon'
            });
            instance.toolbarManager.renderButton('main-btn', false);

            instance.toolbarManager.updateToolbarVisibility(
                instance.options.displayToolbar, instance.options.floatingToolbar);

            expect(toolbarWrapper.classList.contains('hidden')).toBe(true);
        });
    });
});
