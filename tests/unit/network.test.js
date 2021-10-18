'use strict';

const Network = require('../../src/plugins/Network');
const NetworkProfiles = require('../../src/plugins/util/network-profiles');
const Instance = require('../mocks/GenymotionInstance');

let network;
let instance;
let plugin;

describe('Network Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        network = new Network(instance, {}, true);
        plugin = document.getElementsByClassName('gm-network-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Network).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new Network(instance, {
                NETWORK_TITLE: 'TEST NETWORK PLUGIN TITLE',
                NETWORK_DELECT_PROFILE: 'TEST NETWORK PLUGIN DETECT PROFILE',
                NETWORK_OPERATOR: 'TEST NETWORK PLUGIN NETWORK OPERATOR',
                NETWORK_SIM_OPERATOR: 'TEST NETWORK PLUGIN SIM OPERATOR',
                NETWORK_UPDATE: 'TEST NETWORK PLUGIN UPDATE'
            }, true);
            plugin = document.getElementsByClassName('gm-network-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-network-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-network-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN DETECT PROFILE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN NETWORK OPERATOR'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN SIM OPERATOR'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN UPDATE'));
        });
    });

    describe('incoming events', () => {
        test('NETWORK', () => {
            const loadDetails = jest.spyOn(network, 'loadDetails');

            ['jean-michel', '-123', '', '9'].forEach((invalidValue) => {
                instance.emit('NETWORK', invalidValue);
                expect(loadDetails).not.toHaveBeenCalled();
            });

            NetworkProfiles.forEach((profile) => {
                instance.emit('NETWORK', profile.id);
                expect(loadDetails).toHaveBeenCalledWith(NetworkProfiles[NetworkProfiles.length - 1 - profile.id]);
                loadDetails.mockReset();
            });
        });

        test('network_profile', () => {
            const loadDetails = jest.spyOn(network, 'loadDetails');

            ['jean-michel', 'state wifi -123', '', 'state wifi missing:additional:values'].forEach((invalidValue) => {
                instance.emit('network_profile', invalidValue);
                expect(loadDetails).not.toHaveBeenCalled();
            });

            NetworkProfiles.forEach((profile) => {
                let message = 'state wifi ';
                message += `up_rate:enabled:${profile.upSpeed.value} `;
                message += `down_rate:enabled:${profile.downSpeed.value} `;
                message += `up_delay:enabled:${profile.upDelay.value} `;
                message += `down_delay:enabled:${profile.downDelay.value} `;
                message += `up_pkt_loss:enabled:${profile.upPacketLoss.value} `;
                message += `down_pkt_loss:enabled:${profile.downPacketLoss.value} `;
                message += `dns_delay:enabled:${profile.dnsDelay.value}`;
                instance.emit('network_profile', message);
                expect(loadDetails).toHaveBeenCalledWith(NetworkProfiles[NetworkProfiles.length - 1 - profile.id]);
                loadDetails.mockReset();
            });

            let message = 'state wifi ';
            message += `up_rate:enabled:${NetworkProfiles[0].upSpeed.value + 1} `; // Unexpected value
            message += `down_rate:enabled:${NetworkProfiles[0].downSpeed.value} `;
            message += `up_delay:enabled:${NetworkProfiles[0].upDelay.value} `;
            message += `down_delay:enabled:${NetworkProfiles[0].downDelay.value} `;
            message += `up_pkt_loss:enabled:${NetworkProfiles[0].upPacketLoss.value} `;
            message += `down_pkt_loss:enabled:${NetworkProfiles[0].downPacketLoss.value} `;
            message += `dns_delay:enabled:${NetworkProfiles[0].dnsDelay.value}`;
            instance.emit('network_profile', message);
            expect(loadDetails).not.toHaveBeenCalled();
            loadDetails.mockReset();

            message = 'state wifi ';
            message += `up_rate:disabled:${NetworkProfiles[0].upSpeed.value} `; // Disabled value
            message += `down_rate:enabled:${NetworkProfiles[0].downSpeed.value} `;
            message += `up_delay:enabled:${NetworkProfiles[0].upDelay.value} `;
            message += `down_delay:enabled:${NetworkProfiles[0].downDelay.value} `;
            message += `up_pkt_loss:enabled:${NetworkProfiles[0].upPacketLoss.value} `;
            message += `down_pkt_loss:enabled:${NetworkProfiles[0].downPacketLoss.value} `;
            message += `dns_delay:enabled:${NetworkProfiles[0].dnsDelay.value}`;
            instance.emit('network_profile', message);
            expect(loadDetails).not.toHaveBeenCalled();
            loadDetails.mockReset();
        });

        describe('baseband', () => {
            describe('network', () => {
                test('operator', () => {
                    ['jean-michel', '-123', ''].forEach((value) => {
                        instance.emit('baseband', `network operator ${value}`);
                        expect(network.networkOperatorMMC.value).toBe(value);
                    });
                });

                test('operator_name', () => {
                    ['jean-michel', '-123', ''].forEach((value) => {
                        instance.emit('baseband', `network operator_name ${value}`);
                        expect(network.networkOperatorName.value).toBe(value);
                    });
                });
            });

            describe('sim', () => {
                test('operator', () => {
                    ['jean-michel', '-123', ''].forEach((value) => {
                        instance.emit('baseband', `sim operator ${value}`);
                        expect(network.simOperatorMMC.value).toBe(value);
                    });
                });

                test('operator_name', () => {
                    ['jean-michel', '-123', ''].forEach((value) => {
                        instance.emit('baseband', `sim operator_name ${value}`);
                        expect(network.simOperatorName.value).toBe(value);
                    });
                });

                test('imsi_id', () => {
                    ['jean-michel', '-123', ''].forEach((value) => {
                        instance.emit('baseband', `sim imsi_id ${value}`);
                        expect(network.simMSIN.value).toBe(value);
                    });
                });

                test('phone_number', () => {
                    ['jean-michel', '-123', ''].forEach((value) => {
                        instance.emit('baseband', `sim phone_number ${value}`);
                        expect(network.simOperatorPhoneNumber.value).toBe(value);
                    });
                });
            });
        });
    });

    describe('outgoing events', () => {
        test('wifi', () => {
            instance = new Instance();
            network = new Network(instance, {}, false);
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            NetworkProfiles.forEach((profile) => {
                sendEventSpy.mockClear();
                instance.outgoingMessages = [];
                const messages = [];

                if (profile.id === 0) {
                    messages.push('disable wifi all');
                } else {
                    messages.push('enable wifi all');
                    messages.push(`set wifi up_rate ${profile.upSpeed.value}`);
                    messages.push(`set wifi down_rate ${profile.downSpeed.value}`);
                    messages.push(`set wifi up_delay ${profile.upDelay.value}`);
                    messages.push(`set wifi down_delay ${profile.downDelay.value}`);
                    messages.push(`set wifi up_pkt_loss ${profile.upPacketLoss.value}`);
                    messages.push(`set wifi down_pkt_loss ${profile.downPacketLoss.value}`);
                    messages.push(`set wifi dns_delay ${profile.dnsDelay.value}`);
                }

                network.setActive(profile.id);
                network.submitBtn.click();
                expect(sendEventSpy).toHaveBeenCalledTimes(1);
                expect(instance.outgoingMessages[0]).toEqual({channel: 'network_profile', messages: messages});
            });

            sendEventSpy.mockClear();
            network.select.value = 'Select a profile';
            network.submitBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(0);
        });

        test('baseband', () => {
            instance = new Instance();
            network = new Network(instance, {}, true);
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            network.select.value = 'Select a profile';
            network.submitBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(0);

            network.networkOperatorMMC.value = '123456';
            network.networkOperatorName.value = 'value';
            network.simOperatorMMC.value = '123456';
            network.submitBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({channel: 'baseband', messages: [
                'network operator 123456',
                'network operator_name value',
                'sim operator 123456',
            ]});

            network.simOperatorName.value = 'value';
            network.simMSIN.value = '0123456789';
            network.simOperatorPhoneNumber.value = '0011223344';
            network.submitBtn.click();
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
