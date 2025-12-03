
import OverlayPlugin from './util/OverlayPlugin';

import log from 'loglevel';
log.setDefaultLevel('debug');

/**
 * Instance camera plugin.
 * Provides client webcam and camera control.
 */
export default class Camera extends OverlayPlugin {
    static get name() {
        return 'Camera';
    }
    /**
     * Plugin initialization.
     *
     * @param {Object} instance Associated instance.
     * @param {Object} i18n     Translations keys for the UI.
     */
    constructor(instance, i18n) {
        super(instance);

        // Reference instance
        this.instance = instance;
        this.i18n = i18n || {};

        // Register plugin
        this.instance.camera = this;

        // State
        this.selectedVideoDevice = null;
        this.selectedAudioDevice = null;
        this.videoDevices = [];
        this.audioDevices = [];

        // Display widget
        this.registerToolbarButton();
        this.renderWidget();
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: this.instance.options.microphone ? 'gm-camera-mic-button' : 'gm-camera-button',
            title: this.instance.options.microphone
                ? this.i18n.CAMERA_MIC_TITLE || 'Camera and microphone injection'
                : this.i18n.CAMERA_TITLE || 'Camera injection',
            onClick: () => this.toggleWidget(),
        });
    }

    enable() {
        const videoCapabilities = RTCRtpSender.getCapabilities('video');
        if (videoCapabilities.codecs.some((codec) => codec.mimeType === 'video/H264')) {
            super.enable();
        } else {
            this.toolbarBtn.disable();
        }
    }

    /**
     * Render the widget modal.
     */
    renderWidget() {
        const { container } = this.createTemplateModal({
            title: this.i18n.CAMERA_TITLE || 'Camera',
            classes: 'gm-camera-plugin',
            width: 400, // Adjusted width for better layout
            height: 600, // Adjusted height for previews
        });

        // Front Camera Section
        this.renderCameraSection(container, 'Front camera', 'front');

        // Back Camera Section
        this.renderCameraSection(container, 'Back camera', 'back');

        // Microphone Section (if enabled)
        if (this.instance.options.microphone) {
            this.renderMicrophoneSection(container);
        }

        // Initial device enumeration
        this.enumerateDevices();
    }

    renderCameraSection(container, title, type) {
        const section = document.createElement('div');
        section.className = 'gm-camera-section';

        const label = document.createElement('label');
        label.innerHTML = title;
        section.appendChild(label);

        const dropdown = document.createElement('gm-dropdown');
        dropdown.className = `gm-camera-dropdown-${type}`;
        dropdown.addEventListener('gm-change', (e) => this.onDeviceSelected(type, e.detail.value));
        section.appendChild(dropdown);

        const previewContainer = document.createElement('div');
        previewContainer.className = 'gm-camera-preview';

        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true; // Mute local preview
        video.className = `gm-camera-video-${type}`;
        previewContainer.appendChild(video);

        // Placeholder/Grant Access UI (simplified for now)
        const placeholder = document.createElement('div');
        placeholder.className = 'gm-camera-placeholder';
        placeholder.innerHTML = 'Select a camera to preview';
        previewContainer.appendChild(placeholder);

        section.appendChild(previewContainer);
        container.appendChild(section);

        // Store references
        if (type === 'front') {
            this.frontDropdown = dropdown;
            this.frontVideo = video;
            this.frontPlaceholder = placeholder;
        } else {
            this.backDropdown = dropdown;
            this.backVideo = video;
            this.backPlaceholder = placeholder;
        }
    }

    renderMicrophoneSection(container) {
        const section = document.createElement('div');
        section.className = 'gm-camera-section';

        const label = document.createElement('label');
        label.innerHTML = this.i18n.MICROPHONE_TITLE || 'Microphone';
        section.appendChild(label);

        const dropdown = document.createElement('gm-dropdown');
        dropdown.className = 'gm-mic-dropdown';
        dropdown.addEventListener('gm-change', (e) => this.onAudioDeviceSelected(e.detail.value));
        section.appendChild(dropdown);

        container.appendChild(section);
        this.micDropdown = dropdown;
    }

    async enumerateDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            log.warn('MediaDevices API not supported or insecure context.');
            this.updateDropdowns();
            return;
        }

        try {
            // Request permission first to get labels
            await navigator.mediaDevices.getUserMedia({ video: true, audio: this.instance.options.microphone });

            const devices = await navigator.mediaDevices.enumerateDevices();
            this.videoDevices = devices.filter(d => d.kind === 'videoinput');
            this.audioDevices = devices.filter(d => d.kind === 'audioinput');

            this.updateDropdowns();
        } catch (error) {
            log.error('Error enumerating devices:', error);
            // Handle permission denied or other errors
        } finally {
            this.updateDropdowns();
        }
    }

    updateDropdowns() {
        const videoOptions = this.videoDevices.map(d => ({
            value: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`
        }));


        // Add "Dummy" option
        videoOptions.push({ value: 'dummy', label: 'Dummy webcam' });

        // Add "None" option
        videoOptions.unshift({ value: 'none', label: 'None' });

        if (this.frontDropdown) {
            this.frontDropdown.updateOptions(videoOptions);
            // Default to None if no selection or if we want to force start at None
            if (!this.selectedVideoDevice) {
                this.frontDropdown.value = 'none';
                this.onDeviceSelected('front', 'none');
            }
        }

        if (this.backDropdown) {
            this.backDropdown.updateOptions(videoOptions);
            if (!this.selectedVideoDevice) { // Should probably track back device separately or just default to none
                this.backDropdown.value = 'none';
                this.onDeviceSelected('back', 'none');
            }
        }

        if (this.micDropdown) {
            const audioOptions = this.audioDevices.map(d => ({
                value: d.deviceId,
                label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...`
            }));
            audioOptions.unshift({ value: '', label: 'Default' });
            this.micDropdown.updateOptions(audioOptions);
        }
    }

    async onDeviceSelected(type, deviceId) {
        // Handle Front Camera
        if (type === 'front') {
            this.selectedVideoDevice = deviceId;
            // Stop existing front stream if any
            if (this.frontStream) {
                this.frontStream.getTracks().forEach(t => t.stop());
                this.frontStream = null;
            }

            if (deviceId && deviceId !== 'none') {
                try {
                    let stream;
                    if (deviceId === 'dummy') {
                        stream = this.createDummyStream('Front Dummy');
                    } else {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { deviceId: { exact: deviceId } }
                        });
                    }

                    this.frontStream = stream;
                    this.frontVideo.srcObject = stream;
                    this.frontVideo.style.display = 'block';
                    this.frontPlaceholder.style.display = 'none';

                    // If back camera is also active, we might need to decide which one to inject.
                    // For now, let's assume the user selects one at a time or the last selected one takes precedence for injection.
                    // Or we can inject the one that was just selected.
                    log.debug('Injecting front camera stream to WebRTC');
                    await this.instance.mediaManager.startVideoStreaming(stream);
                } catch (error) {
                    log.error('Error starting front video:', error);
                    this.frontVideo.style.display = 'none';
                    this.frontPlaceholder.style.display = 'flex';
                }
            } else {
                this.frontVideo.style.display = 'none';
                this.frontPlaceholder.style.display = 'flex';
                // Only stop injection if back camera is also not active? 
                // For simplicity, if we select None for Front, we stop injection if Front was the active one.
                // But MediaManager doesn't track "source".
                // Let's just check if the other camera is active.
                if (!this.backStream) {
                    await this.instance.mediaManager.stopVideoStreaming();
                }
            }
        }

        // Handle Back Camera
        if (type === 'back') {
            // Stop existing back stream if any
            if (this.backStream) {
                this.backStream.getTracks().forEach(t => t.stop());
                this.backStream = null;
            }

            if (deviceId && deviceId !== 'none') {
                try {
                    let stream;
                    if (deviceId === 'dummy') {
                        stream = this.createDummyStream('Back Dummy');
                    } else {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { deviceId: { exact: deviceId } }
                        });
                    }

                    this.backStream = stream;
                    this.backVideo.srcObject = stream;
                    this.backVideo.style.display = 'block';
                    this.backPlaceholder.style.display = 'none';

                    log.debug('Injecting back camera stream to WebRTC');
                    await this.instance.mediaManager.startVideoStreaming(stream);
                } catch (error) {
                    log.error('Error starting back video:', error);
                    this.backVideo.style.display = 'none';
                    this.backPlaceholder.style.display = 'flex';
                }
            } else {
                this.backVideo.style.display = 'none';
                this.backPlaceholder.style.display = 'flex';
                if (!this.frontStream) {
                    await this.instance.mediaManager.stopVideoStreaming();
                }
            }
        }

        // Update indicator
        if (this.frontStream || this.backStream) {
            this.toolbarBtn.setIndicator('active');
        } else {
            this.toolbarBtn.setIndicator('');
        }
    }

    async onAudioDeviceSelected(deviceId) {
        this.selectedAudioDevice = deviceId;
        if (deviceId) {
            await this.instance.mediaManager.startAudioStreaming(deviceId);
            // We might need a separate indicator for Mic or share the same one
            if (this.instance.mediaManager.audioStreaming) {
                // If we had a separate mic button, we'd update it here.
                // For now, the main button indicator reflects "active injection"
            }
        } else {
            await this.instance.mediaManager.stopAudioStreaming();
        }
    }
    createDummyStream(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        const roundRect = (x, y, w, h, r) => {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        };

        const draw = () => {
            const time = Date.now() / 150; // Speed of animation

            // Background - Genymotion Gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#4a148c'); // Deep Purple
            gradient.addColorStop(1, '#880e4f'); // Pink
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Droid Position
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2 + 40;
            const bob = Math.sin(time * 2) * 10; // Bobbing effect

            ctx.save();
            ctx.translate(centerX, centerY + bob);

            // --- Legs ---
            const legWidth = 24;
            const legHeight = 60;
            const legSwing = 0.6;

            // Back Leg (Right)
            ctx.save();
            ctx.translate(15, 30);
            ctx.rotate(Math.sin(time * 2 + Math.PI) * legSwing);
            ctx.fillStyle = '#d81b60'; // Darker pink for back leg
            roundRect(-legWidth / 2, 0, legWidth, legHeight, 12);
            ctx.fill();
            ctx.restore();

            // Front Leg (Left)
            ctx.save();
            ctx.translate(-15, 30);
            ctx.rotate(Math.sin(time * 2) * legSwing);
            ctx.fillStyle = '#ff0050'; // Genymotion Pink
            roundRect(-legWidth / 2, 0, legWidth, legHeight, 12);
            ctx.fill();
            ctx.restore();

            // --- Body ---
            ctx.fillStyle = '#ff0050';
            roundRect(-40, -50, 80, 90, 20);
            ctx.fill();

            // Belt/Detail
            ctx.fillStyle = '#c2185b';
            ctx.fillRect(-40, -10, 80, 15);

            // --- Head ---
            ctx.save();
            ctx.translate(0, -55);
            // Helmet shape
            ctx.fillStyle = '#eceff1'; // Light Grey
            ctx.beginPath();
            ctx.arc(0, 0, 50, Math.PI, 0); // Top dome
            ctx.lineTo(50, 20);
            ctx.quadraticCurveTo(50, 40, 30, 40);
            ctx.lineTo(-30, 40);
            ctx.quadraticCurveTo(-50, 40, -50, 20);
            ctx.closePath();
            ctx.fill();

            // Visor Area
            ctx.fillStyle = '#ff0050';
            roundRect(-35, -10, 70, 40, 10);
            ctx.fill();

            // Eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(15, 10, 8, 0, Math.PI * 2);
            ctx.fill();

            // Antennas
            ctx.strokeStyle = '#ff0050';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-15, -48);
            ctx.lineTo(-25, -70);
            ctx.moveTo(15, -48);
            ctx.lineTo(25, -70);
            ctx.stroke();

            ctx.restore(); // End Head

            // --- Arms ---
            // Arm swing opposite to legs
            const armWidth = 20;
            const armHeight = 50;

            // Front Arm
            ctx.save();
            ctx.translate(-45, -20);
            ctx.rotate(Math.sin(time * 2 + Math.PI) * legSwing * 0.8);
            ctx.fillStyle = '#ff0050';
            roundRect(-armWidth / 2, 0, armWidth, armHeight, 10);
            ctx.fill();
            ctx.restore();

            ctx.restore(); // End Droid

            // Text overlay
            ctx.fillStyle = 'white';
            ctx.font = 'bold 40px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 2;
            ctx.fillText(text, canvas.width / 2, 60);
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            requestAnimationFrame(draw);
        };
        draw();

        return canvas.captureStream(30);
    }
};
