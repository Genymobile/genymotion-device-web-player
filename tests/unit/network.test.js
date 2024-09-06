'use strict';

const Network = require('../../src/plugins/Network');
const NetworkProfiles = require('../../src/plugins/util/network-profiles');
const Instance = require('../mocks/DeviceRenderer');

let network;
let instance;
let plugin;

describe('Network Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
    });

    describe('api', () => {
        beforeEach(() => {
            network = new Network(instance, {});
            plugin = document.getElementsByClassName('gm-network-plugin')[0];
        });

        test('exposes a high level constructor', () => {
            expect(typeof Network).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            network = new Network(instance, {
                NETWORK_TITLE: 'TEST NETWORK PLUGIN TITLE',
                NETWORK_DELECT_PROFILE: 'TEST NETWORK PLUGIN DETECT PROFILE',
            });
            network.disableMobileThrottling();
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
        });
    });

    describe('incoming events', () => {
        beforeEach(() => {
            network = new Network(instance, {});
            // render default widget
            network.disableMobileThrottling();
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
                expect(async() => {
                    instance.emit('network_profile', message);
                    expect(loadDetails).toHaveBeenCalledWith(NetworkProfiles[NetworkProfiles.length - 1 - profile.id]);
                });
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
    });

    describe('outgoing events', () => {
        beforeEach(() => {
            network = new Network(instance, {});
            // render default widget
            network.disableMobileThrottling();
        });
        test('wifi', () => {
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

                // Emulate user selection on profile
                network.selectProfile.value = profile.name;
                network.changeProfile();
                expect(sendEventSpy).toHaveBeenCalledTimes(1);
                expect(instance.outgoingMessages[0]).toEqual({channel: 'network_profile', messages: messages});
            });

            sendEventSpy.mockClear();
            network.selectProfile.value = 'Select a profile';
            network.changeProfile();
            expect(sendEventSpy).toHaveBeenCalledTimes(0);
        });
    });
});
