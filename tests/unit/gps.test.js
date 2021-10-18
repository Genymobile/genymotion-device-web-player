'use strict';

jest.mock('loglevel');

const GPS = require('../../src/plugins/GPS');
const Instance = require('../mocks/GenymotionInstance');

let gps;
let instance;
let controls;
let map;

describe('GPS Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        gps = new GPS(instance, {}, true);
        controls = document.getElementsByClassName('gm-gps-controls')[0];
        map = document.getElementsByClassName('gm-gps-mapview')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof GPS).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            gps = new GPS(instance, {
                GPS_TITLE: 'TEST GPS PLUGIN TITLE',
                GPS_CANCEL: 'TEST GPS PLUGIN CANCEL',
                GPS_CAPTURE: 'TEST GPS PLUGIN CAPTURE',
                GPS_LATITUDE: 'TEST GPS PLUGIN LATITUDE',
                GPS_LONGITUDE: 'TEST GPS PLUGIN LONGITUDE',
                GPS_ALTITUDE: 'TEST GPS PLUGIN ALTITUDE',
                GPS_ACCURACY: 'TEST GPS PLUGIN ACCURACY',
                GPS_BEARING: 'TEST GPS PLUGIN BEARING',
                GPS_SPEED: 'TEST GPS PLUGIN SPEED',
                GPS_MAP: 'TEST GPS PLUGIN MAP',
                GPS_GEOLOC: 'TEST GPS PLUGIN GEOLOC',
                GPS_SUBMIT: 'TEST GPS PLUGIN SUBMIT',
                GPS_GEOLOC_TOOLTIP: 'TEST GPS PLUGIN GEOLOC TOOLTIP',
                GPS_NOGEOLOC_TOOLTIP: 'TEST GPS PLUGIN NOGEOLOC TOOLTIP'
            }, true);
            controls = document.getElementsByClassName('gm-gps-controls')[0];
            map = document.getElementsByClassName('gm-gps-mapview')[0];
        });

        test('has no speed support by default', () => {
            instance = new Instance();
            gps = new GPS(instance, {});
            expect(document.getElementsByClassName('gm-gps-speed')).toHaveLength(0);
        });

        test('is initialized properly at construct', () => {
            // Widget views
            expect(document.getElementsByClassName('gm-gps-controls')).toHaveLength(1);
            expect(document.getElementsByClassName('gm-gps-mapview')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-gps-button')).toHaveLength(1);
        });

        test('has translations', () => {
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN TITLE'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN LATITUDE'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN LONGITUDE'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN ALTITUDE'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN ACCURACY'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN BEARING'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN SPEED'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN GEOLOC'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN SUBMIT'));
            expect(controls.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN MAP'));

            expect(map.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN CAPTURE'));
            expect(map.innerHTML).toEqual(expect.stringContaining('TEST GPS PLUGIN CANCEL'));
        });

        describe('field validation', () => {
            const inputsInvalidValues = [
                ['gm-gps-latitude', 100],
                ['gm-gps-longitude', -666],
                ['gm-gps-altitude', 23456],
                ['gm-gps-accuracy', -2],
                ['gm-gps-bearing', 430],
                ['gm-gps-speed', 400],
            ];
            inputsInvalidValues.forEach(([field, value]) => {
                test('button disabled', () => {
                    const fieldInput = document.getElementsByClassName(field)[0];
                    const submitButton = document.getElementsByClassName('gm-gps-submit')[0];
                    fieldInput.value = value;
                    fieldInput.dispatchEvent(new Event('keyup'));

                    expect(fieldInput.classList.contains('gm-error')).toBeTruthy();
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

            test('altitude', () => {
                const setFieldValue = jest.spyOn(gps, 'setFieldValue');

                instance.emit('gps', 'altitude'); // Missing value
                expect(setFieldValue).toHaveBeenCalledTimes(0);

                instance.emit('gps', 'altitude jean-michel');
                expect(Number(document.getElementsByClassName('gm-gps-altitude')[0].value)).toBe(15.04444408);
                instance.emit('gps', 'altitude -22666');
                expect(Number(document.getElementsByClassName('gm-gps-altitude')[0].value)).toBe(-10000);
                instance.emit('gps', 'altitude 22666');
                expect(Number(document.getElementsByClassName('gm-gps-altitude')[0].value)).toBe(10000);
                expect(setFieldValue).toHaveBeenCalledTimes(3);

                instance.emit('gps', 'altitude 0');
                expect(Number(document.getElementsByClassName('gm-gps-altitude')[0].value)).toBe(0);
                instance.emit('gps', 'altitude -420');
                expect(Number(document.getElementsByClassName('gm-gps-altitude')[0].value)).toBe(-420);
                instance.emit('gps', 'altitude 69'); // Nice
                expect(Number(document.getElementsByClassName('gm-gps-altitude')[0].value)).toBe(69);
                expect(setFieldValue).toHaveBeenCalledTimes(6);
            });

            test('latitude', () => {
                const setFieldValue = jest.spyOn(gps, 'setFieldValue');

                instance.emit('gps', 'latitude'); // Missing value
                expect(setFieldValue).toHaveBeenCalledTimes(0);

                instance.emit('gps', 'latitude jean-michel');
                expect(Number(document.getElementsByClassName('gm-gps-latitude')[0].value)).toBe(65.9667);
                instance.emit('gps', 'latitude -420');
                expect(Number(document.getElementsByClassName('gm-gps-latitude')[0].value)).toBe(-90);
                instance.emit('gps', 'latitude 666');
                expect(Number(document.getElementsByClassName('gm-gps-latitude')[0].value)).toBe(90);
                expect(setFieldValue).toHaveBeenCalledTimes(3);

                instance.emit('gps', 'latitude 0');
                expect(Number(document.getElementsByClassName('gm-gps-latitude')[0].value)).toBe(0);
                instance.emit('gps', 'latitude -42');
                expect(Number(document.getElementsByClassName('gm-gps-latitude')[0].value)).toBe(-42);
                instance.emit('gps', 'latitude 69'); // Nice
                expect(Number(document.getElementsByClassName('gm-gps-latitude')[0].value)).toBe(69);
                expect(setFieldValue).toHaveBeenCalledTimes(6);
            });

            test('longitude', () => {
                const setFieldValue = jest.spyOn(gps, 'setFieldValue');

                instance.emit('gps', 'longitude'); // Missing value
                expect(setFieldValue).toHaveBeenCalledTimes(0);

                instance.emit('gps', 'longitude jean-michel');
                expect(Number(document.getElementsByClassName('gm-gps-longitude')[0].value)).toBe(-18.5333);
                instance.emit('gps', 'longitude -420');
                expect(Number(document.getElementsByClassName('gm-gps-longitude')[0].value)).toBe(-180);
                instance.emit('gps', 'longitude 666');
                expect(Number(document.getElementsByClassName('gm-gps-longitude')[0].value)).toBe(180);
                expect(setFieldValue).toHaveBeenCalledTimes(3);

                instance.emit('gps', 'longitude 0');
                expect(Number(document.getElementsByClassName('gm-gps-longitude')[0].value)).toBe(0);
                instance.emit('gps', 'longitude -123.45');
                expect(Number(document.getElementsByClassName('gm-gps-longitude')[0].value)).toBe(-123.45);
                instance.emit('gps', 'longitude 69'); // Nice
                expect(Number(document.getElementsByClassName('gm-gps-longitude')[0].value)).toBe(69);
                expect(setFieldValue).toHaveBeenCalledTimes(6);
            });

            test('accuracy', () => {
                const setFieldValue = jest.spyOn(gps, 'setFieldValue');

                instance.emit('gps', 'accuracy'); // Missing value
                expect(setFieldValue).toHaveBeenCalledTimes(0);

                instance.emit('gps', 'accuracy jean-michel');
                expect(Number(document.getElementsByClassName('gm-gps-accuracy')[0].value)).toBe(0);
                instance.emit('gps', 'accuracy -666');
                expect(Number(document.getElementsByClassName('gm-gps-accuracy')[0].value)).toBe(0);
                instance.emit('gps', 'accuracy 420');
                expect(Number(document.getElementsByClassName('gm-gps-accuracy')[0].value)).toBe(200);
                expect(setFieldValue).toHaveBeenCalledTimes(3);

                instance.emit('gps', 'accuracy 42');
                expect(Number(document.getElementsByClassName('gm-gps-accuracy')[0].value)).toBe(42);
                instance.emit('gps', 'accuracy 69'); // Nice
                expect(Number(document.getElementsByClassName('gm-gps-accuracy')[0].value)).toBe(69);
                expect(setFieldValue).toHaveBeenCalledTimes(5);
            });

            test('bearing', () => {
                const setFieldValue = jest.spyOn(gps, 'setFieldValue');

                instance.emit('gps', 'bearing'); // Missing value
                expect(setFieldValue).toHaveBeenCalledTimes(0);

                instance.emit('gps', 'bearing jean-michel');
                expect(Number(document.getElementsByClassName('gm-gps-bearing')[0].value)).toBe(0);
                instance.emit('gps', 'bearing -22666');
                expect(Number(document.getElementsByClassName('gm-gps-bearing')[0].value)).toBe(0);
                instance.emit('gps', 'bearing 22666');
                expect(Number(document.getElementsByClassName('gm-gps-bearing')[0].value)).toBe(360);
                expect(setFieldValue).toHaveBeenCalledTimes(3);

                instance.emit('gps', 'bearing 42');
                expect(Number(document.getElementsByClassName('gm-gps-bearing')[0].value)).toBe(42);
                instance.emit('gps', 'bearing 69'); // Nice
                expect(Number(document.getElementsByClassName('gm-gps-bearing')[0].value)).toBe(69);
                expect(setFieldValue).toHaveBeenCalledTimes(5);
            });

            test('speed', () => {
                const setFieldValue = jest.spyOn(gps, 'setFieldValue');

                instance.emit('gps', 'speed'); // Missing value
                expect(setFieldValue).toHaveBeenCalledTimes(0);

                instance.emit('gps', 'speed jean-michel');
                expect(Number(document.getElementsByClassName('gm-gps-speed')[0].value)).toBe(0);
                instance.emit('gps', 'speed -22666');
                expect(Number(document.getElementsByClassName('gm-gps-speed')[0].value)).toBe(0);
                instance.emit('gps', 'speed 300000000');
                expect(Number(document.getElementsByClassName('gm-gps-speed')[0].value)).toBe(399.99);
                expect(setFieldValue).toHaveBeenCalledTimes(3);

                instance.emit('gps', 'speed 42');
                expect(Number(document.getElementsByClassName('gm-gps-speed')[0].value)).toBe(42);
                instance.emit('gps', 'speed 69'); // Nice
                expect(Number(document.getElementsByClassName('gm-gps-speed')[0].value)).toBe(69);
                expect(setFieldValue).toHaveBeenCalledTimes(5);
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
            document.getElementsByClassName('gm-gps-altitude')[0].value = 'jean-michel';
            document.getElementsByClassName('gm-gps-latitude')[0].value = 'jean-michel';
            document.getElementsByClassName('gm-gps-longitude')[0].value = 'jean-michel';
            document.getElementsByClassName('gm-gps-accuracy')[0].value = 'jean-michel';
            document.getElementsByClassName('gm-gps-bearing')[0].value = 'jean-michel';
            document.getElementsByClassName('gm-gps-speed')[0].value = 'jean-michel';
            document.getElementsByClassName('gm-gps-submit')[0].click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'gps', messages: [
                    'set altitude 0',
                    'set longitude 0',
                    'set latitude 0',
                    'set accuracy 0',
                    'set bearing 0',
                    'set speed 0',
                    'enable'
                ],
            });
        });

        test('min value', () => {
            document.getElementsByClassName('gm-gps-altitude')[0].value = '-22666';
            document.getElementsByClassName('gm-gps-latitude')[0].value = '-420';
            document.getElementsByClassName('gm-gps-longitude')[0].value = '-666';
            document.getElementsByClassName('gm-gps-accuracy')[0].value = '-69';
            document.getElementsByClassName('gm-gps-bearing')[0].value = '-42';
            document.getElementsByClassName('gm-gps-speed')[0].value = '-42';
            document.getElementsByClassName('gm-gps-submit')[0].click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'gps', messages: [
                    'set altitude -10000',
                    'set longitude -180',
                    'set latitude -90',
                    'set accuracy 0',
                    'set bearing 0',
                    'set speed 0',
                    'enable'
                ],
            });
        });

        test('max value', () => {
            document.getElementsByClassName('gm-gps-altitude')[0].value = '22666';
            document.getElementsByClassName('gm-gps-latitude')[0].value = '420';
            document.getElementsByClassName('gm-gps-longitude')[0].value = '666';
            document.getElementsByClassName('gm-gps-accuracy')[0].value = '6969';
            document.getElementsByClassName('gm-gps-bearing')[0].value = '4242';
            document.getElementsByClassName('gm-gps-speed')[0].value = '300000000';
            document.getElementsByClassName('gm-gps-submit')[0].click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'gps', messages: [
                    'set altitude 10000',
                    'set longitude 180',
                    'set latitude 90',
                    'set accuracy 200',
                    'set bearing 360',
                    'set speed 399.99',
                    'enable'
                ],
            });
        });

        test('nominal value', () => {
            document.getElementsByClassName('gm-gps-altitude')[0].value = '420';
            document.getElementsByClassName('gm-gps-latitude')[0].value = '69'; // Nice
            document.getElementsByClassName('gm-gps-longitude')[0].value = '3.14';
            document.getElementsByClassName('gm-gps-accuracy')[0].value = '42';
            document.getElementsByClassName('gm-gps-bearing')[0].value = '13';
            document.getElementsByClassName('gm-gps-speed')[0].value = '399';
            document.getElementsByClassName('gm-gps-submit')[0].click();

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'gps', messages: [
                    'set altitude 420',
                    'set longitude 3.14',
                    'set latitude 69',
                    'set accuracy 42',
                    'set bearing 13',
                    'set speed 399',
                    'enable'
                ],
            });
        });
    });
});
