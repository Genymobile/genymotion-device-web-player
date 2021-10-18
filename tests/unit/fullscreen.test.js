
'use strict';

const FullScreen = require('../../src/plugins/Fullscreen');
const Instance = require('../mocks/GenymotionInstance');

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
