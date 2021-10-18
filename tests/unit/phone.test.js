'use strict';

const Phone = require('../../src/plugins/Phone');
const Instance = require('../mocks/GenymotionInstance');

let phone;
let instance;
let plugin;

describe('Phone Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        phone = new Phone(instance, {});
        plugin = document.getElementsByClassName('gm-phone-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Phone).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new Phone(instance, {
                PHONE_TITLE: 'TEST PHONE PLUGIN TITLE',
                PHONE_CALL_PLACEHOLDER: 'TEST PHONE PLUGIN CALL PLACEHOLDER',
                PHONE_CALL: 'TEST PHONE PLUGIN CALL',
                PHONE_INCOMING: 'TEST PHONE PLUGIN INCOMING',
                PHONE_MESSAGE_PLACEHOLDER: 'TEST PHONE PLUGIN MESSAGE PLACEHOLDER',
                PHONE_MESSAGE: 'TEST PHONE PLUGIN MESSAGE',
                PHONE_MESSAGE_VALUE: 'TEST PHONE PLUGIN MESSAGE_VALUE'
            });
            plugin = document.getElementsByClassName('gm-phone-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-phone-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-phone-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PHONE PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PHONE PLUGIN CALL PLACEHOLDER'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PHONE PLUGIN CALL'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PHONE PLUGIN INCOMING'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PHONE PLUGIN MESSAGE PLACEHOLDER'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PHONE PLUGIN MESSAGE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PHONE PLUGIN MESSAGE_VALUE'));
        });
    });

    describe('outgoing events', () => {
        test('gsm call', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            ['jean-michel', '-666', ''].forEach((invalidValue) => {
                phone.phoneInput.value = invalidValue;
                phone.sendPhoneCallToInstance();
                expect(sendEventSpy).toHaveBeenCalledTimes(0);
            });

            phone.phoneInput.value = '0123456789';
            phone.sendPhoneCallToInstance();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);

            expect(instance.outgoingMessages[0]).toEqual({channel: 'baseband', messages: [
                'gsm call 0123456789'
            ]});
        });

        test('sms send', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');
            phone.phoneInput.value = '0123456789';

            phone.textInput.value = '';
            phone.sendSMSToInstance();
            expect(sendEventSpy).toHaveBeenCalledTimes(0);

            phone.textInput.value = 'Hello world';
            phone.sendSMSToInstance();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);

            expect(instance.outgoingMessages[0]).toEqual({channel: 'baseband', messages: [
                'sms send 0123456789 Hello world'
            ]});
        });
    });
});
