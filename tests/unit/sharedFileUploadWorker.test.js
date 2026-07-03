import {vi} from 'vitest';

vi.mock('loglevel');

import Instance from '../mocks/DeviceRenderer.js';

describe('Shared file upload worker', () => {
    const mockWorker = {
        postMessage: vi.fn(),
        terminate: vi.fn(),
    };

    beforeEach(() => {
        mockWorker.postMessage.mockClear();
        mockWorker.terminate.mockClear();

        global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-upload-worker-url');
        global.URL.revokeObjectURL = vi.fn();

        global.Worker = vi.fn(function () {
            return mockWorker;
        });
        if (typeof window !== 'undefined') {
            window.Worker = global.Worker;
        }
    });

    test('uses a single underlying worker across multiple upload worker clients', () => {
        const instance = new Instance({
            fileUploadUrl: 'wss://upload.example',
            token: 'token',
        });

        instance.store.dispatch({type: 'WEBRTC_CONNECTION_READY', payload: true});

        const firstClient = instance.createFileUploadWorker();
        const secondClient = instance.createFileUploadWorker();

        expect(global.Worker).toHaveBeenCalledTimes(1);
        expect(firstClient).toBeTruthy();
        expect(secondClient).toBeTruthy();
        expect(mockWorker.postMessage).toHaveBeenCalledWith({
            type: 'address',
            fileUploadAddress: 'wss://upload.example',
            token: 'token',
        });
    });
});
