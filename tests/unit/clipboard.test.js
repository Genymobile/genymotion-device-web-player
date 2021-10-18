'use strict';

jest.mock('loglevel');

const Clipboard = require('../../src/plugins/Clipboard');
const Instance = require('../mocks/GenymotionInstance');

let clipboard;
let instance;
let plugin;

describe('Clipboard Plugin', () => {
    beforeEach(() => {
        instance = new Instance();
        clipboard = new Clipboard(instance, {});
        plugin = document.getElementsByClassName('gm-clipboard-plugin')[0];
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Clipboard).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            clipboard = new Clipboard(instance, {
                CLIPBOARD_TITLE: 'TEST CLIPBOARD PLUGIN TITLE',
                CLIPBOARD_COPIED: 'TEST CLIPBOARD COPIED TO CLIPBOARD'
            });
            plugin = document.getElementsByClassName('gm-clipboard-plugin')[0];
        });

        test('is initialized properly at construct', () => {
            // Widget
            expect(document.getElementsByClassName('gm-clipboard-plugin')).toHaveLength(1);
            // Toolbar button
            expect(document.getElementsByClassName('gm-clipboard-button')).toHaveLength(1);
        });

        test('has default values', () => {
            expect(clipboard.clipboardInput.value).toBe('');
        });

        test('has translations', () => {
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST CLIPBOARD PLUGIN TITLE'));
            expect(plugin.innerHTML).toEqual(expect.stringContaining('TEST CLIPBOARD COPIED TO CLIPBOARD'));
        });

        test('reflects internal clipboard state when displayed', () => {
            const button = document.getElementsByClassName('gm-clipboard-button')[0];

            clipboard.clipboard = 'test value';
            button.click();
            expect(clipboard.clipboardInput.value).toBe('test value');
        });
    });

    describe('incoming events', () => {
        test('CLIPBOARD', () => {
            instance.emit('CLIPBOARD', 'test value');
            expect(clipboard.clipboard).toBe('test value');
        });

        test('framework', () => {
            instance.emit('framework', 'clipboard too many arguments');
            expect(clipboard.clipboard).toBe('');

            instance.emit('framework', 'clipboard missingparam');
            expect(clipboard.clipboard).toBe('');

            instance.emit('framework', 'unrelevant channel');
            expect(clipboard.clipboard).toBe('');

            instance.emit('framework', 'clipboard from_android badvalue'); // Bad value
            expect(clipboard.clipboard).toBe('');

            instance.emit('framework', 'clipboard from_android dGVzdCB2YWx1ZQ==');
            expect(clipboard.clipboard).toBe('test value');
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

        test('clipboard value', () => {
            const button = document.getElementsByClassName('gm-clipboard-button')[0];

            clipboard.clipboard = 'test value';
            button.click(); // Open
            button.click(); // Close

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'framework', messages: [
                    'set_device_clipboard dGVzdCB2YWx1ZQ==',
                ],
            });
        });
    });
});
