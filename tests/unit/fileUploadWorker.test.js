'use strict';

const FileUploaderWorker = require('../../src/worker/FileUploaderWorker');
const Instance = require('../mocks/DeviceRenderer');

// window.Worker mock
const mockWorker = {
    postMessage: jest.fn(),
    onmessage: null,
};

// WebSocket mock
const mockSocket = {
    send: jest.fn(),
    close: jest.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null,
    binaryType: null
};

global.Worker = jest.fn().mockImplementation(() => mockWorker);
global.WebSocket = jest.fn().mockImplementation(() => mockSocket);
global.self.postMessage = jest.fn();
const mockBlobUrl = 'blob:mock-url-123';
global.URL.createObjectURL = jest.fn().mockReturnValue(mockBlobUrl);

describe('FileUploaderWorker', () => {
    let worker;
    let mockFile;

    beforeEach(() => {
        // Reset mocks before each test
        mockWorker.postMessage.mockClear();
        global.Worker.mockClear();
        mockSocket.send.mockClear();
        mockSocket.close.mockClear();
        global.WebSocket.mockClear();

        // Mock File
        mockFile = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
        Object.defineProperty(mockFile, 'size', {
            value: 100 * 1000 * 1024,
            writable: false
        });

        worker = new FileUploaderWorker();
        worker.socket = mockSocket;
    });

    describe('initialization', () => {
        test('initializes with default values', () => {
            expect(worker.token).toBeNull();
            expect(worker.hasError).toBe(false);
            expect(worker.isUploading).toBe(false);
            expect(worker.uploadedSize).toBe(0);
            expect(worker.file).toBeNull();
            expect(worker.address).toBeNull();
            expect(worker.MEGABYTE).toBe(1000 * 1000);
        });
    });

    describe('message handling', () => {
        test('handles address message and connects to WebSocket', () => {
            const msg = {
                type: 'address',
                token: 'test-token',
                fileUploadAddress: 'ws://test.com'
            };

            worker.onmessage({data: msg});

            expect(worker.token).toBe('test-token');
            expect(worker.address).toBe('ws://test.com');
            expect(global.WebSocket).toHaveBeenCalledWith('ws://test.com');
            expect(mockSocket.binaryType).toBe('arraybuffer');
            expect(mockSocket.onopen).toBe(worker.onOpen);
            expect(mockSocket.onerror).toBe(worker.onFailure);
            expect(mockSocket.onmessage).toBe(worker.onSocketMsg);
            expect(mockSocket.onclose).toBe(worker.onClose);
        });

        test('handles close message', () => {
            worker.isUploading = true;

            worker.onmessage({data: {type: 'close'}});

            expect(worker.isUploading).toBe(false);
            expect(mockSocket.onclose).toBeNull();
            expect(mockSocket.close).toHaveBeenCalled();
        });

        test('handles upload message', () => {
            worker.onmessage({data: {type: 'upload', file: mockFile}});

            expect(worker.file).toBe(mockFile);
            expect(worker.isUploading).toBe(true);
            expect(worker.hasError).toBe(false);
            expect(worker.uploadedSize).toBe(0);

            expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'FILE_UPLOAD',
                name: 'test.apk',
                size: mockFile.size
            }));
        });

        test('handles cancel message', () => {
            worker.isUploading = true;
            worker.onmessage({data: {type: 'cancel'}});

            expect(worker.isUploading).toBe(false);
            expect(worker.hasError).toBe(false);
            expect(global.self.postMessage).toHaveBeenCalledWith({
                type: 'FILE_UPLOAD',
                code: 'CANCELED'
            });
            expect(mockSocket.close).toHaveBeenCalled();
        });
    });

    describe('WebSocket connection', () => {
        test('sends token on connection open', () => {
            worker.token = 'test-token';
            worker.onOpen();

            expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify({
                type: 'token',
                token: 'test-token'
            }));
        });

        test('reconnects on connection close', () => {
            jest.useFakeTimers();
            worker.address = 'ws://test.com';

            const msg = {
                type: 'address',
                token: 'test-token',
                fileUploadAddress: 'ws://test.com'
            };
            worker.onmessage({data: msg});

            expect(global.WebSocket).toHaveBeenCalledTimes(1);

            worker.onClose();
            jest.advanceTimersByTime(1000);

            expect(global.WebSocket).toHaveBeenCalledTimes(2);
            expect(global.WebSocket).toHaveBeenLastCalledWith('ws://test.com');
        });

        test('handles connection failure', () => {
            worker.onFailure();

            expect(global.self.postMessage).toHaveBeenCalledWith({
                type: 'FILE_UPLOAD',
                code: 'FAIL'
            });
            expect(worker.isUploading).toBe(false);
        });

        test('handles WebRTC connection state changes', () => {
            const instance = new Instance({
                fileUploadUrl: 'mocked'
            });

            const fileUploadWorker = instance.createFileUploadWorker();
            instance.store.dispatch({type: 'WEBRTC_CONNECTION_READY', payload: true});

            expect(fileUploadWorker.postMessage).toHaveBeenCalledWith({
                type: 'address',
                fileUploadAddress: 'mocked',
                token: instance.options.token
            });

            instance.store.dispatch({type: 'WEBRTC_CONNECTION_READY', payload: false});

            expect(fileUploadWorker.postMessage).toHaveBeenCalledWith({
                type: 'close'
            });
        });
    });

    describe('file upload handling', () => {
        beforeEach(() => {
            worker.file = mockFile;
        });

        test('calculates correct chunk size', () => {
            // Test minimum chunk size (5MB)
            expect(worker.getChunkSize(1 * 1024 * 1024)).toBe(5 * worker.MEGABYTE);

            // Test maximum chunk size (75MB)
            expect(worker.getChunkSize(1000 * 1024 * 1024)).toBe(75 * worker.MEGABYTE);

            // Test 10% chunk size
            expect(worker.getChunkSize(100 * 1024 * 1024)).toBe(10 * 1024 * 1024);
        });

        test('handles upload success', () => {
            const msg = {
                type: 'FILE_UPLOAD',
                code: 'SUCCESS'
            };

            worker.onSocketMsg({data: JSON.stringify(msg)});

            expect(global.self.postMessage).toHaveBeenCalledWith(msg);
            expect(worker.isUploading).toBe(false);
        });

        test('handles upload failure', () => {
            worker.onFailure();

            expect(global.self.postMessage).toHaveBeenCalledWith({
                type: 'FILE_UPLOAD',
                code: 'FAIL'
            });
            expect(worker.isUploading).toBe(false);
        });

        test('handles upload progress', () => {
            worker.uploadedSize = 50 * 1000 * 1024;
            const msg = {
                type: 'FILE_UPLOAD',
                code: 'PROGRESS'
            };

            worker.onSocketMsg({data: JSON.stringify(msg)});

            expect(global.self.postMessage).toHaveBeenCalledWith(expect.objectContaining({
                type: 'FILE_UPLOAD',
                code: 'PROGRESS',
                fileSize: '100.00',
                uploadedSize: '50.00'
            }));
        });
    });
});
