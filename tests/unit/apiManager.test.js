'use strict';

const Instance = require('../mocks/DeviceRenderer');
const Clipboard = require('../../src/plugins/Clipboard');

let instance;
let exposedApiFunctions;

describe('APIManager', () => {
    beforeEach(() => {
        instance = new Instance({});
        exposedApiFunctions = instance.apiManager.getExposedApiFunctions();

        new Clipboard(instance, {
            CLIPBOARD_TITLE: 'TEST CLIPBOARD PLUGIN TITLE',
        });
    });

    describe('has exposed api', () => {
        test('getRegisteredFunctions', () => {
            const registeredFunctions = exposedApiFunctions.utils.getRegisteredFunctions();
            expect(Object.keys(registeredFunctions)).toEqual(
                expect.arrayContaining([
                    'sendData',
                    'getRegisteredFunctions',
                    'addEventListener',
                    'disconnect',
                    'enableTrackEvents',
                    'trackEvents',
                ]),
            );
        });

        test('sendTrackEvent', () => {
            let events = [];

            exposedApiFunctions.analytics.enableTrackEvents(true);

            // attach callback to get events
            exposedApiFunctions.analytics.trackEvents((evts) => {
                events = evts;
            });

            const button = document.getElementsByClassName('gm-clipboard-button')[0];
            expect(button).toBeTruthy();
            button.click();

            // expect object to be exactly the same
            expect(events).toEqual([{category: 'widget', action: 'open', name: 'Clipboard'}]);
        });
    });
});
