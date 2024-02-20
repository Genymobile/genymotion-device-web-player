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
                BATTERY_CHARGE_STATE: 'TEST BATTERY PLUGIN CHARGE STATE'
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
            expect(battery.chargingInput.checked).toBeTruthy();
            expect(Number(battery.chargeSlider.value)).toBe(50);
            expect(Number(battery.chargeInput.value)).toBe(50);
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
            levelMock = jest.spyOn(battery, 'onBatteryLevelChange');
        });

        afterEach(() => {
            statusMock.mockRestore();
            levelMock.mockRestore();
        });

        test('BATTERY_STATUS', () => {
            instance.emit('BATTERY_STATUS', 'jean-michel'); // Invalid value (=== charging)
            expect(battery.chargingInput.checked).toBeTruthy();

            instance.emit('BATTERY_STATUS', 'false'); // Discharging
            expect(battery.chargingInput.checked).toBeFalsy();

            instance.emit('BATTERY_STATUS', 'true'); // Charging
            expect(battery.chargingInput.checked).toBeTruthy();
        });

        test('BATTERY_LEVEL', () => {
            instance.emit('BATTERY_LEVEL', 'jean-michel'); // Invalid value
            expect(Number(battery.chargeSlider.value)).toBe(50);
            expect(Number(battery.chargeInput.value)).toBe(50);

            instance.emit('BATTERY_LEVEL', '69'); // Nice
            expect(Number(battery.chargeSlider.value)).toBe(69);
            expect(Number(battery.chargeInput.value)).toBe(69);

            instance.emit('BATTERY_LEVEL', '666'); // Overflow
            expect(Number(battery.chargeSlider.value)).toBe(100);
            expect(Number(battery.chargeInput.value)).toBe(100);

            instance.emit('BATTERY_LEVEL', '-420'); // Underflow
            expect(Number(battery.chargeSlider.value)).toBe(0);
            expect(Number(battery.chargeInput.value)).toBe(0);
        });

        test('battery', () => {
            instance.emit('battery', 'jean-michel'); // Bad format
            expect(levelMock).not.toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();

            instance.emit('battery', 'state mode badstate badvalue'); // Bad state and value
            expect(levelMock).toHaveBeenLastCalledWith('badvalue');
            expect(statusMock).toHaveBeenLastCalledWith(true);
            expect(battery.chargingInput.checked).toBeTruthy();
            expect(Number(battery.chargeSlider.value)).toBe(50);
            expect(Number(battery.chargeInput.value)).toBe(50);

            instance.emit('battery', 'state mode badstate 69'); // Bad state
            expect(levelMock).toHaveBeenLastCalledWith('69');
            expect(statusMock).toHaveBeenLastCalledWith(true);
            expect(battery.chargingInput.checked).toBeTruthy();
            expect(Number(battery.chargeSlider.value)).toBe(69);
            expect(Number(battery.chargeInput.value)).toBe(69);

            instance.emit('battery', 'state mode discharging badlevel'); // Bad value
            expect(levelMock).toHaveBeenLastCalledWith('badlevel');
            expect(statusMock).toHaveBeenLastCalledWith(false);
            expect(battery.chargingInput.checked).toBeFalsy();
            expect(Number(battery.chargeSlider.value)).toBe(69); // Previous value
            expect(Number(battery.chargeInput.value)).toBe(69); // Previous value

            instance.emit('battery', 'state mode charging 42'); // Good state and value
            expect(levelMock).toHaveBeenLastCalledWith('42');
            expect(statusMock).toHaveBeenLastCalledWith(true);
            expect(battery.chargingInput.checked).toBeTruthy();
            expect(Number(battery.chargeSlider.value)).toBe(42);
            expect(Number(battery.chargeInput.value)).toBe(42);
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
            battery.chargeInput.value = 69; // nice
            battery.chargeInput.dispatchEvent(new Event('input'));

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'battery', messages: [
                    'set state level 69',
                    'set state status charging',
                ],
            });
        });

        test('battery level slider', () => {
            battery.chargeSlider.value = 42;
            battery.chargeSlider.dispatchEvent(new Event('change'));

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'battery', messages: [
                    'set state level 42',
                    'set state status charging',
                ],
            });
        });

        test('battery state', () => {
            battery.chargingInput.click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'battery', messages: [
                    'set state level 50',
                    'set state status discharging',
                ],
            });
        });
    });
});
