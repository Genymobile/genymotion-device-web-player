'use strict';

const StreamBitrate = require('../../src/plugins/StreamBitrate');
const Instance = require('../mocks/DeviceRenderer');

let chooser;
let instance;

describe.only('StreamBitrate Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        chooser = new StreamBitrate(instance, {});
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof StreamBitrate).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            new StreamBitrate(instance, {
                STREAMRATE_TITLE: 'TEST QUALITY PLUGIN TITLE',
            });
        });

        test('is initialized properly at construct', () => {
            // Toolbar button
            document.querySelector('.gm-streamrate-button');
            expect(document.getElementsByClassName('gm-streamrate-chooser')).toHaveLength(1);
        });
    });

    describe('outgoing events', () => {
        test('hq', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            chooser.highQuality = false;
            document.querySelector('.gm-streamrate-chooser').click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({type: 'BITRATE', videoBitrate: 5000, audioBitrate: 192000});

            document.querySelector('.gm-streamrate-chooser').click();
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({type: 'BITRATE', videoBitrate: 0, audioBitrate: 0});
        });

        test('default', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');

            chooser.highQuality = true;
            document.querySelector('.gm-streamrate-chooser').click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({type: 'BITRATE', videoBitrate: 0, audioBitrate: 0});

            document.querySelector('.gm-streamrate-chooser').click();
            expect(sendEventSpy).toHaveBeenCalledTimes(2);
            expect(instance.outgoingMessages[1]).toEqual({type: 'BITRATE', videoBitrate: 5000, audioBitrate: 192000});
        });
    });
});
