'use strict';

jest.mock('loglevel');

const MediaManager = require('../../src/plugins/MediaManager');
const Instance = require('../mocks/DeviceRenderer');

let mediaManager;
let instance;

describe('Camera Plugin', () => {
    beforeEach(() => {
        instance = new Instance({
            rotation: true,
            volume: true,
            navbar: true,
            power: true,
            microphone: true,
        });
        mediaManager = new MediaManager(instance);
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof MediaManager).toBe('function');
        });
    });

    describe('mediaManager', () => {
        let startVideoSpy;
        let stopVideoSpy;
        let startAudioSpy;
        let stopAudioSpy;

        beforeEach(() => {
            startVideoSpy = jest.spyOn(mediaManager, 'startVideoStreaming');
            stopVideoSpy = jest.spyOn(mediaManager, 'stopVideoStreaming');
            startAudioSpy = jest.spyOn(mediaManager, 'startAudioStreaming');
            stopAudioSpy = jest.spyOn(mediaManager, 'stopAudioStreaming');

            mediaManager.onVideoStreamError = jest.fn();
            mediaManager.onAudioStreamError = jest.fn();
            mediaManager.addVideoStream = jest.fn();
            mediaManager.addAudioStream = jest.fn();
        });

        afterEach(() => {
            startVideoSpy.mockRestore();
            stopVideoSpy.mockRestore();
            startAudioSpy.mockRestore();
            stopAudioSpy.mockRestore();
            navigator.mediaDevices.getUserMedia.mockRestore();
            mediaManager.onVideoStreamError.mockRestore();
            mediaManager.onAudioStreamError.mockRestore();
            mediaManager.addVideoStream.mockRestore();
            mediaManager.addAudioStream.mockRestore();
        });

        it('video can be toggled on', (done) => {
            mediaManager.addVideoStream.mockImplementationOnce(() => {
                expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                expect(startVideoSpy).toHaveBeenCalledTimes(1);
                expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                expect(startAudioSpy).toHaveBeenCalledTimes(0);
                expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);
                done();
            });

            mediaManager.toggleVideoStreaming();
        });

        it('video can be toggled off', () => {
            mediaManager.videoStreaming = true;
            mediaManager.toggleVideoStreaming();
            expect(startVideoSpy).toHaveBeenCalledTimes(0);
            expect(stopVideoSpy).toHaveBeenCalledTimes(1);
            expect(startAudioSpy).toHaveBeenCalledTimes(0);
            expect(stopAudioSpy).toHaveBeenCalledTimes(0);
        });

        it('audio can be toggled on', (done) => {
            mediaManager.addAudioStream.mockImplementationOnce(() => {
                expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                expect(startAudioSpy).toHaveBeenCalledTimes(1);
                expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                expect(startVideoSpy).toHaveBeenCalledTimes(0);
                expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                expect(mediaManager.onAudioStreamError).toHaveBeenCalledTimes(0);
                done();
            });

            mediaManager.toggleAudioStreaming();
        });

        it('audio can be toggled off', () => {
            mediaManager.audioStreaming = true;
            mediaManager.toggleAudioStreaming();
            expect(startAudioSpy).toHaveBeenCalledTimes(0);
            expect(stopAudioSpy).toHaveBeenCalledTimes(1);
            expect(startVideoSpy).toHaveBeenCalledTimes(0);
            expect(stopVideoSpy).toHaveBeenCalledTimes(0);
        });

        it('handle mediaDevices video errors', (done) => {
            mediaManager.onVideoStreamError.mockImplementationOnce(() => {
                expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                expect(startVideoSpy).toHaveBeenCalledTimes(1);
                expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                expect(startAudioSpy).toHaveBeenCalledTimes(0);
                expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                expect(mediaManager.addVideoStream).toHaveBeenCalledTimes(0);
                expect(mediaManager.addAudioStream).toHaveBeenCalledTimes(0);
                expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(1);
                expect(mediaManager.onAudioStreamError).toHaveBeenCalledTimes(0);
                done();
            });
            navigator.mediaDevices.getUserMedia.mockReturnValueOnce(Promise.reject(null));
            mediaManager.toggleVideoStreaming();
        });

        it('handle mediaDevices audio errors', (done) => {
            mediaManager.onAudioStreamError.mockImplementationOnce(() => {
                expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                expect(startAudioSpy).toHaveBeenCalledTimes(1);
                expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                expect(startVideoSpy).toHaveBeenCalledTimes(0);
                expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                expect(mediaManager.addAudioStream).toHaveBeenCalledTimes(0);
                expect(mediaManager.addVideoStream).toHaveBeenCalledTimes(0);
                expect(mediaManager.onAudioStreamError).toHaveBeenCalledTimes(1);
                expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);
                done();
            });
            navigator.mediaDevices.getUserMedia.mockReturnValueOnce(Promise.reject(null));
            mediaManager.toggleAudioStreaming();
        });
    });
});
