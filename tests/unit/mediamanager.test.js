import {vi} from 'vitest';

vi.mock('loglevel');

import MediaManager from '../../src/plugins/MediaManager.js';
import Instance from '../mocks/DeviceRenderer.js';

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
            startVideoSpy = vi.spyOn(mediaManager, 'startVideoStreaming');
            stopVideoSpy = vi.spyOn(mediaManager, 'stopVideoStreaming');
            startAudioSpy = vi.spyOn(mediaManager, 'startAudioStreaming');
            stopAudioSpy = vi.spyOn(mediaManager, 'stopAudioStreaming');

            mediaManager.onVideoStreamError = vi.fn();
            mediaManager.onAudioStreamError = vi.fn();
            mediaManager.addVideoStream = vi.fn();
            mediaManager.addAudioStream = vi.fn();
            mediaManager.removeVideoStream = vi.fn();
            mediaManager.removeAudioStream = vi.fn();
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
            mediaManager.removeVideoStream.mockRestore();
            mediaManager.removeAudioStream.mockRestore();
        });

        it('video can be toggled on', async() => {
            const videoStreamAdded = new Promise((resolve) => {
                mediaManager.addVideoStream.mockImplementationOnce(() => {
                    // Toutes les assertions et appels de spy se font ici :
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                    expect(startVideoSpy).toHaveBeenCalledTimes(1);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(startAudioSpy).toHaveBeenCalledTimes(0);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.videoStreaming).toBeTruthy();
                    expect(mediaManager.audioStreaming).toBeFalsy();
                    expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);

                    resolve();
                });
            });

            mediaManager.toggleVideoStreaming();

            await videoStreamAdded;
        });

        it('video can be toggled off', () => {
            mediaManager.videoStreaming = true;
            mediaManager.toggleVideoStreaming();
            expect(startVideoSpy).toHaveBeenCalledTimes(0);
            expect(stopVideoSpy).toHaveBeenCalledTimes(1);
            expect(startAudioSpy).toHaveBeenCalledTimes(0);
            expect(stopAudioSpy).toHaveBeenCalledTimes(0);
        });

        it('audio can be toggled on', async() => {
            const audioStreamAdded = new Promise((resolve) => {
                mediaManager.addAudioStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                    expect(startAudioSpy).toHaveBeenCalledTimes(1);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(startVideoSpy).toHaveBeenCalledTimes(0);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.audioStreaming).toBeTruthy();
                    expect(mediaManager.videoStreaming).toBeFalsy();
                    expect(mediaManager.onAudioStreamError).toHaveBeenCalledTimes(0);
                    resolve();
                });
            });

            mediaManager.toggleAudioStreaming();

            await audioStreamAdded;
        });

        it('audio can be toggled off', () => {
            mediaManager.audioStreaming = true;
            mediaManager.toggleAudioStreaming();
            expect(startAudioSpy).toHaveBeenCalledTimes(0);
            expect(stopAudioSpy).toHaveBeenCalledTimes(1);
            expect(startVideoSpy).toHaveBeenCalledTimes(0);
            expect(stopVideoSpy).toHaveBeenCalledTimes(0);
        });

        it('handles mediaDevices video errors', async() => {
            const videoStreamError = new Promise((resolve) => {
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
                    resolve();
                });
            });
            navigator.mediaDevices.getUserMedia.mockReturnValueOnce(Promise.reject(null));
            mediaManager.toggleVideoStreaming();

            await videoStreamError;
        });

        it('handles mediaDevices audio errors', async() => {
            const audioStreamError = new Promise((resolve) => {
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
                    resolve();
                });
            });
            navigator.mediaDevices.getUserMedia.mockReturnValueOnce(Promise.reject(null));
            mediaManager.toggleAudioStreaming();

            await audioStreamError;
        });

        it('handles stopping when not started', () => {
            mediaManager.videoStreaming = false;
            mediaManager.audioStreaming = false;
            mediaManager.stopVideoStreaming();
            mediaManager.stopAudioStreaming();

            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(0);
            expect(startAudioSpy).toHaveBeenCalledTimes(0);
            expect(stopAudioSpy).toHaveBeenCalledTimes(1);
            expect(startVideoSpy).toHaveBeenCalledTimes(0);
            expect(stopVideoSpy).toHaveBeenCalledTimes(1);
            expect(mediaManager.addAudioStream).toHaveBeenCalledTimes(0);
            expect(mediaManager.addVideoStream).toHaveBeenCalledTimes(0);
            expect(mediaManager.removeAudioStream).toHaveBeenCalledTimes(0);
            expect(mediaManager.removeVideoStream).toHaveBeenCalledTimes(0);
            expect(mediaManager.videoStreaming).toBeFalsy();
            expect(mediaManager.audioStreaming).toBeFalsy();
        });

        it('handles starting video when audio is streaming', async() => {
            mediaManager.audioStreaming = true;

            const videoStreamAdded = new Promise((resolve) => {
                mediaManager.addVideoStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                    expect(startVideoSpy).toHaveBeenCalledTimes(1);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(startAudioSpy).toHaveBeenCalledTimes(0);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);
                    expect(mediaManager.videoStreaming).toBeTruthy();
                    resolve();
                });
            });

            mediaManager.toggleVideoStreaming();

            await videoStreamAdded;
        });

        it('handles starting audio when video is streaming', async() => {
            mediaManager.videoStreaming = true;

            const audioStreamAdded = new Promise((resolve) => {
                mediaManager.addAudioStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                    expect(startAudioSpy).toHaveBeenCalledTimes(1);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(startVideoSpy).toHaveBeenCalledTimes(0);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.onAudioStreamError).toHaveBeenCalledTimes(0);
                    expect(mediaManager.audioStreaming).toBeTruthy();
                    resolve();
                });
            });

            mediaManager.toggleAudioStreaming();

            await audioStreamAdded;
        });

        it('handles stopping video when audio is streaming', async() => {
            mediaManager.videoStreaming = true;
            mediaManager.audioStreaming = true;

            const videoStreamRemoved = new Promise((resolve) => {
                mediaManager.removeVideoStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(0);
                    expect(startVideoSpy).toHaveBeenCalledTimes(0);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(1);
                    expect(startAudioSpy).toHaveBeenCalledTimes(0);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);
                    resolve();
                });
            });

            mediaManager.toggleVideoStreaming();

            await videoStreamRemoved;
        });

        it('handles stopping audio when video is streaming', async() => {
            mediaManager.videoStreaming = true;
            mediaManager.audioStreaming = true;

            const audioStreamRemoved = new Promise((resolve) => {
                mediaManager.removeAudioStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(0);
                    expect(startVideoSpy).toHaveBeenCalledTimes(0);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(startAudioSpy).toHaveBeenCalledTimes(0);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(1);
                    expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);
                    resolve();
                });
            });

            mediaManager.toggleAudioStreaming();

            await audioStreamRemoved;
        });
    });
});
