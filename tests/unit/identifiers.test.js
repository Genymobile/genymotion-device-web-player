'use strict';

const Identifiers = require('../../src/plugins/Identifiers');
const Instance = require('../mocks/DeviceRenderer');

let identifiers;
let instance;
let plugin;

describe('Identifiers Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        identifiers = new Identifiers(instance, {});
        plugin = document.getElementsByClassName('gm-identifiers-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Identifiers).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new Identifiers(instance, {
                IDENTIFIERS_TITLE: 'TEST IDENTIFIERS PLUGIN TITLE',
                IDENTIFIERS_UPDATE: 'TEST IDENTIFIERS PLUGIN UPDATE BUTTON',
                IDENTIFIERS_GENERATE: 'TEST IDENTIFIERS PLUGIN GENERATE BUTTON'
            });
            plugin = document.getElementsByClassName('gm-identifiers-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-identifiers-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-identifiers-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IDENTIFIERS PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IDENTIFIERS PLUGIN UPDATE BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IDENTIFIERS PLUGIN GENERATE BUTTON'));
        });

        describe('field validation', () => {
            ['android', 'device'].forEach((field) => {
                test('button disabled', () => {
                    const fieldInput = document.getElementsByClassName(`gm-identifier-${field}-input`)[0];
                    const button = document.getElementsByClassName('gm-action gm-identifiers-update')[0];
                    fieldInput.value = 'jean-michel';
                    fieldInput.dispatchEvent(new Event('keyup'));

                    expect(fieldInput.classList.contains('gm-error')).toBeTruthy();
                    expect(button.disabled).toBeTruthy();
                });
            });
        });
    });

    describe('incoming events', () => {
        test('ANDROID_ID', () => {
            ['jean-michel', '123', '0123456789abcdef0', ''].forEach((invalidValue) => {
                instance.emit('ANDROID_ID', invalidValue);
                identifiers.validateAndroidId();
                expect(identifiers.invalidAndroidId).toBeTruthy();
            });

            ['0123456789abcdef'].forEach((validValue) => {
                instance.emit('ANDROID_ID', validValue);
                identifiers.validateAndroidId();
                expect(identifiers.invalidAndroidId).toBeFalsy();
            });
        });

        test('IMEI', () => {
            ['jean-michel', '123', '', '0123456789abcdef'].forEach((invalidValue) => {
                instance.emit('IMEI', invalidValue);
                identifiers.validateDeviceId();
                expect(identifiers.invalidDeviceId).toBeTruthy();
            });

            ['0123456789abcd', '0123456789abcde'].forEach((validValue) => {
                instance.emit('IMEI', validValue);
                identifiers.validateDeviceId();
                expect(identifiers.invalidDeviceId).toBeFalsy();
            });
        });

        describe('settings', () => {
            test('unrelevant topics', () => {
                ['unrelevant', 'parameters unrelevant:value', ''].forEach((invalidValue) => {
                    instance.emit('settings', `${invalidValue}`);
                    identifiers.validateAndroidId();
                    identifiers.validateDeviceId();
                    expect(identifiers.invalidAndroidId).toBeTruthy();
                    expect(identifiers.invalidDeviceId).toBeTruthy();
                });
            });

            test('android_id', () => {
                ['jean-michel', '123', '0123456789abcdef0', ''].forEach((invalidValue) => {
                    instance.emit('settings', `parameter android_id:${invalidValue}`);
                    identifiers.validateAndroidId();
                    expect(identifiers.invalidAndroidId).toBeTruthy();
                });

                ['0123456789abcdef'].forEach((validValue) => {
                    instance.emit('settings', `parameter android_id:${validValue}`);
                    identifiers.validateAndroidId();
                    expect(identifiers.invalidAndroidId).toBeFalsy();
                });
            });

            test('device_id', () => {
                ['jean-michel', '123', '', '0123456789abcdef'].forEach((invalidValue) => {
                    instance.emit('settings', `parameter device_id:${invalidValue}`);
                    identifiers.validateDeviceId();
                    expect(identifiers.invalidDeviceId).toBeTruthy();
                });

                ['0123456789abcd', '0123456789abcde'].forEach((validValue) => {
                    instance.emit('settings', `parameter device_id:${validValue}`);
                    identifiers.validateDeviceId();
                    expect(identifiers.invalidDeviceId).toBeFalsy();
                });
            });
        });
    });

    test('outgoing events', () => {
        const sendEventSpy = jest.spyOn(instance, 'sendEvent');

        identifiers.androidInput.value = 'jean-michel';
        identifiers.deviceInput.value = 'jean-michel';
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(0);

        identifiers.androidInput.value = 'jean-michel';
        identifiers.deviceInput.value = '0123456789abcde';
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(1);
        expect(instance.outgoingMessages[0]).toEqual({
            channel : 'settings' , messages : [
                'set parameter device_id:0123456789abcde'
            ]
        });

        identifiers.androidInput.value = '0123456789abcdef';
        identifiers.deviceInput.value = 'jean-michel';
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(2);
        expect(instance.outgoingMessages[1]).toEqual({
            channel : 'framework' , messages : [
                'set parameter android_id:0123456789abcdef'
            ]
        });

        identifiers.androidInput.value = '0123456789abcdef';
        identifiers.deviceInput.value = '0123456789abcde';
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(4);
        expect(instance.outgoingMessages[2]).toEqual({
            channel : 'framework' , messages : [
                'set parameter android_id:0123456789abcdef'
            ]
        });
        expect(instance.outgoingMessages[3]).toEqual({
            channel : 'settings' , messages : [
                'set parameter device_id:0123456789abcde'
            ]
        });

        identifiers.androidInput.value = '1234567891234@é%';
        identifiers.deviceInput.value = '0123456789abcde';
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(5);
        expect(instance.outgoingMessages[4]).toEqual({
            channel : 'settings' , messages : [
                'set parameter device_id:0123456789abcde'
            ]
        });
    });
});
