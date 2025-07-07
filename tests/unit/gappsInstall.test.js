'use strict';
jest.mock('loglevel');

// window.Worker mock
const mockWorker = {
    postMessage: jest.fn(),
    onmessage: null,
};

const mockBlobUrl = 'blob:mock-url-123';
global.URL.createObjectURL = jest.fn().mockReturnValue(mockBlobUrl);
global.URL.revokeObjectURL = jest.fn();

global.Worker = jest.fn().mockImplementation(() => mockWorker);

const GAPPSInstall = require('../../src/plugins/GAPPSInstall');
const Instance = require('../mocks/DeviceRenderer');

let instance;
let plugin;
let initialView;

describe('GAPPSInstall Plugin', () => {
    beforeEach(() => {
        // Reset mocks before each test
        mockWorker.postMessage.mockClear();
        global.Worker.mockClear();
        global.URL.createObjectURL.mockClear();
        global.URL.revokeObjectURL.mockClear();

        instance = new Instance({
            fileUploadUrl: 'mocked'
        });
        plugin = new GAPPSInstall(instance, {
            GAPPS_TITLE: 'TEST GAPPS TITLE',
            DRAG_DROP_TEXT: 'TEST DRAG DROP TEXT',
            BROWSE_BUTTON_TEXT: 'TEST BROWSE',
            FILE_TYPE_NOT_APK: 'TEST FILE TYPE NOT APK',
            FILE_SEND_APK_FAILED: 'TEST FILE APK SEND FAILED',
        });
        initialView = plugin.instanciatedViews.get('InitialView');
    });

    afterEach(() => {
        // clean all mocks after each test
        jest.clearAllMocks();
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof GAPPSInstall).toBe('function');
        });

        test('has a static name property', () => {
            expect(GAPPSInstall.name).toBe('GAPPSInstall');
        });
    });

    describe('view transitions', () => {
        test('initial view shows correct content and translations', () => {
            const container = document.getElementsByClassName('gm-gapps-plugin')[0];
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST GAPPS TITLE'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST DRAG DROP TEXT'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST BROWSE'));
        });

        test('clicking install GAPPS button transitions to disclaimer view', () => {
            initialView.installBtn.click();

            const container = document.getElementsByClassName('gm-gapps-plugin')[0];
            expect(container.innerHTML).toEqual(expect.stringContaining('DISCLAIMER'));
            expect(container.innerHTML).toEqual(expect.stringContaining('GENYMOBILE SAS assumes no liability'));
        });

        test('clicking back button on disclaimer returns to initial view', () => {
            // First go to disclaimer view
            initialView.installBtn.click();

            // Find and click back button
            const backBtn = document.querySelector('.gm-disclaimer-actions .gm-btn:not(.gm-gradient-button)');
            backBtn.click();

            // Verify we're back to initial view
            const container = document.getElementsByClassName('gm-gapps-plugin')[0];
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST GAPPS TITLE'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST DRAG DROP TEXT'));
        });

        test('clicking install button on disclaimer transitions to installing view', () => {
            // First go to disclaimer view
            initialView.installBtn.click();

            // Find and click install button
            const installBtn = document.querySelector('.gm-disclaimer-actions .gm-gradient-button');
            installBtn.click();

            // Verify we're in installing view
            const container = document.getElementsByClassName('gm-gapps-plugin')[0];
            expect(container.innerHTML).toEqual(expect.stringContaining('Downloading'));
            expect(container.querySelector('.gm-progress-section')).toBeTruthy();
        });
    });

    describe('UI', () => {
        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-gapps-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-gapps-button')).toHaveLength(1);
        });

        test('has translations', () => {
            const container = document.getElementsByClassName('gm-gapps-plugin')[0];
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST GAPPS TITLE'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST DRAG DROP TEXT'));
            expect(container.innerHTML).toEqual(expect.stringContaining('TEST BROWSE'));
        });
    });

    describe('drag and drop functionality', () => {
        test('disables drag and drop during upload', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);

            expect(initialView.fileUploaderComponent.element.
                querySelector('.gm-btn.gm-gradient-button').disabled).toBe(true);
            expect(initialView.fileUploaderComponent.element.
                querySelector('.gm-drag-drop-area.disabled')).toBeTruthy();
        });

        test('re-enables drag and drop after upload completion', () => {
            const file = new File(['test'], 'test.apk', {ype: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);

            document.querySelector('.gm-cancel-update-icon').click();

            expect(initialView.fileUploaderComponent.element.
                querySelector('.gm-btn.gm-gradient-button').disabled).toBe(false);
            expect(initialView.fileUploaderComponent.element.
                querySelector('.gm-drag-drop-area.disabled')).toBeFalsy();
        });
    });

    describe('file validation', () => {
        test('accepts valid APK file', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            const showUploadError = jest.spyOn(initialView.fileUploaderComponent, 'showUploadError');

            initialView.fileUploaderComponent.startUpload(file);

            expect(showUploadError).not.toHaveBeenCalled();
        });

        test('rejects non-APK file', () => {
            const file = new File(['test'], 'test.txt', {type: 'text/plain'});
            const startUpload = jest.spyOn(initialView.fileUploaderComponent, 'startUpload');

            initialView.fileUploaderComponent.startUpload(file);
            expect(startUpload).toHaveBeenCalled();

            expect(initialView.fileUploaderComponent.element.querySelector('.gm-error-text').innerHTML)
                .toEqual(expect.stringContaining('TEST FILE TYPE NOT APK'));
        });
    });

    describe('store integration', () => {
        test('updates store state when drag and drop is disabled', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);

            expect(instance.store.state.isDragAndDropForUploadFileEnabled).toBe(false);
        });

        test('updates store state when drag and drop is enabled', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);
            initialView.fileUploaderComponent.uploadingStop();

            expect(instance.store.state.isDragAndDropForUploadFileEnabled).toBe(true);
        });
    });

    describe('worker communication', () => {
        test('initializes worker correctly', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);

            expect(global.Worker).toHaveBeenCalledWith(expect.any(String));
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: 'upload',
                file: file,
            });
        });

        test('handles worker failure message', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);

            const event = {data: {type: 'FILE_UPLOAD', code: 'FAIL'}};
            mockWorker.onmessage(event);

            expect(instance.root.classList.contains('gm-uploading-in-progess')).toBe(false);
            expect(document.getElementsByClassName('gm-error-text')[0].innerHTML)
                .toEqual(expect.stringContaining('TEST FILE APK SEND FAILED'));
        });

        test('handles worker progress message', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);

            const event = {
                data: {
                    type: 'FILE_UPLOAD',
                    code: 'PROGRESS',
                    value: 0.5,
                    uploadedSize: '450.00',
                    fileSize: '900.00'
                }
            };
            mockWorker.onmessage(event);
            expect(initialView.fileUploaderComponent.element.querySelector('.gm-progress-bar').style.width).toBe('50%');
            expect(initialView.fileUploaderComponent.element.querySelector('.gm-size-text').innerHTML)
                .toBe('(450.00 of 900.00Mo)');
        });

        test('handles worker cancellation', () => {
            const file = new File(['test'], 'test.apk', {type: 'application/vnd.android.package-archive'});
            initialView.handleFileUpload(file);

            document.querySelector('.gm-cancel-update-icon').click();

            mockWorker.postMessage(
                {type: 'cancel'}
            );

            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: 'cancel'
            });

            expect(instance.root.classList.contains('gm-uploading-in-progess')).toBe(false);
        });
    });
});
