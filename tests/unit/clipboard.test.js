import {vi} from 'vitest';
import {TextEncoder, TextDecoder} from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

vi.mock('loglevel');

import Clipboard from '../../src/plugins/Clipboard.js';
import Instance from '../mocks/DeviceRenderer.js';

let clipboard;
let instance;
let plugin;

// Mock navigator.clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: vi.fn(),
        readText: vi.fn(),
    },
});

describe('Clipboard Plugin', () => {
    beforeEach(() => {
        // Mock instance video element
        const mockVideo = document.createElement('video');
        mockVideo.className = 'gm-video';
        document.body.appendChild(mockVideo);

        instance = new Instance();
        instance.video = mockVideo;
        instance.addListener = vi.fn().mockReturnValue(vi.fn());

        clipboard = new Clipboard(instance, {});
        plugin = document.getElementsByClassName('gm-clipboard-plugin')[0];
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Clipboard).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            instance.video = document.createElement('video');
            instance.addListener = vi.fn().mockReturnValue(vi.fn());
            clipboard = new Clipboard(instance, {
                CLIPBOARD_TITLE: 'TEST CLIPBOARD PLUGIN TITLE',
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
        });

        test('reflects internal clipboard state when displayed', () => {
            const button = document.getElementsByClassName('gm-clipboard-button')[0];

            clipboard.clipboard = 'test value';
            button.click();
            expect(clipboard.clipboardInput.value).toBe('test value');
        });
    });

    describe('incoming events', () => {
        test('framework', () => {
            instance.emit('framework', 'clipboard too many arguments');
            expect(clipboard.clipboard).toBe('');

            instance.emit('framework', 'clipboard missingparam');
            expect(clipboard.clipboard).toBe('');

            instance.emit('framework', 'unrelevant channel 3param');
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
            sendEventSpy = vi.spyOn(instance, 'sendEvent');
        });

        afterEach(() => {
            sendEventSpy.mockRestore();
        });

        test('clipboard send value', () => {
            expect(clipboard.clipboard).toBe('');

            clipboard.clipboardInput.value = 'test value';
            const event = new Event('input', {bubbles: true});
            clipboard.clipboardInput.dispatchEvent(event);

            expect(clipboard.clipboard).toBe('');

            clipboard.submitBtn.click();
            instance.emit('framework', 'clipboard from_android dGVzdCB2YWx1ZQ==');

            expect(sendEventSpy).toHaveBeenCalledTimes(1);
            expect(instance.outgoingMessages[0]).toEqual({
                channel: 'framework',
                messages: ['set_device_clipboard dGVzdCB2YWx1ZQ=='],
            });
            expect(clipboard.clipboard).toBe('test value');
        });
    });

    describe('auto clipboard', () => {
        test('activates auto clipboard listener on init', () => {
            expect(instance.addListener).toHaveBeenCalledWith(instance.video, 'keydown', expect.any(Function));
        });

        test('sends clipboard content on Ctrl+V', async () => {
            const sendEventSpy = vi.spyOn(instance, 'sendEvent');
            const readTextSpy = vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('copied text');

            // Get the keydown listener
            const keydownListener = instance.addListener.mock.calls.find(
                (call) => call[0] === instance.video && call[1] === 'keydown',
            )[2];

            // Trigger Ctrl+V
            const event = {ctrlKey: true, key: 'v'};
            await keydownListener(event);

            expect(readTextSpy).toHaveBeenCalled();
            expect(sendEventSpy).toHaveBeenCalledWith({
                channel: 'framework',
                messages: ['set_device_clipboard ' + window.btoa('copied text')],
            });
        });

        test('sends clipboard content on Meta+V (Mac)', async () => {
            const sendEventSpy = vi.spyOn(instance, 'sendEvent');
            const readTextSpy = vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('mac copied text');

            // Get the keydown listener
            const keydownListener = instance.addListener.mock.calls.find(
                (call) => call[0] === instance.video && call[1] === 'keydown',
            )[2];

            // Trigger Meta+V
            const event = {metaKey: true, key: 'v'};
            await keydownListener(event);

            expect(readTextSpy).toHaveBeenCalled();
            expect(sendEventSpy).toHaveBeenCalledWith({
                channel: 'framework',
                messages: ['set_device_clipboard ' + window.btoa('mac copied text')],
            });
        });

        test('does not send if clipboard is empty', async () => {
            const sendEventSpy = vi.spyOn(instance, 'sendEvent');
            vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('');

            const keydownListener = instance.addListener.mock.calls.find(
                (call) => call[0] === instance.video && call[1] === 'keydown',
            )[2];

            await keydownListener({ctrlKey: true, key: 'v'});

            expect(sendEventSpy).not.toHaveBeenCalled();
        });

        test('removes listener on destroy', () => {
            const removeListenerSpy = vi.fn();
            instance.addListener.mockReturnValue(removeListenerSpy);

            // Re-init to capture the spy
            clipboard = new Clipboard(instance, {});

            clipboard.destroy();
            expect(removeListenerSpy).toHaveBeenCalled();
        });
    });
});
