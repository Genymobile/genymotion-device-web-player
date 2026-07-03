import {vi} from 'vitest';

vi.mock('loglevel');
import FileUpload from '../../src/plugins/FileUpload.js';
import Instance from '../mocks/DeviceRenderer.js';

let instance;

describe('FileUpload Plugin', () => {
    beforeEach(() => {
        instance = new Instance();

        new FileUpload(instance, {
            UPLOADER_INSTALLING: 'TEST UPLOADER PLUGIN INSTALLING...',
        });
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof FileUpload).toBe('function');
        });

        it('should attach ondragover, ondragenter, and ondragleave to root', () => {
            const addEventListenerSpy = vi.spyOn(instance.root, 'addEventListener');
            instance = new Instance();

            new FileUpload(instance, {
                UPLOADER_INSTALLING: 'TEST UPLOADER PLUGIN INSTALLING...',
            });

            expect(addEventListenerSpy).toHaveBeenNthCalledWith(1, 'dragover', expect.any(Function), {});
            expect(addEventListenerSpy).toHaveBeenNthCalledWith(2, 'dragleave', expect.any(Function), {});
            expect(addEventListenerSpy).toHaveBeenNthCalledWith(3, 'drop', expect.any(Function), {});
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new FileUpload(instance, {
                UPLOADER_TITLE: 'TEST UPLOADER PLUGIN TITLE',
                FILE_UPLOAD_TEXT: 'TEST UPLOADER FILE UPLOAD',
                DRAG_DROP_TEXT: 'TEST UPLOADER DRAG AND DROP',
                BROWSE_BUTTON_TEXT: 'TEST BROWSE',
            });
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-uploader-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-uploader-button')).toHaveLength(1);
        });

        test('has translations', () => {
            const container = document.querySelector('.gm-uploader-plugin');
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER PLUGIN TITLE'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER FILE UPLOAD'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER DRAG AND DROP'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST BROWSE'));
        });
    });

    describe('shared upload worker', () => {
        let sharedInstance;

        beforeEach(() => {
            sharedInstance = new Instance({fileUploadUrl: 'wss://test/fileUpload'});
            const workerMock = {postMessage: vi.fn(), terminate: vi.fn(), onmessage: null};
            sharedInstance.fileUploaderWorkerBlobSRC = 'blob:mock';
            global.Worker = vi.fn(function () {
                return workerMock;
            });
            sharedInstance._workerMock = workerMock;
        });

        test('createFileUploadWorker instantiates only one underlying Worker across calls', () => {
            const clientA = sharedInstance.createFileUploadWorker();
            const clientB = sharedInstance.createFileUploadWorker();

            expect(global.Worker).toHaveBeenCalledTimes(1);
            expect(clientA).not.toBe(clientB);
        });

        test('per-upload messages are routed only to the active client', () => {
            const clientA = sharedInstance.createFileUploadWorker();
            const clientB = sharedInstance.createFileUploadWorker();
            const onA = vi.fn();
            const onB = vi.fn();
            clientA.onmessage = onA;
            clientB.onmessage = onB;

            // clientA initiates an upload -> it becomes the active target for PROGRESS/SUCCESS/FAIL
            clientA.postMessage({type: 'upload', file: new File(['x'], 'x.bin')});

            const progress = {data: {type: 'FILE_UPLOAD', code: 'PROGRESS', value: 0.5}};
            sharedInstance._workerMock.onmessage(progress);

            expect(onA).toHaveBeenCalledWith(progress);
            expect(onB).not.toHaveBeenCalled();
        });

        test('socket state messages fan out to every registered client', () => {
            const clientA = sharedInstance.createFileUploadWorker();
            const clientB = sharedInstance.createFileUploadWorker();
            const onA = vi.fn();
            const onB = vi.fn();
            clientA.onmessage = onA;
            clientB.onmessage = onB;

            const socketOk = {data: {type: 'FILE_UPLOAD', code: 'SOCKET_SUCCESS'}};
            sharedInstance._workerMock.onmessage(socketOk);

            expect(onA).toHaveBeenCalledWith(socketOk);
            expect(onB).toHaveBeenCalledWith(socketOk);
        });

        test('dispose removes the client from receiving further messages', () => {
            const clientA = sharedInstance.createFileUploadWorker();
            const onA = vi.fn();
            clientA.onmessage = onA;

            clientA.dispose();
            sharedInstance._workerMock.onmessage({data: {type: 'FILE_UPLOAD', code: 'SOCKET_SUCCESS'}});

            expect(onA).not.toHaveBeenCalled();
        });
    });
});
