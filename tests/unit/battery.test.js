'use strict';

const Battery = require('../../src/plugins/Battery');
const Instance = require('../mocks/DeviceRenderer');

let battery;
let instance;
let plugin;

describe('Battery Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        battery = new Battery(instance, {});
        plugin = document.getElementsByClassName('gm-battery-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Battery).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            battery = new Battery(instance, {
                BATTERY_TITLE: 'TEST BATTERY PLUGIN TITLE',
                BATTERY_CHARGE_LEVEL: 'TEST BATTERY PLUGIN CHARGE LEVEL',
                BATTERY_CHARGE_STATE: 'TEST BATTERY PLUGIN CHARGE STATE',
            });
            plugin = document.getElementsByClassName('gm-battery-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-battery-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-battery-button')).toHaveLength(1);
        });

        test('has default values', () => {
            expect(battery.chargingInput.getState()).toBeFalsy();
            expect(Number(battery.chargeSlider.getValue())).toBe(50);
            expect(Number(battery.chargeInput.getValue())).toBe(50);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BATTERY PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BATTERY PLUGIN CHARGE LEVEL'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BATTERY PLUGIN CHARGE STATE'));
        });
    });

    describe('incoming events', () => {
        let statusMock;
        let levelMock;

        beforeEach(() => {
            statusMock = jest.spyOn(battery, 'updateUIBatteryChargingState');
            levelMock = jest.spyOn(battery, 'updateUIBatteryChargingPercent');
        });

        afterEach(() => {
            statusMock.mockRestore();
            levelMock.mockRestore();
        });

        test('battery', () => {
            instance.emit('battery', 'jean-michel'); // Bad format
            expect(levelMock).not.toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();

            instance.emit('battery', 'state mode badstate badvalue'); // Bad state and value
            expect(levelMock).toHaveBeenLastCalledWith('badvalue');
            expect(statusMock).toHaveBeenLastCalledWith();
            expect(battery.chargingInput.getState()).toBeTruthy();
            expect(Number(battery.chargeSlider.getValue())).toBe(50);
            expect(Number(battery.chargeInput.getValue())).toBe(50);

            instance.emit('battery', 'state mode badstate 69'); // Bad state
            expect(levelMock).toHaveBeenLastCalledWith('69');
            expect(statusMock).toHaveBeenLastCalledWith();
            expect(battery.chargingInput.getState()).toBeTruthy();
            expect(Number(battery.chargeSlider.getValue())).toBe(69);
            expect(Number(battery.chargeInput.getValue())).toBe(69);

            instance.emit('battery', 'state mode discharging badlevel'); // Bad value
            expect(levelMock).toHaveBeenLastCalledWith('badlevel');
            expect(statusMock).toHaveBeenLastCalledWith();

            expect(battery.chargingInput.getState()).toBeFalsy();
            expect(Number(battery.chargeSlider.getValue())).toBe(69); // Previous value
            expect(Number(battery.chargeInput.getValue())).toBe(69); // Previous value

            instance.emit('battery', 'state mode charging 42'); // Good state and value
            expect(levelMock).toHaveBeenLastCalledWith('42');
            expect(statusMock).toHaveBeenLastCalledWith();
            expect(battery.chargingInput.getState()).toBeTruthy();
            expect(Number(battery.chargeSlider.getValue())).toBe(42);
            expect(Number(battery.chargeInput.getValue())).toBe(42);
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

        test('battery level input', () => {
            const input = battery.chargeInput.element.querySelector('input');
            input.value = 69;
            input.dispatchEvent(new Event('input', {bubbles: true}));

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'battery',
                messages: ['set state level 69', 'set state status discharging'],
            });
        });

        test('battery level slider', () => {
            const input = battery.chargeSlider.element.querySelector('input');
            input.value = 42;
            input.dispatchEvent(new Event('change', {bubbles: true}));

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'battery',
                messages: ['set state level 42', 'set state status discharging'],
            });
        });

        test('battery state', () => {
            battery.chargingInput.element.querySelector('input').click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'battery',
                messages: ['set state level 50', 'set state status discharging'],
            });
        });
    });
});
