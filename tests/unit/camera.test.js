import {vi} from 'vitest';

vi.mock('loglevel');

import MediaManager from '../../src/plugins/MediaManager.js';
import Camera from '../../src/plugins/Camera.js';
import Instance from '../mocks/DeviceRenderer.js';

// eslint-disable-next-line no-unused-vars
let mediaManager;
let instance;
let cameraPlugin;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test');

describe('Camera Plugin', () => {
    describe('api', () => {
        test('exposes a high level constructor', () => {
            expect(typeof Camera).toBe('function');
        });
    });

    describe('UI', () => {
        beforeEach(() => {
            instance = new Instance();
            mediaManager = new MediaManager(instance); // needed for button initialisation

            // Mock MediaManager methods used by Camera (after instantiation to override)
            instance.mediaManager.startVideoStreaming = vi.fn();
            instance.mediaManager.stopVideoStreaming = vi.fn();
            instance.mediaManager.startAudioStreaming = vi.fn();
            instance.mediaManager.stopAudioStreaming = vi.fn();

            cameraPlugin = new Camera(instance, {
                CAMERA_TITLE: 'TEST CAMERA PLUGIN BUTTON TITLE',
            });
        });

        test('is initialized properly at construct', () => {
            // Toolbar button
            expect(document.getElementsByClassName('gm-camera-button')).toHaveLength(1);
        });

        test('has translations', () => {
            const tooltip = document.querySelector('.gm-tooltip');

            document.querySelector('.gm-camera-button').parentElement.dispatchEvent(new Event('mouseenter'));
            expect(tooltip.innerHTML).toEqual(expect.stringContaining('TEST CAMERA PLUGIN BUTTON TITLE'));
            document.querySelector('.gm-camera-button').parentElement.dispatchEvent(new Event('mouseleave'));
        });

        test('widget is rendered with correct elements', () => {
            // Check for dropdowns
            expect(document.getElementsByClassName('gm-camera-dropdown-front')).toHaveLength(1);

            // Check for placeholder
            const placeholders = document.getElementsByClassName('gm-camera-placeholder');
            expect(placeholders.length).toBeGreaterThan(0);

            // Check for placeholder icon
            const placeholderIcons = document.getElementsByClassName('gm-camera-placeholder-icon');
            expect(placeholderIcons.length).toBeGreaterThan(0);
        });

        test('updateDropdowns includes None and Custom Media, excludes Dummy', () => {
            // Mock videoDevices
            cameraPlugin.videoDevices = [];
            cameraPlugin.updateDropdowns();

            const frontDropdown = cameraPlugin.frontDropdown;
            expect(frontDropdown).toBeDefined();

            const options = frontDropdown.items;
            expect(options).toBeDefined();

            // Should have None
            expect(options.some((o) => o.value === 'none')).toBe(true);
            // Should have Custom Media
            expect(options.some((o) => o.value === 'file')).toBe(true);
            // Should NOT have Dummy
            expect(options.some((o) => o.value === 'dummy')).toBe(false);
        });

        test('onDeviceSelected "none" shows placeholder and stops streaming', async () => {
            // Setup spies
            const stopStreamingSpy = instance.mediaManager.stopVideoStreaming;

            // Setup UI state (hide placeholder initially to test it appears)
            cameraPlugin.frontPlaceholder.classList.add('hidden');

            await cameraPlugin.onDeviceSelected('front', 'none');

            expect(cameraPlugin.frontPlaceholder.classList.contains('hidden')).toBe(false);
            expect(cameraPlugin.frontVideo.classList.contains('hidden')).toBe(true);
            expect(stopStreamingSpy).toHaveBeenCalledWith('front');
        });

        test('onDeviceSelected "file" shows uploader and stops streaming', async () => {
            // Setup spies
            const stopStreamingSpy = instance.mediaManager.stopVideoStreaming;

            await cameraPlugin.onDeviceSelected('front', 'file');

            expect(cameraPlugin.frontUploader.classList.contains('hidden')).toBe(false);
            expect(stopStreamingSpy).toHaveBeenCalledWith('front');
        });
    });
});
