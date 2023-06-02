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
                IOTHROTTLING_PROFILE: 'TEST IOTHROTTLING PLUGIN PROFILE',
                IOTHROTTLING_PROFILE_NONE: 'TEST IOTHROTTLING PLUGIN PROFILE NONE',
                IOTHROTTLING_READ_BYTERATE: 'TEST IOTHROTTLING PLUGIN READ BYTERATE',
                IOTHROTTLING_READ_BYTERATE_EXAMPLE: 'TEST IOTHROTTLING PLUGIN READ BYTERATE EXAMPLE',
                IOTHROTTLING_BYTERATE_UNIT: 'TEST IOTHROTTLING PLUGIN BYTERATE UNIT',
                IOTHROTTLING_UPDATE: 'TEST IOTHROTTLING PLUGIN UPDATE BUTTON',
                IOTHROTTLING_CLEAR_CACHE: 'TEST IOTHROTTLING PLUGIN CLEAR CACHE BUTTON'
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
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN PROFILE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN PROFILE NONE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN READ BYTERATE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN READ BYTERATE EXAMPLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN BYTERATE UNIT'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN UPDATE BUTTON'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST IOTHROTTLING PLUGIN CLEAR CACHE BUTTON'));
        });
    });

    describe('incoming events', () => {
        test('BLK', () => {
            ['jean-michel', '-123', ''].forEach((invalidValue) => {
                instance.emit('BLK', invalidValue);
                expect(diskio.select.value).toBe('None');
            });

            [69, 420].forEach((customValue) => {
                instance.emit('BLK', customValue * 1024);
                expect(diskio.select.value).toBe('Custom');
                expect(Number(diskio.readByteRate.value)).toBe(customValue);
            });

            IOThrottlingProfiles.forEach((profile) => {
                if (!profile.readByteRate) {
                    return;
                }

                instance.emit('BLK', profile.readByteRate * 1024);
                expect(diskio.select.value).toBe(profile.name);
                expect(Number(diskio.readByteRate.value)).toBe(profile.readByteRate);
            });
        });

        test('diskio', () => {
            ['jean-michel', 'readbyterate -123', '', 'readbyterate invalid'].forEach((invalidValue) => {
                instance.emit('diskio', invalidValue);
                expect(diskio.select.value).toBe('None');
            });

            [69, 420].forEach((customValue) => {
                instance.emit('diskio', `readbyterate ${customValue * 1024 * 1024}`);
                expect(diskio.select.value).toBe('Custom');
                expect(Number(diskio.readByteRate.value)).toBe(customValue);
            });

            IOThrottlingProfiles.forEach((profile) => {
                if (!profile.readByteRate) {
                    return;
                }

                instance.emit('diskio', `readbyterate ${profile.readByteRate * 1024 * 1024}`);
                expect(diskio.select.value).toBe(profile.name);
                expect(Number(diskio.readByteRate.value)).toBe(profile.readByteRate);
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
                diskio.select.value = profile.name;
                diskio.select.dispatchEvent(new Event('change'));
                diskio.submitBtn.click();
                expect(sendEventSpy).toHaveBeenCalledTimes(1);
                expect(instance.outgoingMessages[0]).toEqual({
                    channel: 'diskio', messages: [
                        'set readbyterate ' + profile.readByteRate * 1024 * 1024,
                        'clearcache'
                    ]
                });
            });

            sendEventSpy.mockClear();
            instance.outgoingMessages = [];
            diskio.select.value = 'Custom';
            diskio.select.dispatchEvent(new Event('change'));
            diskio.readByteRate.value = 69; // Nice
            diskio.submitBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'diskio', messages: [
                    'set readbyterate ' + 69 * 1024 * 1024,
                    'clearcache'
                ]
            });
        });

        test('readbyterate', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            diskio.clearCacheBtn.click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'diskio', messages: ['clearcache']
            });
        });
    });
});
