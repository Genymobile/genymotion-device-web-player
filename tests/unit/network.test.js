'use strict';

const Network = require('../../src/plugins/Network');
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
                WIFI: 'TEST NETWORK PLUGIN WIFI',
                MOBILE_DATA: 'TEST NETWORK MOBILE_DATA',
                NETWORK_TYPE: 'TEST NETWORK PLUGIN NETWORK TYPE',
                SIGNAL_STRENGTH: 'TEST NETWORK PLUGIN SIGNAL STRENGTH',
            });
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
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN WIFI'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK MOBILE_DATA'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN NETWORK TYPE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST NETWORK PLUGIN SIGNAL STRENGTH'));
        });
    });

    describe('incoming events', () => {
        beforeEach(() => {
            network = new Network(instance, {});
        });

        test('wifi switch change on incoming event', () => {
            instance.emit('settings', 'if wifi:off mobile:off');
            expect(network.wifiSwitch.getState()).toBe(false);
            instance.emit('settings', 'if wifi:on mobile:on');
            expect(network.wifiSwitch.getState()).toBe(true);
        });

        test('mobile data switch change on incoming event', () => {
            instance.emit('settings', 'if wifi:on mobile:on');
            expect(network.mobileDataSwitch.getState()).toBe(true);

            expect(document.querySelector('.gm-network-mobile-section').classList).not.toContain('disabled');
            expect(document.querySelector('.gm-network-type-dropdown').classList).not.toContain('disabled');
            expect(document.querySelector('.gm-signal-strength-dropdown').classList).not.toContain('disabled');

            instance.emit('settings', 'if wifi:off mobile:off');
            expect(network.mobileDataSwitch.getState()).toBe(false);

            expect(document.querySelector('.gm-network-mobile-section').classList).toContain('disabled');
            expect(document.querySelector('.gm-network-type-dropdown').classList).toContain('disabled');
            expect(document.querySelector('.gm-signal-strength-dropdown').classList).toContain('disabled');

            document
                .querySelectorAll('.gm-network-mobile-section > section:nth-of-type(1) > span')
                .forEach((element) => {
                    expect(element.textContent).toBe('');
                });
        });

        test('network_profile with invalid value', () => {
            const updateDetail = jest.spyOn(network, 'updateDetail');
            ['jean-michel', 'state wifi -123', '', 'state wifi missing:additional:values'].forEach((invalidValue) => {
                instance.emit('network_profile', invalidValue);
                expect(updateDetail).not.toHaveBeenCalled();
            });
        });

        test('network_profile with valid value', () => {
            // 3G UMTS with great signal strength
            instance.emit('settings', 'if wifi:off mobile:on');
            instance.emit(
                'network_profile',
                // eslint-disable-next-line max-len
                'state phone up_rate:enabled:384 down_rate:enabled:384 up_delay:enabled:75 down_delay:enabled:75 up_pkt_loss:enabled:0.00 down_pkt_loss:enabled:0.00 dns_delay:enabled:200 profile:umts signal_strength:great',
            );

            expect(network.dropdownNetworkType.getValue()).toBe('umts');

            expect(document.querySelector('.gm-network-mobile-section > section:nth-of-type(1)').textContent).toContain(
                'Download speed:',
            );

            const expectedResponse = [
                'Download speed: 384 b/s',
                'Upload speed: 384 b/s',
                'Download delay: 75 s',
                'Upload delay: 75 s',
                'Download packet loss: 0.00 %',
                'Upload packet loss: 0.00 %',
                'DNS Delay: 200 s',
            ];
            document.querySelectorAll('.gm-network-mobile-section > section').forEach((element, index) => {
                const expectedText = expectedResponse[index].split(': ')[0];
                const expectedValue = expectedResponse[index].split(': ')[1];
                expect(element.textContent).toContain(expectedText);
                expect(element.querySelector('span').textContent).toContain(expectedValue);
            });
        });
    });

    describe('outgoing events', () => {
        beforeEach(() => {
            network = new Network(instance, {});
        });

        test('wifi emit status event', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');
            network.wifiSwitch.setState(true, true);
            expect(sendEventSpy).toHaveBeenCalledWith({channel: 'settings', messages: ['enableif wifi']});
        });

        test('mobile data emit status event', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');
            network.mobileDataSwitch.setState(true, true);
            expect(sendEventSpy).toHaveBeenCalledWith({channel: 'settings', messages: ['enableif mobile']});
            expect(sendEventSpy).toHaveBeenCalledWith({channel: 'network_profile', messages: ['notify phone']});
        });

        test('change network_profile emit event', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');
            // change network profile
            const dropDownSelectProfile = network.profilesForDropdownNetworkType.find((p) => p.value === 'lte');
            network.dropdownNetworkType.setValue(dropDownSelectProfile, true);
            expect(sendEventSpy).toHaveBeenCalledWith({
                channel: 'network_profile',
                messages: ['setprofile mobile lte'],
            });

            // change signal strength
            const dropdownSignalStrengthProfile = network.profilesForDropdownSignalStrength.find(
                (p) => p.value === 'great',
            );
            network.selectMobileSignalStrength.setValue(dropdownSignalStrengthProfile, true);
            expect(sendEventSpy).toHaveBeenCalledWith({
                channel: 'network_profile',
                messages: ['setsignalstrength mobile great'],
            });
        });
    });
});
