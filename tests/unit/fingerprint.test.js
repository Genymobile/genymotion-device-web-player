'use strict';

jest.mock('loglevel');

const FingerPrint = require('../../src/plugins/FingerPrint');
const Instance = require('../mocks/DeviceRenderer');

let instance;

describe('FingerPrint Plugin', () => {
    beforeEach(() => {
        instance = new Instance({
            giveFeedbackLink: 'https://github.com/orgs/Genymobile/discussions'
        });
        new FingerPrint(instance, {}, true);
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof FingerPrint).toBe('function');
        });
    });

    describe('UI', () => {
        test('has right default value', () => {
            // header
            expect(document.querySelector('.gm-fingerprint-dialog-auth-required').textContent)
                .toContain('Authentification required');
            expect(document.querySelector('.gm-fingerprint-dialog-auth-required-status')
                .getAttribute('data-text')).toBe('No');
            expect(document.querySelector('.gm-fingerprint-dialog-recognized-fp-by-default').textContent)
                .toContain('Recognized by default');

            const checkbox = document
                .querySelector('.gm-fingerprint-dialog-recognized-fp-by-default-status input[type="checkbox"]');
            const firstSpan = document
                .querySelector('.gm-fingerprint-dialog-recognized-fp-by-default-status span');

            expect(checkbox).toBeTruthy();
            expect(checkbox.checked).toBe(false);
            firstSpan.click();
            expect(checkbox.checked).toBe(true);

            // body
            document.querySelector('.gm-fingerprint-dialog-button').click();
            const buttons = Array.from(document.querySelectorAll('.gm-fingerprint-dialog-button'));
            expect(buttons.length).toBe(6);
            buttons.forEach((button) => {
                expect(button.classList.contains('disabled')).toBe(true);
            });

            // footer
            expect(document.querySelector('.gm-fingerprint-dialog-give-feedback > a').textContent)
                .toContain('Give feedback');
            expect(document.querySelector('.gm-fingerprint-dialog-give-feedback > a')
                .getAttribute('href')).toBe('https://github.com/orgs/Genymobile/discussions');
        });

        test('has buttons enable and working when fingerprint is required', () => {
            const buttons = Array.from(document.querySelectorAll('.gm-fingerprint-dialog-button'));
            buttons.forEach((button) => {
                expect(button.classList.contains('disabled')).toBe(true);
            });
            instance.emit('fingerprint', 'scan start');
            instance.emit('fingerprint', 'current_status scanning');
            buttons.forEach((button) => {
                expect(button.classList.contains('disabled')).toBe(false);
            });

            const sendEventSpy = jest.spyOn(instance, 'sendEvent');
            expect(sendEventSpy).toHaveBeenCalledTimes(0);
            buttons[0].click();
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'fingerprint', messages: [
                    'scan recognized',
                ],
            });
            sendEventSpy.mockRestore();

            instance.emit('fingerprint', 'scan success');

            expect(buttons[0].classList.contains('disabled')).toBe(true);
        });

        test('Auto validate fingerprint\'s request when auto validation is enabled', () => {
            const sendEventSpy = jest.spyOn(instance, 'sendEvent');
            expect(sendEventSpy).toHaveBeenCalledTimes(0);
            const autoValidation = document
                .querySelector('.gm-fingerprint-dialog-recognized-fp-by-default-status span');
            autoValidation.click();

            instance.emit('fingerprint', 'current_status scanning');
            instance.emit('fingerprint', 'scan start');

            const buttons = Array.from(document.querySelectorAll('.gm-fingerprint-dialog-button'));
            buttons.forEach((button) => {
                expect(button.classList.contains('disabled')).toBe(true);
            });
            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'fingerprint', messages: [
                    'set auto_recognize true',
                ],
            });
            sendEventSpy.mockRestore();
        });

        describe('toolbar icons', () => {
            test('has right icon when auto validation is disabled / enabled', () => {
                const autoValidation = document
                    .querySelector('.gm-fingerprint-dialog-recognized-fp-by-default-status span');
                expect(document.querySelector('.gm-fingerprint-button')
                    .classList.contains('fingerprint-autoValidation')).toBe(false);
                autoValidation.click();
                expect(document.querySelector('.gm-fingerprint-button')
                    .classList.contains('fingerprint-autoValidation')).toBe(true);
            });
            test('has right icon when fingerprint is required and auto validation disabled', () => {
                expect(document.querySelector('.gm-fingerprint-button')
                    .classList.contains('fingerprint-require')).toBe(false);
                instance.emit('fingerprint', 'scan start');
                instance.emit('fingerprint', 'current_status scanning');
                expect(document.querySelector('.gm-fingerprint-button')
                    .classList.contains('fingerprint-require')).toBe(true);
            });
        });
    });
});
