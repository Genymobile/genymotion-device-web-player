'use strict';

const BasebandRIL = require('../../src/plugins/BasebandRIL');
const Instance = require('../mocks/DeviceRenderer');

let instance;
let baseband;
let plugin;

describe('BasebandRIL Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        baseband = new BasebandRIL(instance, {}, true);
        plugin = document.getElementsByClassName('gm-baseband-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof BasebandRIL).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new BasebandRIL(
                instance,
                {
                    BASEBAND_TITLE: 'TEST BASEBAND PLUGIN TITLE',
                    NETWORK_OPERATOR: 'TEST BASEBAND PLUGIN NETWORK OPERATOR',
                    NETWORK_SIM_OPERATOR: 'TEST BASEBAND PLUGIN SIM OPERATOR',
                    BASEBAND_APPLY: 'TEST BASEBAND PLUGIN UPDATE',
                },
                true,
            );
            plugin = document.getElementsByClassName('gm-baseband-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-baseband-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-sim-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BASEBAND PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BASEBAND PLUGIN NETWORK OPERATOR'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BASEBAND PLUGIN SIM OPERATOR'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST BASEBAND PLUGIN UPDATE'));
        });
    });

    describe('incoming baseband events', () => {
        describe('network', () => {
            test('operator', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `network operator ${value}`);
                    expect(baseband.networkOperatorMMC.getValue()).toBe('');
                });
                instance.emit('baseband', 'network operator 12345');
                expect(baseband.networkOperatorMMC.getValue()).toBe('12345');
            });

            test('operator_name', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `network operator_name ${value}`);
                    expect(baseband.networkOperatorName.getValue()).toBe(value);
                });
            });
        });

        describe('baseband', () => {
            test('operator', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `sim operator ${value}`);
                    expect(baseband.simOperatorMMC.getValue()).toBe('');
                });
                instance.emit('baseband', 'sim operator 12345');
                expect(baseband.simOperatorMMC.getValue()).toBe('12345');
            });

            test('operator_name', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `sim operator_name ${value}`);
                    expect(baseband.simOperatorName.getValue()).toBe(value);
                });
            });

            test('imsi_id', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `sim imsi_id ${value}`);
                    expect(baseband.simMSIN.getValue()).toBe('');
                });
                instance.emit('baseband', 'sim imsi_id 012345678');
                expect(baseband.simMSIN.getValue()).toBe('012345678');
            });

            test('phone_number', () => {
                instance.emit('baseband', 'sim phone_number jean-michel');
                expect(baseband.simOperatorPhoneNumber.getValue()).toBe('');
                instance.emit('baseband', 'sim phone_number -123');
                expect(baseband.simOperatorPhoneNumber.getValue()).toBe('-123');
                instance.emit('baseband', 'sim phone_number ');
                expect(baseband.simOperatorPhoneNumber.getValue()).toBe('');
            });
        });
    });

    describe('outgoing events', () => {
        test('baseband', () => {
            instance = new Instance();
            baseband = new BasebandRIL(instance, {}, true);
            instance.emit('baseband', 'network operator 123456');
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            baseband.networkOperatorMMC.setValue('123456', true);
            baseband.networkOperatorName.setValue('value', true);
            baseband.simOperatorMMC.setValue('123456', true);
            baseband.simOperatorName.setValue('value', true);
            baseband.simMSIN.setValue('012345678', true);
            baseband.simOperatorPhoneNumber.setValue('0011223344', true);
            baseband.submitBtn.click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'baseband',
                messages: [
                    'network operator 123456',
                    'network operator_name value',
                    'sim operator 123456',
                    'sim operator_name value',
                    'sim imsi_id 012345678',
                    'sim phone_number 0011223344',
                ],
            });

            baseband.simOperatorName.setValue('value');
            baseband.simMSIN.setValue('012345678');
            baseband.simOperatorPhoneNumber.setValue('0011223344');
            baseband.submitBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({
                channel: 'baseband',
                messages: [
                    'network operator 123456',
                    'network operator_name value',
                    'sim operator 123456',
                    'sim operator_name value',
                    'sim imsi_id 012345678',
                    'sim phone_number 0011223344',
                ],
            });
        });
    });
});
