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
                IDENTIFIERS_APPLY: 'TEST IDENTIFIERS PLUGIN UPDATE BUTTON',
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
        });

        describe('field validation', () => {
            ['android', 'device'].forEach(() => {
                test('button disabled', () => {
                    expect(identifiers.submitBtn.disabled).toBeTruthy();
                    identifiers.androidInput.setValue('jean-michel', true);
                    identifiers.deviceInput.setValue('jean-michel', true);
                    expect(identifiers.submitBtn.disabled).toBeTruthy();
                    identifiers.androidInput.setValue('0123456789abcdef', true);
                    identifiers.deviceInput.setValue('0123456789abcde', true);
                    expect(identifiers.submitBtn.disabled).toBeFalsy();
                });
            });
        });
    });

    describe('incoming events', () => {
        describe('settings', () => {
            test('unrelevant topics', () => {
                ['unrelevant', 'parameters unrelevant:value', ''].forEach((invalidValue) => {
                    instance.emit('settings', `${invalidValue}`);
                    expect(identifiers.androidInput.checkValidity()).toBeFalsy();
                    expect(identifiers.deviceInput.checkValidity()).toBeFalsy();
                });
            });

            test('android_id', () => {
                ['jean-michel', '123', '0123456789abcdef0', ''].forEach((invalidValue) => {
                    instance.emit('settings', `parameter android_id:${invalidValue}`);
                    expect(identifiers.androidInput.checkValidity()).toBeFalsy();
                });

                ['0123456789abcdef'].forEach((validValue) => {
                    instance.emit('settings', `parameter android_id:${validValue}`);
                    expect(identifiers.androidInput.checkValidity()).toBeTruthy();
                });
            });

            test('device_id', () => {
                ['jean-michel', '123', '', '0123456789abcdef'].forEach((invalidValue) => {
                    instance.emit('settings', `parameter device_id:${invalidValue}`);
                    expect(identifiers.deviceInput.checkValidity()).toBeFalsy();
                });

                ['0123456789abcd', '0123456789abcde'].forEach((validValue) => {
                    instance.emit('settings', `parameter device_id:${validValue}`);
                    identifiers.deviceInput.checkValidity();
                    expect(identifiers.invalidDeviceId).toBeFalsy();
                });
            });
        });
    });

    test('outgoing events', () => {
        const sendEventSpy = jest.spyOn(instance, 'sendEvent');

        identifiers.androidInput.setValue('jean-michel');
        identifiers.deviceInput.setValue('jean-michel');
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(0);

        identifiers.androidInput.setValue('jean-michel');
        identifiers.deviceInput.setValue('0123456789abcde');
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(1);
        expect(instance.outgoingMessages[0]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcde'],
        });

        identifiers.androidInput.setValue('0123456789abcdef');
        // input jean-michel is invalid so we keep the previous value
        identifiers.deviceInput.setValue('jean-michel');
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(3);
        expect(instance.outgoingMessages[1]).toEqual({
            channel: 'framework',
            messages: ['set parameter android_id:0123456789abcdef'],
        });
        expect(instance.outgoingMessages[2]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcde'],
        });

        identifiers.androidInput.setValue('0123456789abcdef');
        identifiers.deviceInput.setValue('0123456789abcdb');;
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(5);
        expect(instance.outgoingMessages[3]).toEqual({
            channel: 'framework',
            messages: ['set parameter android_id:0123456789abcdef'],
        });
        expect(instance.outgoingMessages[4]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcdb'],
        });

        identifiers.androidInput.setValue('1234567891234@é%');
        identifiers.deviceInput.setValue('0123456789abcde');
        identifiers.sendDataToInstance(new Event(''));
        expect(sendEventSpy).toHaveBeenCalledTimes(7);
        expect(instance.outgoingMessages[6]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcde'],
        });
    });
});
