'use strict';

const Sim = require('../../src/plugins/Sim');
const Instance = require('../mocks/GenymotionInstance');

let instance;
let sim;
let plugin;

describe('Sim Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        sim = new Sim(instance, {}, true);
        plugin = document.getElementsByClassName('gm-sim-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Sim).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new Sim(instance, {
                NETWORK_TITLE: 'TEST NETWORK PLUGIN TITLE',
                NETWORK_OPERATOR: 'TEST NETWORK PLUGIN NETWORK OPERATOR',
                NETWORK_SIM_OPERATOR: 'TEST NETWORK PLUGIN SIM OPERATOR',
                NETWORK_UPDATE: 'TEST NETWORK PLUGIN UPDATE'
            }, true);
            plugin = document.getElementsByClassName('gm-sim-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-sim-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-sim-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN NETWORK OPERATOR'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN SIM OPERATOR'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN UPDATE'));
        });
    });

    describe('incoming baseband events', () => {
        describe('network', () => {
            test('operator', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `network operator ${value}`);
                    expect(sim.networkOperatorMMC.value).toBe(value);
                });
            });

            test('operator_name', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `network operator_name ${value}`);
                    expect(sim.networkOperatorName.value).toBe(value);
                });
            });
        });

        describe('sim', () => {
            test('operator', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `sim operator ${value}`);
                    expect(sim.simOperatorMMC.value).toBe(value);
                });
            });

            test('operator_name', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `sim operator_name ${value}`);
                    expect(sim.simOperatorName.value).toBe(value);
                });
            });

            test('imsi_id', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `sim imsi_id ${value}`);
                    expect(sim.simMSIN.value).toBe(value);
                });
            });

            test('phone_number', () => {
                ['jean-michel', '-123', ''].forEach((value) => {
                    instance.emit('baseband', `sim phone_number ${value}`);
                    expect(sim.simOperatorPhoneNumber.value).toBe(value);
                });
            });
        });
    });

    describe('outgoing events', () => {
        test('baseband', () => {
            instance = new Instance();
            sim = new Sim(instance, {}, true);
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            sim.networkOperatorMMC.value = '123456';
            sim.networkOperatorName.value = 'value';
            sim.simOperatorMMC.value = '123456';
            sim.submitBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({channel: 'baseband', messages: [
                'network operator 123456',
                'network operator_name value',
                'sim operator 123456',
            ]});

            sim.simOperatorName.value = 'value';
            sim.simMSIN.value = '0123456789';
            sim.simOperatorPhoneNumber.value = '0011223344';
            sim.submitBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({channel: 'baseband', messages: [
                'network operator 123456',
                'network operator_name value',
                'sim operator 123456',
                'sim operator_name value',
                'sim imsi_id 0123456789',
                'sim phone_number 0011223344'
            ]});
        });
    });
});
