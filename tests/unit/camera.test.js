'use strict';

jest.mock('loglevel');

const MediaManager = require('../../src/plugins/MediaManager');
const Camera = require('../../src/plugins/Camera');
const Instance = require('../mocks/DeviceRenderer');

// eslint-disable-next-line no-unused-vars
let mediaManager;
let instance;

describe('Camera Plugin', () => {
    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Camera).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            mediaManager = new MediaManager(instance); // needed for button initialisation
            new Camera(instance, {
                CAMERA_TITLE: 'TEST CAMERA PLUGIN BUTTON TITLE'
            });
        });

        test('is initialized properly at construct', () => {
            // Toolbar button
            expect(document.getElementsByClassName('gm-camera-button')).toHaveLength(1);
        });

        test('has translations', () => {
            const plugin = document.body;
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST CAMERA PLUGIN BUTTON TITLE'));
        });
    });
});
