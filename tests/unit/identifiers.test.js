import {vi} from 'vitest';
import Identifiers from '../../src/plugins/Identifiers.js';
import Instance from '../mocks/DeviceRenderer.js';

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
                    const androidInput = identifiers.androidInput.querySelector('input');
                    androidInput.value = 'jean-michel';
                    androidInput.dispatchEvent(new Event('input', {bubbles: true}));

                    const deviceInput = identifiers.deviceInput.querySelector('input');
                    deviceInput.value = 'jean-michel';
                    deviceInput.dispatchEvent(new Event('input', {bubbles: true}));

                    expect(identifiers.submitBtn.disabled).toBeTruthy();

                    const androidInput2 = identifiers.androidInput.querySelector('input');
                    androidInput2.value = '0123456789abcdef';
                    androidInput2.dispatchEvent(new Event('input', {bubbles: true}));

                    const deviceInput2 = identifiers.deviceInput.querySelector('input');
                    deviceInput2.value = '0123456789abcde';
                    deviceInput2.dispatchEvent(new Event('input', {bubbles: true}));

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
        const sendEventSpy = vi.spyOn(instance, 'sendEvent');
        const submitBtn = identifiers.submitBtn;

        // Helper to simulate user input
        const setInput = (component, value) => {
            const input = component.querySelector('input');
            input.value = value;
            input.dispatchEvent(new Event('input', {bubbles: true}));
        };

        setInput(identifiers.androidInput, 'jean-michel');
        setInput(identifiers.deviceInput, 'jean-michel');
        submitBtn.click();
        expect(sendEventSpy).toHaveBeenCalledTimes(0);

        setInput(identifiers.androidInput, 'jean-michel');
        setInput(identifiers.androidInput, '0123456789abcdef');
        setInput(identifiers.deviceInput, '0123456789abcde');
        submitBtn.click();
        expect(sendEventSpy).toHaveBeenCalledTimes(2);
        expect(instance.outgoingMessages[0]).toEqual({
            channel: 'framework',
            messages: ['set parameter android_id:0123456789abcdef'],
        });
        expect(instance.outgoingMessages[1]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcde'],
        });

        setInput(identifiers.androidInput, '0123456789abcdef');

        setInput(identifiers.deviceInput, 'jean-michel'); // Attempt invalid
        submitBtn.click();
        expect(sendEventSpy).toHaveBeenCalledTimes(4); // +2 messages (android + device old value)
        expect(instance.outgoingMessages[2]).toEqual({
            channel: 'framework',
            messages: ['set parameter android_id:0123456789abcdef'],
        });
        expect(instance.outgoingMessages[3]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcde'],
        });

        setInput(identifiers.deviceInput, '0123456789abcdb'); // Valid change
        submitBtn.click();
        expect(sendEventSpy).toHaveBeenCalledTimes(6); // +2 messages
        expect(instance.outgoingMessages[4]).toEqual({
            channel: 'framework',
            messages: ['set parameter android_id:0123456789abcdef'],
        });
        expect(instance.outgoingMessages[5]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcdb'],
        });

        setInput(identifiers.androidInput, '1234567891234@é%'); // Invalid
        submitBtn.click();
        expect(sendEventSpy).toHaveBeenCalledTimes(8); // +2 messages (android old + device)
        expect(instance.outgoingMessages[7]).toEqual({
            channel: 'settings',
            messages: ['set parameter device_id:0123456789abcdb'],
        });
    });
});
