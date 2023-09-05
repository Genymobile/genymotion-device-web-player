'use strict';

jest.mock('loglevel');

const MediaManager = require('../../src/plugins/MediaManager');
const Camera = require('../../src/plugins/Camera');
const Instance = require('../mocks/DeviceRenderer');

let mediaManager;
let instance;

describe('Camera Plugin', () => {
    beforeEach(() => {
        instance = new Instance({
            rotation: true,
            volume: true,
            navbar: true,
            power: true
        });
        mediaManager = new MediaManager(instance);
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Camera).toBe('function');
            expect(typeof MediaManager).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
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

    describe('mediaManager', () => {
        let startSpy;
        let stopSpy;

        beforeEach(() => {
            startSpy = jest.spyOn(mediaManager, 'startStreaming');
            stopSpy = jest.spyOn(mediaManager, 'stopStreaming');

            mediaManager.onVideoStreamError = jest.fn();
            mediaManager.addLocalStream = jest.fn();
        });

        afterEach(() => {
            startSpy.mockRestore();
            stopSpy.mockRestore();
            navigator.mediaDevices.getUserMedia.mockRestore();
            mediaManager.onVideoStreamError.mockRestore();
            mediaManager.addVideoStream.mockRestore();
        });

        it('can be toggled on', (done) => {
            const plugin = document.getElementsByClassName('gm-camera-button')[0];

            mediaManager.addVideoStream.mockImplementationOnce(() => {
                expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                expect(startSpy).toHaveBeenCalledTimes(1);
                expect(stopSpy).toHaveBeenCalledTimes(0);
                expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);
                done();
            });

            plugin.click();
        });

        it('can be toggled off', () => {
            const plugin = document.getElementsByClassName('gm-camera-button')[0];

            mediaManager.videoStreaming = true;
            plugin.click();
            expect(startSpy).toHaveBeenCalledTimes(0);
            expect(stopSpy).toHaveBeenCalledTimes(1);
        });

        it('handle mediaDevices errors', (done) => {
            const plugin = document.getElementsByClassName('gm-camera-button')[0];

            mediaManager.onVideoStreamError.mockImplementationOnce(() => {
                expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                expect(startSpy).toHaveBeenCalledTimes(1);
                expect(stopSpy).toHaveBeenCalledTimes(0);
                expect(mediaManager.addLocalStream).toHaveBeenCalledTimes(0);
                expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(1);
                done();
            });
            navigator.mediaDevices.getUserMedia.mockReturnValueOnce(Promise.reject(null));
            plugin.click();
        });
    });
});
