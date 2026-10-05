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

        it('audio can be started', async () => {
            const audioStreamAdded = new Promise((resolve) => {
                mediaManager.addAudioStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                    expect(startAudioSpy).toHaveBeenCalledTimes(1);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(startVideoSpy).toHaveBeenCalledTimes(0);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.onAudioStreamError).toHaveBeenCalledTimes(0);
                    resolve();
                });
            });

            mediaManager.startAudioStreaming();

            await audioStreamAdded;
        });

        it('audio can be stopped', () => {
            mediaManager.localAudioStream = {};
            mediaManager.stopAudioStreaming();
            expect(startAudioSpy).toHaveBeenCalledTimes(0);
            expect(stopAudioSpy).toHaveBeenCalledTimes(1);
            expect(startVideoSpy).toHaveBeenCalledTimes(0);
            expect(stopVideoSpy).toHaveBeenCalledTimes(0);
        });

        it('handles mediaDevices video errors', async () => {
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
            mediaManager.startVideoStreaming();

            await videoStreamError;
        });

        it('handles mediaDevices audio errors', async () => {
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
            mediaManager.startAudioStreaming();

            await audioStreamError;
        });

        it('handles stopping when not started', () => {
            mediaManager.localAudioStream = null;
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
        });

        it('handles starting video when audio is streaming', async () => {
            mediaManager.localAudioStream = {};

            const videoStreamAdded = new Promise((resolve) => {
                mediaManager.addVideoStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                    expect(startVideoSpy).toHaveBeenCalledTimes(1);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(startAudioSpy).toHaveBeenCalledTimes(0);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.onVideoStreamError).toHaveBeenCalledTimes(0);
                    resolve();
                });
            });

            mediaManager.startVideoStreaming();

            await videoStreamAdded;
        });

        it('handles starting audio when video is streaming', async () => {
            const audioStreamAdded = new Promise((resolve) => {
                mediaManager.addAudioStream.mockImplementationOnce(() => {
                    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
                    expect(startAudioSpy).toHaveBeenCalledTimes(1);
                    expect(stopAudioSpy).toHaveBeenCalledTimes(0);
                    expect(startVideoSpy).toHaveBeenCalledTimes(0);
                    expect(stopVideoSpy).toHaveBeenCalledTimes(0);
                    expect(mediaManager.onAudioStreamError).toHaveBeenCalledTimes(0);
                    resolve();
                });
            });

            mediaManager.startAudioStreaming();

            await audioStreamAdded;
        });

        it('handles stopping audio when video is streaming', async () => {
            mediaManager.localAudioStream = {};

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

            mediaManager.stopAudioStreaming();

            await audioStreamRemoved;
        });

        it('preserves injected local video streams during a transient peer connection reset', async () => {
            const frontStream = {getVideoTracks: () => [{kind: 'video'}], getAudioTracks: () => []};
            const backStream = {getVideoTracks: () => [{kind: 'video'}], getAudioTracks: () => []};
            mediaManager.localFrontVideoStream = frontStream;
            mediaManager.localBackVideoStream = backStream;
            mediaManager.frontCameraSender = {replaceTrack: vi.fn(), setStreams: vi.fn()};
            mediaManager.backCameraSender = {replaceTrack: vi.fn(), setStreams: vi.fn()};

            mediaManager.addVideoStream = vi.fn().mockResolvedValue(true);

            instance.store.dispatch({type: 'WEBRTC_SESSION_STABLE', payload: true});
            instance.store.dispatch({type: 'WEBRTC_SESSION_STABLE', payload: false});

            expect(mediaManager.localFrontVideoStream).toBe(frontStream);
            expect(mediaManager.localBackVideoStream).toBe(backStream);
            expect(mediaManager.frontCameraSender).toBeNull();
            expect(mediaManager.backCameraSender).toBeNull();

            instance.store.dispatch({type: 'WEBRTC_SESSION_STABLE', payload: true});

            await Promise.resolve();

            expect(mediaManager.addVideoStream).toHaveBeenCalledTimes(2);
            expect(mediaManager.addVideoStream).toHaveBeenNthCalledWith(1, frontStream, 'front');
            expect(mediaManager.addVideoStream).toHaveBeenNthCalledWith(2, backStream, 'back');
            expect(mediaManager.frontCameraSender).toBeNull(frontStream);
            expect(mediaManager.backCameraSender).toBeNull(backStream);
        });

        it('flushes active media on a legitimate disconnect', () => {
            const stopAudioTrack = vi.fn();
            const stopFrontTrack = vi.fn();
            const stopBackTrack = vi.fn();
            mediaManager.localAudioStream = {getTracks: () => [{stop: stopAudioTrack}]};
            mediaManager.localFrontVideoStream = {getTracks: () => [{stop: stopFrontTrack}]};
            mediaManager.localBackVideoStream = {getTracks: () => [{stop: stopBackTrack}]};

            mediaManager.releaseLocalMedia();

            expect(stopAudioTrack).toHaveBeenCalledTimes(1);
            expect(stopFrontTrack).toHaveBeenCalledTimes(1);
            expect(stopBackTrack).toHaveBeenCalledTimes(1);
            expect(mediaManager.localAudioStream).toBeNull();
            expect(mediaManager.localFrontVideoStream).toBeNull();
            expect(mediaManager.localBackVideoStream).toBeNull();
        });
    });
});
