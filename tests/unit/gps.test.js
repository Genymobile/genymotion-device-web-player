import {vi} from 'vitest';

vi.mock('loglevel');

import GPS from '../../src/plugins/GPS.js';
import Instance from '../mocks/DeviceRenderer.js';

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
            ];
            inputsInvalidValues.forEach(([field, value]) => {
                test(`button disabled when ${field} is invalid`, () => {
                    const fieldInput = gps.inputComponents[field];
                    const submitButton = document.querySelector('.gm-gps-update');
                    fieldInput.value = value;
                    fieldInput.dispatchEvent(
                        new CustomEvent('gm-text-input-change', {detail: {value: value}, bubbles: true}),
                    );
                    if (field !== 'accuracy' && field !== 'bearing') {
                        expect(
                            fieldInput.querySelector('.text-input-message').classList.contains('hidden'),
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
                const setFieldValue = vi.spyOn(gps, 'setFieldValue');

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
            sendEventSpy = vi.spyOn(instance, 'sendEvent');
        });

        afterEach(() => {
            sendEventSpy.mockRestore();
        });

        /*
         *test('invalid input value', () => {
         *    gps.inputComponents.altitude.value = 'jean-michel';
         *    gps.inputComponents.altitude.dispatchEvent(new CustomEvent('gm-text-input-change', { detail: { value: 'jean-michel' }, bubbles: true }));
         *
         *    gps.inputComponents.latitude.value = 'jean-michel';
         *    gps.inputComponents.latitude.dispatchEvent(new CustomEvent('gm-text-input-change', { detail: { value: 'jean-michel' }, bubbles: true }));
         *
         *    gps.inputComponents.longitude.value = 'jean-michel';
         *    gps.inputComponents.longitude.dispatchEvent(new CustomEvent('gm-text-input-change', { detail: { value: 'jean-michel' }, bubbles: true }));
         *
         *    gps.inputComponents.accuracy.value = 'jean-michel';
         *    gps.inputComponents.accuracy.dispatchEvent(new CustomEvent('gm-text-input-change', { detail: { value: 'jean-michel' }, bubbles: true }));
         *
         *    gps.inputComponents.bearing.value = 'jean-michel';
         *    gps.inputComponents.bearing.dispatchEvent(new CustomEvent('gm-text-input-change', { detail: { value: 'jean-michel' }, bubbles: true }));
         *
         *    gps.inputComponents.speed.value = 'jean-michel';
         *    gps.inputComponents.speed.dispatchEvent(new CustomEvent('gm-text-input-change', { detail: { value: 'jean-michel' }, bubbles: true }));
         *    expect(document.querySelector('.gm-gps-update').disabled).toBeTruthy();
         *
         *    document.querySelector('.gm-gps-update').click();
         *
         *    expect(sendEventSpy).toHaveBeenCalledTimes(0);
         *});
         */

        test('min value', () => {
            gps.inputComponents.altitude.value = '-10000';
            gps.inputComponents.altitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '-10000'}, bubbles: true}),
            );

            gps.inputComponents.latitude.value = '-90';
            gps.inputComponents.latitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '-90'}, bubbles: true}),
            );

            gps.inputComponents.longitude.value = '-180';
            gps.inputComponents.longitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '-180'}, bubbles: true}),
            );

            gps.inputComponents.accuracy.value = '0';
            gps.inputComponents.accuracy.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '0'}, bubbles: true}),
            );

            gps.inputComponents.bearing.value = '0';
            gps.inputComponents.bearing.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '0'}, bubbles: true}),
            );

            gps.inputComponents.speed.value = '0';
            gps.inputComponents.speed.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '0'}, bubbles: true}),
            );
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
            gps.inputComponents.altitude.value = '10000';
            gps.inputComponents.altitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '10000'}, bubbles: true}),
            );

            gps.inputComponents.latitude.value = '90';
            gps.inputComponents.latitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '90'}, bubbles: true}),
            );

            gps.inputComponents.longitude.value = '180';
            gps.inputComponents.longitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '180'}, bubbles: true}),
            );

            gps.inputComponents.accuracy.value = '200';
            gps.inputComponents.accuracy.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '200'}, bubbles: true}),
            );

            gps.inputComponents.bearing.value = '360';
            gps.inputComponents.bearing.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '360'}, bubbles: true}),
            );

            gps.inputComponents.speed.value = '399.99';
            gps.inputComponents.speed.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '399.99'}, bubbles: true}),
            );
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
            gps.inputComponents.altitude.value = '420';
            gps.inputComponents.altitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '420'}, bubbles: true}),
            );

            gps.inputComponents.latitude.value = '69'; // Nice
            gps.inputComponents.latitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '69'}, bubbles: true}),
            );

            gps.inputComponents.longitude.value = '3.14';
            gps.inputComponents.longitude.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '3.14'}, bubbles: true}),
            );

            gps.inputComponents.accuracy.value = '42';
            gps.inputComponents.accuracy.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '42'}, bubbles: true}),
            );

            gps.inputComponents.bearing.value = '13';
            gps.inputComponents.bearing.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '13'}, bubbles: true}),
            );

            gps.inputComponents.speed.value = '399';
            gps.inputComponents.speed.dispatchEvent(
                new CustomEvent('gm-text-input-change', {detail: {value: '399'}, bubbles: true}),
            );
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
