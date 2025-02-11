'use strict';

const IOThrottling = require('../../src/plugins/IOThrottling');
const IOThrottlingProfiles = require('../../src/plugins/util/iothrottling-profiles');
const Instance = require('../mocks/DeviceRenderer');

let diskio;
let instance;
let plugin;

describe('IOThrottling Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        diskio = new IOThrottling(instance, {});
        plugin = document.getElementsByClassName('gm-iothrottling-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof IOThrottling).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new IOThrottling(instance, {
                IOTHROTTLING_TITLE: 'TEST IOTHROTTLING PLUGIN TITLE',
                IOTHROTTLING_PROFILE_NONE: 'TEST IOTHROTTLING PLUGIN PROFILE NONE',
                IOTHROTTLING_PROFILE: 'TEST PROFILE',
                IOTHROTTLING_READ_BYTERATE: 'TEST IOTHROTTLING PLUGIN READ BYTERATE',
                IOTHROTTLING_READ_BYTERATE_CUSTOM: 'TEST IOTHROTTLING PLUGIN READ BYTERATE CUSTOM',
                IOTHROTTLING_READ_BYTERATE_NONE: 'TEST IOTHROTTLING PLUGIN READ BYTERATE NONE',
                IOTHROTTLING_BYTERATE_UNIT: 'TEST IOTHROTTLING PLUGIN BYTERATE UNIT',
                IOTHROTTLING_UPDATE: 'TEST IOTHROTTLING PLUGIN UPDATE BUTTON',
                IOTHROTTLING_CLEAR_CACHE: 'TEST IOTHROTTLING PLUGIN CLEAR CACHE BUTTON',
            });
            plugin = document.getElementsByClassName('gm-iothrottling-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-iothrottling-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-iothrottling-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST PROFILE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN READ BYTERATE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN BYTERATE UNIT'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN UPDATE BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN CLEAR CACHE BUTTON'));
        });
    });

    describe('incoming events', () => {
        test('diskio', () => {
            ['jean-michel', 'readbyterate -123', '', 'readbyterate invalid'].forEach((invalidValue) => {
                instance.emit('diskio', invalidValue);
                expect(diskio.dropdownProfile.getValue()).toBe(0);
            });

            [69, 420].forEach((customValue) => {
                instance.emit('diskio', `readbyterate ${customValue * 1024 * 1024}`);
                expect(diskio.dropdownProfile.getValue()).toBe('Custom');
                expect(Number(diskio.readByteRate.getValue())).toBe(customValue);
            });

            IOThrottlingProfiles.forEach((profile) => {
                if (!profile.readByteRate) {
                    return;
                }

                instance.emit('diskio', `readbyterate ${profile.readByteRate * 1024 * 1024}`);
                expect(diskio.dropdownProfile.getValue()).toBe(profile.readByteRate);
                expect(Number(diskio.readByteRate.getValue())).toBe(profile.readByteRate);
            });
        });
    });

    describe('outgoing events', () => {
        test('readbyterate', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            IOThrottlingProfiles.forEach((profile) => {
                if (!profile.readByteRate) {
                    return;
                }

                sendEventSpy.mockClear();
                instance.outgoingMessages = [];
                const dropDownProfile = diskio.profilesForDropdown.find((p) => p.value === profile.readByteRate);
                diskio.dropdownProfile.setValue(dropDownProfile, true);
                diskio.widget.querySelector('.gm-btn').click();
                expect(sendEventSpy).toHaveBeenCalledTimes(1);
                expect(instance.outgoingMessages[0]).toEqual({
                    channel: 'diskio',
                    messages: ['set readbyterate ' + profile.readByteRate * 1024 * 1024, 'clearcache'],
                });
            });

            sendEventSpy.mockClear();
            instance.outgoingMessages = [];
            const dropDownProfile = diskio.profilesForDropdown.find((p) => p.name === 'Custom');
            diskio.dropdownProfile.setValue(dropDownProfile, true);
            diskio.readByteRate.setValue(69);
            diskio.widget.querySelector('.gm-btn').click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'diskio',
                messages: ['set readbyterate ' + 69 * 1024 * 1024, 'clearcache'],
            });
        });

        test('readbyterate', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            diskio.clearCacheBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'diskio',
                messages: ['clearcache'],
            });
        });
    });
});
