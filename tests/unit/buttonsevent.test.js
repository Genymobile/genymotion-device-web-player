'use strict';

const ButtonsEvents = require('../../src/plugins/ButtonsEvents');
const Instance = require('../mocks/DeviceRenderer');

let instance;

describe('ButtonsEvents Plugin', () => {
    beforeEach(() => {
        instance = new Instance({
            rotation: true,
            volume: true,
            navbar: true,
            power: true,
        });
        new ButtonsEvents(instance, {}, false);
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof ButtonsEvents).toBe('function');
        });
    });

    describe('UI', () => {
        test('is initialized properly at construct', () => {
            instance = new Instance({
                rotation: true,
                volume: true,
                navbar: true,
                power: true,
            });
            new ButtonsEvents(instance, {}, false);

            // Toolbar buttons
            expect(document.getElementsByClassName('gm-rotate')).toHaveLength(1);
            expect(document.getElementsByClassName('gm-sound-down')).toHaveLength(1);
            expect(document.getElementsByClassName('gm-sound-up')).toHaveLength(1);
            expect(document.getElementsByClassName('gm-recent')).toHaveLength(1);
            expect(document.getElementsByClassName('gm-home')).toHaveLength(1);
            expect(document.getElementsByClassName('gm-back')).toHaveLength(1);
            expect(document.getElementsByClassName('gm-power')).toHaveLength(1);
        });

        test('handles instance options', () => {
            instance = new Instance({
                rotation: false,
                volume: null,
            });
            new ButtonsEvents(instance, {}, false);

            // Toolbar buttons
            expect(document.getElementsByClassName('gm-rotate')).toHaveLength(0);
            expect(document.getElementsByClassName('gm-sound-down')).toHaveLength(0);
            expect(document.getElementsByClassName('gm-sound-up')).toHaveLength(0);
            expect(document.getElementsByClassName('gm-recent')).toHaveLength(0);
            expect(document.getElementsByClassName('gm-home')).toHaveLength(0);
            expect(document.getElementsByClassName('gm-back')).toHaveLength(0);
            expect(document.getElementsByClassName('gm-power')).toHaveLength(0);
        });

        test('has translations', () => {
            instance = new Instance({
                rotation: true,
                volume: true,
                navbar: true,
                power: true,
            });
            new ButtonsEvents(
                instance,
                {
                    BUTTONS_ROTATE: 'TEST BUTTONS EVENTS ROTATE BUTTON',
                    BUTTONS_SOUND_DOWN: 'TEST BUTTONS EVENTS SOUND_DOWN BUTTON',
                    BUTTONS_SOUND_UP: 'TEST BUTTONS EVENTS SOUND_UP BUTTON',
                    BUTTONS_RECENT_APPS: 'TEST BUTTONS EVENTS RECENT_APPS BUTTON',
                    BUTTONS_HOME: 'TEST BUTTONS EVENTS HOME BUTTON',
                    BUTTONS_BACK: 'TEST BUTTONS EVENTS BACK BUTTON',
                    BUTTONS_POWER: 'TEST BUTTONS EVENTS POWER BUTTON',
                },
                false,
            );

            // Toolbar buttons
            const plugin = document.body;
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BUTTONS EVENTS ROTATE BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BUTTONS EVENTS SOUND_DOWN BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BUTTONS EVENTS SOUND_UP BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BUTTONS EVENTS RECENT_APPS BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BUTTONS EVENTS HOME BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BUTTONS EVENTS BACK BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BUTTONS EVENTS POWER BUTTON'));
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

        test('rotation', () => {
            const button = document.getElementsByClassName('gm-rotate')[0];

            button.dispatchEvent(new Event('mousedown'));
            button.dispatchEvent(new Event('mouseup'));
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                type: 'ROTATE',
            });
        });

        test('volume up', () => {
            const button = document.getElementsByClassName('gm-sound-up')[0];

            button.dispatchEvent(new Event('mousedown'));
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                type: 'KEYBOARD_PRESS',
                keycode: parseInt('0x01000072'),
                keychar: '0\n',
            });

            button.dispatchEvent(new Event('mouseup'));
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({
                type: 'KEYBOARD_RELEASE',
                keycode: parseInt('0x01000072'),
                keychar: '0\n',
            });
        });

        test('volume down', () => {
            const button = document.getElementsByClassName('gm-sound-down')[0];

            button.dispatchEvent(new Event('mousedown'));
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                type: 'KEYBOARD_PRESS',
                keycode: parseInt('0x01000070'),
                keychar: '0\n',
            });

            button.dispatchEvent(new Event('mouseup'));
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({
                type: 'KEYBOARD_RELEASE',
                keycode: parseInt('0x01000070'),
                keychar: '0\n',
            });
        });

        test('recent apps', () => {
            const button = document.getElementsByClassName('gm-recent')[0];

            button.dispatchEvent(new Event('mousedown'));
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                type: 'KEYBOARD_PRESS',
                keycode: parseInt('0x010000be'),
                keychar: '0\n',
            });

            button.dispatchEvent(new Event('mouseup'));
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({
                type: 'KEYBOARD_RELEASE',
                keycode: parseInt('0x010000be'),
                keychar: '0\n',
            });
        });

        test('home', () => {
            const button = document.getElementsByClassName('gm-home')[0];

            button.dispatchEvent(new Event('mousedown'));
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[0]).toEqual({
                type: 'KEYBOARD_PRESS',
                keycode: parseInt('0x01000022'),
                keychar: '',
            });
            expect(instance.outgoingMessages[1]).toEqual({
                type: 'KEYBOARD_PRESS',
                keycode: parseInt('0x01000005'),
                keychar: '',
            });

            button.dispatchEvent(new Event('mouseup'));
            expect(sendEventSpy).toHaveBeenCalledTimes(4);
            expect(instance.outgoingMessages[2]).toEqual({
                type: 'KEYBOARD_RELEASE',
                keycode: parseInt('0x01000005'),
                keychar: '',
            });
            expect(instance.outgoingMessages[3]).toEqual({
                type: 'KEYBOARD_RELEASE',
                keycode: parseInt('0x01000022'),
                keychar: '',
            });
        });

        test('back', () => {
            const button = document.getElementsByClassName('gm-back')[0];

            button.dispatchEvent(new Event('mousedown'));
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                type: 'KEYBOARD_PRESS',
                keycode: parseInt('0x01000061'),
                keychar: '0\n',
            });

            button.dispatchEvent(new Event('mouseup'));
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({
                type: 'KEYBOARD_RELEASE',
                keycode: parseInt('0x01000061'),
                keychar: '0\n',
            });
        });

        test('power', () => {
            const button = document.getElementsByClassName('gm-power')[0];

            button.dispatchEvent(new Event('mousedown'));
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                type: 'KEYBOARD_PRESS',
                keycode: parseInt('0x0100010b'),
                keychar: '0\n',
            });

            button.dispatchEvent(new Event('mouseup'));
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({
                type: 'KEYBOARD_RELEASE',
                keycode: parseInt('0x0100010b'),
                keychar: '0\n',
            });
        });
    });
});
