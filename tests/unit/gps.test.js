'use strict';

jest.mock('loglevel');

const GPS = require('../../src/plugins/GPS');
const Instance = require('../mocks/DeviceRenderer');

let gps;
let instance;
let plugin;

describe('GPS Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        gps = new GPS(
            instance,
            {
                GPS_TITLE: 'TEST GPS PLUGIN TITLE',
                GPS_LATITUDE: 'TEST GPS PLUGIN LATITUDE',
                GPS_LONGITUDE: 'TEST GPS PLUGIN LONGITUDE',
                GPS_ALTITUDE: 'TEST GPS PLUGIN ALTITUDE',
                GPS_ACCURACY: 'TEST GPS PLUGIN ACCURACY',
                GPS_BEARING: 'TEST GPS PLUGIN BEARING',
                GPS_SPEED: 'TEST GPS PLUGIN SPEED',
                GPS_APPLY: 'TEST GPS PLUGIN APPLY',
                GPS_SET_TO_MY_POSITION: 'TEST GPS PLUGIN SET TO MY POSITION',
            },
            true,
        );
        plugin = document.getElementsByClassName('gm-gps-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof GPS).toBe('function');
        });
    });

    describe('UI', () => {
        test('has no speed support by default', () => {
            instance = new Instance();
            gps = new GPS(instance, {});
            expect(document.getElementsByClassName('gm-gps-speed')).toHaveLength(0);
        });

        test('is initialized properly at construct', () => {
            // Toolbar button
            expect(document.getElementsByClassName('gm-gps-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN LATITUDE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN LONGITUDE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN ALTITUDE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN ACCURACY'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN BEARING'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN SPEED'));
        });

        describe('field validation', () => {
            const inputsInvalidValues = [
                ['latitude', 100],
                ['longitude', -666],
                ['altitude', 23456],
                ['speed', 400],
                ['bearing', 361],
                ['accuracy', 5010],
            ];
            inputsInvalidValues.forEach(([field, value]) => {
                test(`button disabled when ${field} is invalid`, () => {
                    const fieldInput = gps.inputComponents[field];
                    const submitButton = document.querySelector('.gm-gps-update');
                    fieldInput.setValue(value, true);
                    if (field !== 'accuracy' && field !== 'bearing') {
                        expect(
                            fieldInput.element.querySelector('.text-input-message').classList.contains('hidden'),
                        ).toBeFalsy();
                    }
                    expect(submitButton.disabled).toBeTruthy();
                });
            });
        });
    });

    describe('incoming events', () => {
        describe('gps', () => {
            test('invalid messages', () => {
                const setFieldValue = jest.spyOn(gps, 'setFieldValue');

                instance.emit('gps', 'status');
                expect(setFieldValue).toHaveBeenCalledTimes(0);

                instance.emit('gps', 'jean-michel');
                expect(setFieldValue).toHaveBeenCalledTimes(0);
            });
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

        test('invalid input value', () => {
            gps.inputComponents.altitude.setValue('jean-michel', true);
            gps.inputComponents.latitude.setValue('jean-michel', true);
            gps.inputComponents.longitude.setValue('jean-michel', true);
            gps.inputComponents.accuracy.setValue('jean-michel', true);
            gps.inputComponents.bearing.setValue('jean-michel', true);
            gps.inputComponents.speed.setValue('jean-michel', true);
            expect(document.querySelector('.gm-gps-update').disabled).toBeTruthy();

            document.querySelector('.gm-gps-update').click();

            expect(sendEventSpy).toHaveBeenCalledTimes(0);
        });

        test('min value', () => {
            gps.inputComponents.altitude.setValue('-10000', true);
            gps.inputComponents.latitude.setValue('-90', true);
            gps.inputComponents.longitude.setValue('-180', true);
            gps.inputComponents.accuracy.setValue('0', true);
            gps.inputComponents.bearing.setValue('0', true);
            gps.inputComponents.speed.setValue('0', true);
            document.querySelector('.gm-gps-update').click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'gps',
                messages: [
                    'set altitude -10000',
                    'set longitude -180',
                    'set latitude -90',
                    'set accuracy 0',
                    'set bearing 0',
                    'set speed 0',
                    'enable',
                ],
            });
        });

        test('max value', () => {
            gps.inputComponents.altitude.setValue('10000', true);
            gps.inputComponents.latitude.setValue('90', true);
            gps.inputComponents.longitude.setValue('180', true);
            gps.inputComponents.accuracy.setValue('200', true);
            gps.inputComponents.bearing.setValue('360', true);
            gps.inputComponents.speed.setValue('399.99', true);
            document.querySelector('.gm-gps-update').click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'gps',
                messages: [
                    'set altitude 10000',
                    'set longitude 180',
                    'set latitude 90',
                    'set accuracy 200',
                    'set bearing 360',
                    'set speed 399.99',
                    'enable',
                ],
            });
        });

        test('nominal value', () => {
            gps.inputComponents.altitude.setValue('420', true);
            gps.inputComponents.latitude.setValue('69', true); // Nice
            gps.inputComponents.longitude.setValue('3.14', true);
            gps.inputComponents.accuracy.setValue('42', true);
            gps.inputComponents.bearing.setValue('13', true);
            gps.inputComponents.speed.setValue('399', true);
            document.querySelector('.gm-gps-update').click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'gps',
                messages: [
                    'set altitude 420',
                    'set longitude 3.14',
                    'set latitude 69',
                    'set accuracy 42',
                    'set bearing 13',
                    'set speed 399',
                    'enable',
                ],
            });
        });
    });
});
