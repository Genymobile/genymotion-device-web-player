import FullScreen from '../../src/plugins/Fullscreen.js';
import Instance from '../mocks/DeviceRenderer.js';

describe('FullScreen Plugin', () => {
    beforeEach(() => {
        const instance = new Instance();
        new FullScreen(instance);
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof FullScreen).toBe('function');
        });
    });

    describe('UI', () => {
        test('is initialized properly at construct', () => {
            // Toolbar button
            expect(document.getElementsByClassName('gm-fullscreen-button')).toHaveLength(1);
        });
    });
});
