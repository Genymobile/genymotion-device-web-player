'use strict';
jest.mock('loglevel');
const FileUpload = require('../../src/plugins/FileUpload');
const Instance = require('../mocks/DeviceRenderer');
const store = require('../../src/store/index');

let uploader;
let instance;
let plugin;

describe('FileUpload Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        store(instance);

        uploader = new FileUpload(instance, {
            UPLOADER_INSTALLING: 'TEST UPLOADER PLUGIN INSTALLING...',
        });
        plugin = document.getElementsByClassName('gm-uploader-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof FileUpload).toBe('function');
        });

        it('should attach ondragover, ondragenter, and ondragleave to root', () => {
            expect(typeof instance.videoWrapper.ondragover).toBe('function');
            expect(typeof instance.videoWrapper.ondragleave).toBe('function');
            expect(typeof instance.videoWrapper.ondragenter).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            store(instance);
            uploader = new FileUpload(instance, {
                UPLOADER_TITLE: 'TEST UPLOADER PLUGIN TITLE',
                UPLOADER_HOME_TITLE: 'TEST UPLOADER PLUGIN HOME TITLE',
                UPLOADER_DISCLAIMER: 'TEST UPLOADER PLUGIN DISCLAIMER',
                UPLOADER_INPROGRESS: 'TEST UPLOADER PLUGIN IN PROGRESS',
                UPLOADER_SUCCESS: 'TEST UPLOADER PLUGIN SUCCESS',
                UPLOADER_FAILURE: 'TEST UPLOADER PLUGIN FAILURE',
            });
            plugin = document.getElementsByClassName('gm-uploader-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-uploader-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-uploader-button')).toHaveLength(1);
        });

        test('has translations', () => {
            uploader.displayStep('homeScreen');
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER PLUGIN HOME TITLE'));
            uploader.displayStep('disclaimerScreen');
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER PLUGIN DISCLAIMER'));
            uploader.displayStep('uploadScreen');
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER PLUGIN IN PROGRESS'));
            uploader.displayStep('successScreen');
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER PLUGIN SUCCESS'));
            uploader.displayStep('errorScreen');
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST UPLOADER PLUGIN FAILURE'));
        });

        test('allows access to disclaimer on right conditions', () => {
            uploader.displayStep('homeScreen');
            const displayStep = jest.spyOn(uploader, 'displayStep');

            // Not allowed by default
            uploader.installButton.click();
            expect(displayStep).toHaveBeenCalledTimes(0);

            // Already installed
            uploader.opengappsInstalled = true;
            uploader.capabilityAvailable = true;
            uploader.installButton.click();
            expect(displayStep).toHaveBeenCalledTimes(0);

            // Not available
            uploader.opengappsInstalled = false;
            uploader.capabilityAvailable = false;
            uploader.installButton.click();
            expect(displayStep).toHaveBeenCalledTimes(0);

            // Available
            uploader.opengappsInstalled = false;
            uploader.capabilityAvailable = true;
            uploader.installButton.click();
            expect(displayStep).toHaveBeenNthCalledWith(1, 'disclaimerScreen');
        });

        test('sets proper step on toggle', () => {
            uploader.displayStep('homeScreen');
            uploader.toggleWidget();
            uploader.toggleWidget();
            expect(uploader.currentStep).toEqual('homeScreen');
            uploader.displayStep('disclaimerScreen');
            uploader.toggleWidget();
            uploader.toggleWidget();
            expect(uploader.currentStep).toEqual('disclaimerScreen');
            uploader.displayStep('uploadScreen');
            uploader.toggleWidget();
            uploader.toggleWidget();
            expect(uploader.currentStep).toEqual('uploadScreen');
            uploader.displayStep('successScreen');
            uploader.toggleWidget();
            uploader.toggleWidget();
            expect(uploader.currentStep).toEqual('homeScreen');
            uploader.displayStep('errorScreen');
            uploader.toggleWidget();
            uploader.toggleWidget();
            expect(uploader.currentStep).toEqual('homeScreen');
        });

        test('Dont force show on success', () => {
            uploader.flashing = false;
            uploader.displayStep('uploadScreen');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(1);
            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'success');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(1);
        });

        test('dont force show on error', () => {
            uploader.flashing = false;
            uploader.displayStep('uploadScreen');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(1);
            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'install_error');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(1);
        });

        test('force show on opengapps success', () => {
            uploader.flashing = true;
            uploader.displayStep('uploadScreen');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(1);
            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'success');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(0);
        });

        test('force show on opengapps error', () => {
            uploader.flashing = true;
            uploader.displayStep('uploadScreen');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(1);
            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'install_error');
            expect(document.getElementsByClassName('gm-hidden').length).toEqual(0);
        });
    });

    describe('incoming events', () => {
        describe('SYSTEM_PATCHER_STATUS', () => {
            test('downloading', () => {
                uploader.displayStep('uploadScreen');
                const textProgress = document.getElementsByClassName('gm-upload-in-progress-txt-percent')[0];

                instance.emit('SYSTEM_PATCHER_STATUS', 'downloading something'); // Not enough parameters
                expect(textProgress.innerHTML).toBe('');

                instance.emit('SYSTEM_PATCHER_STATUS', 'downloading 69 100');
                expect(textProgress.innerHTML).toBe('69%'); // Nice
            });

            test('installing', () => {
                uploader.displayStep('uploadScreen');
                const textProgress = document.getElementsByClassName('gm-upload-in-progress-txt-progress')[0];

                instance.emit('SYSTEM_PATCHER_STATUS', 'installing');
                expect(textProgress.innerHTML).toBe('TEST UPLOADER PLUGIN INSTALLING...');
            });

            test('ready', () => {
                const updateOpenGAppsStatus = jest.spyOn(uploader, 'updateOpenGAppsStatus');
                const sendEventSpy = jest.spyOn(instance, 'sendEvent');

                instance.emit('SYSTEM_PATCHER_STATUS', 'ready'); // Not enough parameters
                expect(updateOpenGAppsStatus).toHaveBeenCalledTimes(0);

                instance.emit('SYSTEM_PATCHER_STATUS', 'ready something');
                expect(updateOpenGAppsStatus).toHaveBeenCalledTimes(0);

                // Asumes uploader.flashing = false, default
                instance.emit('SYSTEM_PATCHER_STATUS', 'ready opengapps');
                expect(updateOpenGAppsStatus).toHaveBeenCalledTimes(1);
                expect(sendEventSpy).toHaveBeenCalledTimes(0);

                uploader.flashing = true;
                instance.emit('SYSTEM_PATCHER_STATUS', 'ready opengapps');
                expect(updateOpenGAppsStatus).toHaveBeenCalledTimes(2);
                expect(sendEventSpy).toHaveBeenCalledTimes(1);
                expect(instance.outgoingMessages[0]).toEqual({
                    channel: 'systempatcher',
                    messages: ['notify last_result'],
                });
            });
        });

        test('SYSTEM_PATCHER_LAST_RESULT', () => {
            const displayStep = jest.spyOn(uploader, 'displayStep');

            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'success');
            expect(displayStep).toHaveBeenNthCalledWith(1, 'successScreen');

            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'unavailable');
            expect(displayStep).toHaveBeenNthCalledWith(2, 'errorScreen');

            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'network_error');
            expect(displayStep).toHaveBeenNthCalledWith(3, 'errorScreen');

            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'corrupted_archive');
            expect(displayStep).toHaveBeenNthCalledWith(4, 'errorScreen');

            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'install_error');
            expect(displayStep).toHaveBeenNthCalledWith(5, 'errorScreen');

            instance.emit('SYSTEM_PATCHER_LAST_RESULT', 'something');
            expect(displayStep).toHaveBeenCalledTimes(5);

            instance.emit('SYSTEM_PATCHER_LAST_RESULT', '');
            expect(displayStep).toHaveBeenCalledTimes(5);
        });

        test('systempatcher', () => {
            const onSystemPatcherStatusEvent = jest.spyOn(uploader, 'onSystemPatcherStatusEvent');
            const onSystemPatcherLastResultEvent = jest.spyOn(uploader, 'onSystemPatcherLastResultEvent');

            instance.emit('systempatcher', 'status some various params');
            expect(onSystemPatcherStatusEvent).toHaveBeenNthCalledWith(1, 'some various params');
            expect(onSystemPatcherLastResultEvent).toHaveBeenCalledTimes(0);

            instance.emit('systempatcher', 'last_result some various params');
            expect(onSystemPatcherStatusEvent).toHaveBeenCalledTimes(1);
            expect(onSystemPatcherLastResultEvent).toHaveBeenCalledTimes(1, 'some various params');

            instance.emit('systempatcher', 'unrelevant some various params');
            expect(onSystemPatcherStatusEvent).toHaveBeenCalledTimes(1);
            expect(onSystemPatcherLastResultEvent).toHaveBeenCalledTimes(1);
        });
    });

    describe('outgoing events', () => {
        let sendEventSpy;

        beforeEach(() => {
            sendEventSpy = jest.spyOn(instance, 'sendEvent');
        });

        afterEach(() => {
            sendEventSpy.mockRestore();
        });

        test('flash opengapps', () => {
            uploader.displayStep('disclaimerScreen');
            const button = document.getElementsByClassName('gm-upload-main-bottom-buttons-right')[0];

            button.click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'systempatcher',
                messages: ['install opengapps'],
            });
        });

        test('cancel flash opengapps', () => {
            uploader.displayStep('uploadScreen');
            const button = document.getElementsByClassName('gm-upload-main-bottom-buttons-right')[0];

            button.click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'systempatcher',
                messages: ['cancel'],
            });
        });

        test('reboot instance', () => {
            uploader.displayStep('successScreen');
            const button = document.getElementsByClassName('gm-upload-success-button')[0];

            button.click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'systempatcher',
                messages: ['reboot'],
            });
        });
    });
});
