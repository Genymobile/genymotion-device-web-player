import OverlayPlugin from './util/OverlayPlugin';
import fileUploader from './util/fileUploader';
import '@/components/GmDropdown.js';

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
        this.videoDevices = [];

        // Display widget
        this.registerToolbarButton();
        this.renderWidget();

        // Listen for permission changes
        this.onCameraPermissionChange = () => this.enumerateDevices();
        window.addEventListener('gm-cameraPermissionChange', this.onCameraPermissionChange);
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: this.instance.options.microphone ? 'gm-camera-mic-button' : 'gm-camera-button',
            title: this.i18n.CAMERA_TITLE ||'Media injection',
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
        const {container} = this.createTemplateModal({
            title: this.i18n.CAMERA_TITLE || 'Media injection',
            classes: 'gm-camera-plugin',
            width: 498,
            height: 610,
        });

        // Permission Section
        this.renderPermissionSection(container);

        // Front Camera Section
        this.renderCameraSection(container, 'Camera', 'front');

        const sep2 = document.createElement('div');
        sep2.className = 'gm-separator';
        container.appendChild(sep2);

        // Back Camera Section
        this.renderCameraSection(container, 'Back camera', 'back');

        // Initial device enumeration
        this.enumerateDevices();
    }

    renderPermissionSection(container) {
        const section = document.createElement('div');
        section.className = 'gm-camera-section gm-camera-permission';

        // Initial "Grant Access" View
        this.permissionRequestView = document.createElement('div');
        this.permissionRequestView.className = 'gm-permission-request-view';

        const requestText = document.createElement('div');
        requestText.className = 'gm-permission-text';
        requestText.innerHTML =
            this.i18n.CAMERA_GRANT_ACCESS_TEXT || 'Grant camera and microphone access to use media injection.';

        this.grantBtn = document.createElement('button');
        this.grantBtn.className = 'gm-btn'; // Reusing common button class
        this.grantBtn.innerHTML = this.i18n.CAMERA_GRANT_ACCESS_BTN || 'GRANT ACCESS';
        this.grantBtn.onclick = () => this.requestPermission();

        this.permissionRequestView.appendChild(requestText);
        this.permissionRequestView.appendChild(this.grantBtn);

        // "Access Denied" View
        this.permissionDeniedView = document.createElement('div');
        this.permissionDeniedView.className = 'gm-permission-denied-view hidden';
        this.permissionDeniedView.innerHTML =
            this.i18n.CAMERA_ACCESS_DENIED_TEXT ||
            '⚠️ Permissions are denied. To use your webcam or microphone, \
            please enable access in your browser settings.';

        // "No Device" View
        this.permissionNoDeviceView = document.createElement('div');
        this.permissionNoDeviceView.className = 'gm-permission-no-device-view hidden';
        this.permissionNoDeviceView.innerHTML =
            this.i18n.CAMERA_NO_DEVICE_TEXT || 'No camera found. Please connect a camera to use this feature.';

        // "Granted / Help" View
        this.permissionGrantedView = document.createElement('div');
        this.permissionGrantedView.className = 'gm-permission-granted-view hidden';
        this.permissionGrantedView.innerHTML =
            this.i18n.CAMERA_PERMISSION_GRANTED_TEXT ||
            'Select a device from the list below to use your camera, or use a custom video or image media.';

        section.appendChild(this.permissionRequestView);
        section.appendChild(this.permissionDeniedView);
        section.appendChild(this.permissionNoDeviceView);
        section.appendChild(this.permissionGrantedView);

        const sep1 = document.createElement('div');
        sep1.className = 'gm-separator';
        section.appendChild(sep1);

        container.appendChild(section);

        this.permissionSection = section;
    }

    renderCameraSection(container, title, type) {
        const section = document.createElement('div');
        section.className = 'gm-camera-section';

        const label = document.createElement('label');
        label.innerHTML = title;
        section.appendChild(label);

        const dropdown = document.createElement('gm-dropdown');
        dropdown.className = `gm-camera-dropdown-${type}`;
        dropdown.addEventListener('gm-dropdown-change', (e) => this.onDeviceSelected(type, e.detail.value));
        section.appendChild(dropdown);

        const previewContainer = document.createElement('div');
        previewContainer.className = 'gm-camera-preview';

        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.className = `gm-camera-video-${type} hidden`;
        previewContainer.appendChild(video);

        // Placeholder/Grant Access UI
        const placeholder = document.createElement('div');
        placeholder.className = 'gm-camera-placeholder';
        const placeholderIcon = document.createElement('div');
        placeholderIcon.className = 'gm-camera-placeholder-icon';
        placeholder.appendChild(placeholderIcon);
        previewContainer.appendChild(placeholder);

        // File Uploader
        const uploaderInstance = fileUploader.createFileUploader({
            dragDropText: 'DRAG & DROP YOUR FILE',
            browseButtonText: 'BROWSE',
            accept: 'video/*,image/*',
            i18n: this.i18n,
            mode: 'select',
            onFileSelect: (file) => this.onFileSelected(file, type),
            invalidFileTypeMessage: this.i18n.CAMERA_INVALID_FILE_TYPE ||
                'Unsupported file format.\nPlease upload a valid image or video file.',
        });
        const uploaderElement = uploaderInstance.element;
        uploaderElement.classList.add('hidden');
        previewContainer.appendChild(uploaderElement);

        // Loader (Hidden by default)
        const loaderContainer = document.createElement('div');
        loaderContainer.className = 'hidden gm-loader-container';

        const loader = document.createElement('div');
        loader.className = 'gm-loader';
        loaderContainer.appendChild(loader);

        const loaderText = document.createElement('div');
        loaderText.innerText = 'Loading video...';
        loaderText.className = 'gm-loader-text';
        loaderContainer.appendChild(loaderText);

        previewContainer.appendChild(loaderContainer);

        // File Info Overlay (Filename + Close Button)
        const fileInfo = document.createElement('div');
        fileInfo.className = 'gm-camera-file-info hidden';

        const fileName = document.createElement('span');
        fileName.className = 'gm-file-name';
        fileInfo.appendChild(fileName);

        const closeBtn = document.createElement('i');
        closeBtn.className = 'gm-cancel-update-icon';
        closeBtn.onclick = () => this.stopFileStream(type);
        fileInfo.appendChild(closeBtn);

        section.appendChild(previewContainer);
        previewContainer.appendChild(fileInfo);
        container.appendChild(section);

        // Store references
        if (type === 'front') {
            this.frontDropdown = dropdown;
            this.frontVideo = video;
            this.frontPlaceholder = placeholder;
            this.frontUploader = uploaderElement;
            this.frontFileInfo = fileInfo;
            this.frontFileName = fileName;
            this.frontLoader = loaderContainer;
        } else {
            this.backDropdown = dropdown;
            this.backVideo = video;
            this.backPlaceholder = placeholder;
            this.backUploader = uploaderElement;
            this.backFileInfo = fileInfo;
            this.backFileName = fileName;
            this.backLoader = loaderContainer;
        }
    }

    async enumerateDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            log.warn('MediaDevices API not supported or insecure context.');
            this.updateDropdowns();
            return;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.videoDevices = devices.filter((d) => d.kind === 'videoinput');

            // Check permission state explicitly
            let permissionState = 'prompt';
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const status = await navigator.permissions.query({name: 'camera'});
                    permissionState = status.state;
                } catch (e) {
                    log.warn('Error querying permissions:', e);
                }
            }

            const hasLabels = this.videoDevices.some((d) => d.label);

            this.permissionSection.classList.remove('hidden');

            this.permissionRequestView.classList.add('hidden');
            this.permissionDeniedView.classList.add('hidden');
            this.permissionNoDeviceView.classList.add('hidden');
            this.permissionGrantedView.classList.add('hidden');

            if (permissionState === 'denied') {
                this.permissionDeniedView.classList.remove('hidden');
            } else if (hasLabels || permissionState === 'granted') {
                if (!hasLabels && permissionState === 'granted') {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: this.instance.options.microphone,
                        });
                        stream.getTracks().forEach((track) => {
                            track.stop();
                        });

                        const devicesWithLabels = await navigator.mediaDevices.enumerateDevices();
                        this.videoDevices = devicesWithLabels.filter((d) => d.kind === 'videoinput');
                    } catch (e) {
                        log.warn('Failed to refresh labels despite granted permission:', e);
                    }
                }

                this.permissionGrantedView.classList.remove('hidden');

                if (this.videoDevices.length === 0) {
                    this.permissionGrantedView.classList.add('hidden');
                    this.permissionNoDeviceView.classList.remove('hidden');
                }
            } else {
                this.permissionRequestView.classList.remove('hidden');
            }
        } catch (error) {
            log.error('Error enumerating devices:', error);
        } finally {
            this.updateDropdowns();
        }
    }

    async requestPermission() {
        try {
            await navigator.mediaDevices.getUserMedia({video: true, audio: this.instance.options.microphone});
            // If successful, re-enumerate to get labels
            await this.enumerateDevices();

            // Check if we actually found any video devices
            if (this.videoDevices.length === 0) {
                log.warn('Permission granted but no video devices found.');
                this.permissionRequestView.classList.add('hidden');
                this.permissionDeniedView.classList.add('hidden');
                this.permissionNoDeviceView.classList.remove('hidden');
                this.permissionSection.classList.remove('hidden');
            } else {
                // Auto-select the first camera if available
                const firstDevice = this.videoDevices[0];
                if (firstDevice && firstDevice.deviceId) {
                    this.selectedVideoDevice = firstDevice.deviceId;
                    this.frontDropdown.value = firstDevice.deviceId;
                    this.onDeviceSelected('front', firstDevice.deviceId);

                    if (this.backDropdown) {
                        this.backDropdown.value = firstDevice.deviceId;
                    }
                }
            }
        } catch (error) {
            this.permissionRequestView.classList.add('hidden');

            if (error.name === 'NotFoundError') {
                // Handle case where no device is found even if permission might be granted
                log.warn('No camera device found during permission request.');
                this.permissionNoDeviceView.classList.remove('hidden');
            } else {
                log.error('Permission request failed:', error);
                this.permissionDeniedView.classList.remove('hidden');
            }
        }
    }

    updateDropdowns() {
        const videoOptions = [];

        // 1. None
        videoOptions.push({value: 'none', valueToDisplay: 'No media'});

        // 2. Webcams (if any)
        this.videoDevices.forEach((d) => {
            if (d.label) {
                videoOptions.push({
                    value: d.deviceId,
                    valueToDisplay: d.label,
                });
            }
        });

        // 3. Custom media (always last)
        videoOptions.push({value: 'file', valueToDisplay: 'Custom media'});

        if (this.frontDropdown) {
            this.frontDropdown.items = videoOptions;
            if (!this.selectedVideoDevice) {
                this.frontDropdown.value = 'none';
                this.onDeviceSelected('front', 'none');
            } else {
                // Try to preserve selection if it still exists or default to none
                const exists = videoOptions.some((o) => o.value === this.selectedVideoDevice);
                if (!exists) {
                    this.frontDropdown.value = 'none';
                    this.onDeviceSelected('front', 'none');
                }
            }
        }

        if (this.backDropdown) {
            this.backDropdown.items = videoOptions;
            if (!this.selectedVideoDevice) {
                this.backDropdown.value = 'none';
                this.onDeviceSelected('back', 'none');
            }
        }
    }

    onFileSelected(file, type) {
        if (!file) {
            return;
        }

        /*
         * We can access 'type' directly passed from the closure in renderCameraSection
         * No need for event.target.files or pendingFileType anymore for this flow.
         */

        const fileNameElement = type === 'front' ? this.frontFileName : this.backFileName;
        if (fileNameElement) {
            fileNameElement.innerText = file.name;
        }

        const url = URL.createObjectURL(file);
        this.startFileStream(type, url, file);
    }

    /**
     * Starts streaming a custom media file (video or image) to the virtual device.
     * Handles media element creation, canvas drawing loop, and WebRTC stream setup.
     *
     * @param {string} type - 'front' or 'back' camera.
     * @param {string} url - Object URL of the selected file.
     * @param {File} file - The selected file object.
     */
    async startFileStream(type, url, file) {
        const loader = type === 'front' ? this.frontLoader : this.backLoader;
        const uploader = type === 'front' ? this.frontUploader : this.backUploader;
        const fileInfo = type === 'front' ? this.frontFileInfo : this.backFileInfo;

        // Generate a unique ID for this loading request to handle race conditions
        const requestId = Date.now();
        this[type + 'LoadingId'] = requestId;

        try {
            const isLargeFile = file && file.size > 10 * 1024 * 1024;
            if (isLargeFile) {
                loader.classList.remove('hidden');
                uploader.classList.add('hidden');
                fileInfo.classList.remove('hidden');
            }

            let mediaElement;
            let isImage = false;

            if (file && file.type.startsWith('image/')) {
                isImage = true;
                mediaElement = new Image();
                await new Promise((resolve, reject) => {
                    mediaElement.onload = resolve;
                    mediaElement.onerror = reject;
                    mediaElement.src = url;
                });
            } else {
                mediaElement = document.createElement('video');
                mediaElement.src = url;
                mediaElement.loop = true;
                mediaElement.muted = false;
                mediaElement.volume = 0;
                mediaElement.playsInline = true;
                mediaElement.crossOrigin = 'anonymous';

                mediaElement.style.position = 'absolute';
                mediaElement.style.opacity = '0';
                mediaElement.style.pointerEvents = 'none';
                mediaElement.style.zIndex = '-1';
                mediaElement.style.top = '0';
                mediaElement.style.left = '0';
                mediaElement.style.width = '1px';
                mediaElement.style.height = '1px';

                const previewContainer = type === 'front' ? this.frontVideo.parentNode : this.backVideo.parentNode;
                if (previewContainer) {
                    previewContainer.appendChild(mediaElement);
                }
            }

            if (type === 'front') {
                this.frontMediaElement = mediaElement;
            } else {
                this.backMediaElement = mediaElement;
            }

            if (!isImage) {
                // Wait for video metadata (dimensions) to be available
                await new Promise((resolve) => {
                    if (
                        mediaElement.readyState >= HTMLMediaElement.HAVE_METADATA &&
                        mediaElement.videoWidth &&
                        mediaElement.videoHeight
                    ) {
                        resolve();
                    } else {
                        mediaElement.addEventListener('loadedmetadata', () => resolve(), {once: true});
                    }
                });
            }

            const sourceWidth = isImage ? mediaElement.width : mediaElement.videoWidth;
            const sourceHeight = isImage ? mediaElement.height : mediaElement.videoHeight;

            // Fixed target resolution (16:9) to ensure stability and standard aspect ratio
            const targetWidth = 1280;
            const targetHeight = 720;

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            // Fill black background for letterboxing
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Calculate scaling to fit (contain) while preserving aspect ratio
            const ratio = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
            const drawWidth = Math.floor(sourceWidth * ratio);
            const drawHeight = Math.floor(sourceHeight * ratio);

            // Center the video in the canvas
            const startX = (targetWidth - drawWidth) / 2;
            const startY = (targetHeight - drawHeight) / 2;

            let audioTrack = null;
            /*
             * If the instance supports microphone and we are playing a video,
             * we extract the audio track from the video file to inject it as the "microphone" input.
             */
            if (this.instance.options.microphone && !isImage) {
                try {
                    if (!this.audioContext) {
                        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    if (this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                    }

                    const source = this.audioContext.createMediaElementSource(mediaElement);
                    const dest = this.audioContext.createMediaStreamDestination();

                    source.connect(dest);

                    const audioTracks = dest.stream.getAudioTracks();
                    log.debug(`[Camera] Audio tracks captured: ${audioTracks.length}`);
                    if (audioTracks.length > 0) {
                        audioTrack = audioTracks[0];
                        audioTrack.enabled = true;
                    }

                    this.audioNodes = this.audioNodes || [];
                    this.audioNodes.push({source, dest, type});
                } catch (e) {
                    log.error('[Camera] Web Audio API setup failed:', e);
                }
            }

            let finalStream;
            /*
             * The final stream is composed of:
             * 1. The video track from the canvas (captured at 30fps)
             * 2. The audio track extracted from the file (if available and enabled by options)
             */
            const canvasStream = canvas.captureStream(30);
            const videoTrack = canvasStream.getVideoTracks()[0];

            if (audioTrack) {
                finalStream = new MediaStream([videoTrack, audioTrack]);
            } else {
                finalStream = canvasStream;
            }

            if (!isImage) {
                try {
                    await mediaElement.play();
                } catch (e) {
                    log.error('[Camera] Video play failed:', e);
                }
            }

            /*
             *Verify if this request is still effective (i.e., not cancelled or superseded).
             * This safely handles race conditions where the user stops the stream or selects another file
             * while `await` operations (like metadata loading) were in progress.
             */
            if (this[type + 'LoadingId'] !== requestId) {
                log.warn('[Camera] File stream request cancelled or superseded.');
                /*
                 * Perform LOCAL cleanup only.
                 * We destroyed the locally created `mediaElement` because it won't be used.
                 * IMPORTANT: Do NOT call `stopFileStream` here, as it would incorrectly reset the global state
                 * of the *new* currently active request (if any).
                 */
                if (mediaElement) {
                    mediaElement.src = '';
                    if (mediaElement.parentNode) {
                        mediaElement.parentNode.removeChild(mediaElement);
                    }
                }
                return;
            }

            if (isImage) {
                // Optimization: Draw image once, no loop needed
                if (drawWidth && drawHeight) {
                    ctx.drawImage(mediaElement, startX, startY, drawWidth, drawHeight);
                }
            } else {
                // Optimization: Video draw loop, use requestVideoFrameCallback if available for efficient sync, otherwise fallback to throttled rAF
                this[type + 'UseVideoFrameCallback'] = 'requestVideoFrameCallback' in mediaElement;
                let lastTime = 0;

                // Target 30fps for the fallback throttle
                const throttleInterval = 1000 / 30;

                const drawLoop = (now) => {
                    // Stop if the stream has been cancelled (ID check)
                    if (!this[type + 'LoadingId']) {
                        return;
                    }

                    if (this[type + 'UseVideoFrameCallback']) {
                        if (drawWidth && drawHeight) {
                            ctx.drawImage(mediaElement, startX, startY, drawWidth, drawHeight);
                        }
                        this[type + 'AnimationId'] = mediaElement.requestVideoFrameCallback(drawLoop);
                    } else {
                        // Throttling logic for rAF
                        if (!lastTime || now - lastTime >= throttleInterval) {
                            lastTime = now;
                            if (drawWidth && drawHeight) {
                                ctx.drawImage(mediaElement, startX, startY, drawWidth, drawHeight);
                            }
                        }
                        this[type + 'AnimationId'] = requestAnimationFrame(drawLoop);
                    }
                };

                // Start the loop
                if (this[type + 'UseVideoFrameCallback']) {
                    this[type + 'AnimationId'] = mediaElement.requestVideoFrameCallback(drawLoop);
                } else {
                    this[type + 'AnimationId'] = requestAnimationFrame(drawLoop);
                }
            }

            // Hide loader
            loader.classList.add('hidden');

            if (type === 'front') {
                this.frontStream = finalStream;
                this.frontVideo.srcObject = finalStream;
                this.frontVideo.classList.remove('hidden');
                this.frontPlaceholder.classList.add('hidden');
                this.frontUploader.classList.add('hidden');
                this.frontFileInfo.classList.remove('hidden');
                await this.instance.mediaManager.startVideoStreaming(finalStream, 'front');
            } else if (type === 'back') {
                this.backStream = finalStream;
                this.backVideo.srcObject = finalStream;
                this.backVideo.classList.remove('hidden');
                this.backPlaceholder.classList.add('hidden');
                this.backUploader.classList.add('hidden');
                this.backFileInfo.classList.remove('hidden');
                await this.instance.mediaManager.startVideoStreaming(finalStream, 'back');
            }

            this.toolbarBtn.setIndicator('active');
        } catch (e) {
            log.error('Error playing media file:', e);
            loader.classList.add('hidden');
            uploader.classList.remove('hidden');
            fileInfo.classList.add('hidden');
        }
    }

    stopFileStream(type) {
        log.debug(`stopFileStream called for ${type}`);

        // Invalidate any pending loading request
        this[type + 'LoadingId'] = null;

        // Cancel any running animation
        if (this[type + 'AnimationId']) {
            if (this[type + 'UseVideoFrameCallback']) {
                const mediaElement = type === 'front' ? this.frontMediaElement : this.backMediaElement;
                if (mediaElement && typeof mediaElement.cancelVideoFrameCallback === 'function') {
                    mediaElement.cancelVideoFrameCallback(this[type + 'AnimationId']);
                }
            } else {
                cancelAnimationFrame(this[type + 'AnimationId']);
            }
            this[type + 'AnimationId'] = null;
            this[type + 'UseVideoFrameCallback'] = false;
        }

        const loader = type === 'front' ? this.frontLoader : this.backLoader;
        if (loader) {
            loader.classList.add('hidden');
        }

        if (this.audioNodes) {
            this.audioNodes = this.audioNodes.filter((node) => {
                if (node.type === type) {
                    try {
                        node.source.disconnect();
                    } catch (e) {
                        log.warn('Error disconnecting audio node:', e);
                    }
                    return false;
                }
                return true;
            });

            if (this.audioNodes.length === 0 && this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
        }

        const mediaElement = type === 'front' ? this.frontMediaElement : this.backMediaElement;
        if (mediaElement) {
            if (typeof mediaElement.pause === 'function') {
                mediaElement.pause();
            }

            mediaElement.removeAttribute('src');

            if (typeof mediaElement.load === 'function') {
                mediaElement.load();
            }

            if (mediaElement.parentNode) {
                mediaElement.parentNode.removeChild(mediaElement);
            }

            if (type === 'front') {
                this.frontMediaElement = null;
            } else {
                this.backMediaElement = null;
            }
        }

        if (type === 'front') {
            if (this.frontStream) {
                this.frontStream.getTracks().forEach((t) => {
                    t.stop();
                });
                this.frontStream = null;
            }
            this.frontVideo.classList.add('hidden');
            this.frontVideo.srcObject = null;
            this.frontFileInfo.classList.add('hidden');
            this.frontUploader.classList.remove('hidden');

            this.instance.mediaManager.stopVideoStreaming('front');
        } else if (type === 'back') {
            if (this.backStream) {
                this.backStream.getTracks().forEach((t) => {
                    t.stop();
                });
                this.backStream = null;
            }
            this.backVideo.classList.add('hidden');
            this.backVideo.srcObject = null;
            this.backFileInfo.classList.add('hidden');
            this.backUploader.classList.remove('hidden');

            this.instance.mediaManager.stopVideoStreaming('back');
        }

        if (!this.frontStream && !this.backStream) {
            this.toolbarBtn.setIndicator('');
        }
    }

    async onDeviceSelected(type, deviceId) {
        log.debug(`onDeviceSelected called: type=${type}, deviceId=${deviceId}`);

        // Stop existing stream for this type
        if (type === 'front' && this.frontStream) {
            this.frontStream.getTracks().forEach((t) => {
                t.stop();
            });
            this.frontStream = null;
        }
        if (type === 'back' && this.backStream) {
            this.backStream.getTracks().forEach((t) => {
                t.stop();
            });
            this.backStream = null;
        }

        // Reset UI states
        const video = type === 'front' ? this.frontVideo : this.backVideo;
        const placeholder = type === 'front' ? this.frontPlaceholder : this.backPlaceholder;
        const uploader = type === 'front' ? this.frontUploader : this.backUploader;
        const fileInfo = type === 'front' ? this.frontFileInfo : this.backFileInfo;

        video.classList.add('hidden');
        video.srcObject = null;
        placeholder.classList.add('hidden');
        uploader.classList.add('hidden');
        if (fileInfo) {
            fileInfo.classList.add('hidden');
        }

        if (deviceId === 'none') {
            placeholder.classList.remove('hidden');
            await this.instance.mediaManager.stopVideoStreaming(type);

            if (!this.frontStream && !this.backStream) {
                this.toolbarBtn.setIndicator('');
            }
            return;
        }

        if (deviceId === 'file') {
            uploader.classList.remove('hidden');
            await this.instance.mediaManager.stopVideoStreaming(type);

            if (!this.frontStream && !this.backStream) {
                this.toolbarBtn.setIndicator('');
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {deviceId: {exact: deviceId}},
                audio: this.instance.options.microphone,
            });

            if (type === 'front') {
                this.frontStream = stream;
            } else {
                this.backStream = stream;
            }
            video.srcObject = stream;
            video.classList.remove('hidden');

            await this.instance.mediaManager.startVideoStreaming(stream, type);
            this.toolbarBtn.setIndicator('active');
        } catch (error) {
            log.error(`Error starting ${type} video:`, error);
            placeholder.classList.remove('hidden');
        }
    }

    destroy() {
        window.removeEventListener('gm-cameraPermissionChange', this.onCameraPermissionChange);

        this.stopFileStream('front');
        this.stopFileStream('back');

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.audioNodes) {
            this.audioNodes = [];
        }
    }
}
