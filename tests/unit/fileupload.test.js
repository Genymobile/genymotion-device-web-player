'use strict';
jest.mock('loglevel');
const FileUpload = require('../../src/plugins/FileUpload');
const Instance = require('../mocks/DeviceRenderer');

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
            const addEventListenerSpy = jest.spyOn(instance.root, 'addEventListener');
            instance = new Instance();

            new FileUpload(instance, {
                UPLOADER_INSTALLING: 'TEST UPLOADER PLUGIN INSTALLING...',
            });

            expect(addEventListenerSpy).toHaveBeenNthCalledWith(1, 'dragover', expect.any(Function),
                {});
            expect(addEventListenerSpy).toHaveBeenNthCalledWith(2, 'dragleave', expect.any(Function),
                {});
            expect(addEventListenerSpy).toHaveBeenNthCalledWith(3, 'drop', expect.any(Function),
                {});
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
});
