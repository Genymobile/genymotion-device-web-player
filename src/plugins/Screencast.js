'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const log = require('loglevel');
log.setDefaultLevel('debug');

const MAX_SCREENCAST_LENGTH_IN_MINUTES = 3;
const CAPTURE_INTERVAL_MS = 50;

/**
 * Instance screencast plugin.
 * Provides screenshot and video capture.
 */
module.exports = class Screencast extends OverlayPlugin {
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
        this.instance.screencast = this;

        // Render components
        this.renderToolbarButton();
        this.renderWidget();

        // Screencast webrtc stuff
        this.recordedBlobs = [];
        this.mediaRecorder = null;
        this.isRecording = false;
        this.startTime = 0;
        this.displayInterval = null;
    }

    /**
     * MediaRecorder recorded data available callback.
     *
     * @param {Event} event Event.
     */
    handleDataAvailable(event) {
        if (event.data && event.data.size > 0) {
            this.recordedBlobs.push(event.data);
        }
    }

    /**
     * Get file extension for a given MIME type.
     *
     * @param  {string} mime MIME type.
     * @return {string}      File extention
     */
    getExtensionFromMimeType(mime) {
        const types = {
            'video/x-msvideo': '.avi',
            'video/mpeg': '.mpeg',
            'video/ogg': '.ogv',
            'video/webm': '.webm',
            'video/3gpp': '.3gp',
            'video/3gpp2': '.3g2',
            'video/mp4': '.mp4',
            'video/x-matroska': '.mkv',
            'video/x-flv': '.f4v',
        };

        let extension = types[mime.toLowerCase()];
        if (!extension) {
            log.warn('Unknown MIME type: ', mime);
            extension = '.webm';
        }
        return extension;
    }

    /**
     * Download recorded screencast.
     */
    downloadScreencast() {
        const blob = new Blob(this.recordedBlobs, {type: this.mediaRecorder.mimeType});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'device' + this.getExtensionFromMimeType(this.mediaRecorder.mimeType);
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        this.isRecording = false;
    }

    /**
     * Update UI based on MediaRecorder availability.
     */
    checkForMediarecorder() {
        if (typeof MediaRecorder === 'undefined') {
            this.screencast.classList.add('disabled');
            this.screencastBtn.title = this.i18n.SCREENCAST_NOMEDIARECORDER_TOOLTIP || 'Screencast not supported';
        }
    }

    /**
     * Display screencast timer indicator.
     */
    displayTimer() {
        if (this.timer.classList.contains('gm-timer-hidden')) {
            this.timer.classList.remove('gm-timer-hidden');
            this.displayInterval = setInterval(this.displayTimer.bind(this), 1000);
        }

        const endTime = new Date();

        // compute seconds
        let timeDiff = endTime - this.startTime;
        timeDiff /= 1000;
        const seconds = Math.round(timeDiff % 60);

        // compute minutes
        timeDiff = Math.floor(timeDiff / 60);
        const minutes = Math.round(timeDiff % 60);

        this.timer.innerHTML = ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2);

        // if the screencast is 3min long, we stop it
        if (minutes === MAX_SCREENCAST_LENGTH_IN_MINUTES) {
            this.stopRecording();
        }
    }

    /**
     * Hide screencast timer indicator.
     */
    hideTimer() {
        clearInterval(this.displayInterval);
        this.timer.classList.add('gm-timer-hidden');
        this.timer.innerHTML = '';
    }

    findBestMimeType() {
        const supportedMimeTypes = [];
        [
            'video/webm',
            'video/x-matroska',
            'video/mpeg',
            'video/ogg',
            'video/3gpp',
            'video/3gpp2',
            'video/mp4',
            'video/x-flv',
        ].forEach((mimeType) => {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                supportedMimeTypes.push(mimeType);
            }
        });

        return supportedMimeTypes[0];
    }

    /**
     * Start screencast recording.
     */
    startRecording() {
        try {
            this.mediaRecorder = new MediaRecorder(this.instance.stream, {
                mimeType: this.findBestMimeType(),
            });
        } catch (error) {
            log.error('Error while creating MediaRecorder: ' + error);
            this.hideTimer();
            this.toolbarBtnImage.classList.remove('gm-screencast-button-recording');
            return;
        }

        this.recordedBlobs = [];
        this.isRecording = true;
        this.startTime = new Date();
        this.displayTimer();
        this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
        this.mediaRecorder.start(CAPTURE_INTERVAL_MS);
        log.debug('MediaRecorder started', this.mediaRecorder);
    }

    /**
     * Stop screencast recording.
     */
    stopRecording() {
        this.mediaRecorder.stop();
        this.hideTimer();
        this.toolbarBtnImage.classList.remove('gm-screencast-button-recording');
        this.downloadScreencast();
        log.debug('MediaRecorder stopped', this.mediaRecorder);
    }

    /**
     * Add the button to the renderer toolbar.
     */
    renderToolbarButton() {
        const toolbars = this.instance.getChildByClass(this.instance.root, 'gm-toolbar');
        if (!toolbars) {
            return; // if we don't have toolbar, we can't spawn the widget
        }

        const toolbar = toolbars.children[0];
        this.toolbarBtn = document.createElement('li');
        this.toolbarBtnImage = document.createElement('div');
        this.toolbarBtnImage.className = 'gm-icon-button gm-screencast-button';
        this.toolbarBtnImage.title = this.i18n.SCREENCAST_TITLE || 'Screencast';
        this.timer = document.createElement('div');
        this.timer.className = 'gm-screencast-timer gm-timer-hidden';
        this.toolbarBtnImage.appendChild(this.timer);
        this.toolbarBtn.appendChild(this.toolbarBtnImage);
        this.toolbarBtn.onclick = this.toggleWidget.bind(this);
        toolbar.appendChild(this.toolbarBtn);
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        this.widget = document.createElement('div');
        this.form = document.createElement('form');

        // Generate title
        const title = document.createElement('div');
        title.className = 'gm-title';
        title.innerHTML = this.i18n.SCREENCAST_TITLE || 'Screencast';
        this.form.appendChild(title);

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        const screenshot = document.createElement('div');
        this.screenshotBtn = document.createElement('div');
        this.screenshotBtn.className = 'gm-action gm-screencast-screenshot';
        screenshot.onclick = this.onScreenshotClick.bind(this);
        screenshot.className = 'gm-horizontal gm-screenshot';

        const screenshotLabel = this.i18n.SCREENCAST_SCREENSHOT || 'Screenshot';
        screenshot.innerHTML = '<label>' + screenshotLabel + '</label>';

        screenshot.appendChild(this.screenshotBtn);
        inputs.appendChild(screenshot);

        this.screencast = document.createElement('div');
        this.screencastBtn = document.createElement('div');
        this.screencastBtn.className = 'gm-action gm-screencast-screencast';

        this.screencast.onclick = this.onScreencastClick.bind(this);
        this.screencast.className = 'gm-horizontal gm-screencast';

        const screencastLabel = this.i18n.SCREENCAST_SCREENCAST || 'Screencast';
        this.screencast.innerHTML = '<label>' + screencastLabel + '</label>';

        this.screencast.appendChild(this.screencastBtn);
        inputs.appendChild(this.screencast);

        this.form.appendChild(inputs);

        // Setup
        this.widget.className = 'gm-overlay gm-screencast-plugin gm-hidden';

        // Add close button
        const close = document.createElement('div');
        close.className = 'gm-close-btn';
        close.onclick = this.toggleWidget.bind(this);

        this.widget.appendChild(close);
        this.widget.appendChild(this.form);

        // Render into document
        this.overlays.push(this.widget);
        this.instance.root.appendChild(this.widget);
    }

    /**
     * Display or hide the widget.
     *
     * @param {boolean} keepIconActive Whether to keep plugin button active or not.
     */
    toggleWidget(keepIconActive) {
        this.checkForMediarecorder();

        // When we are recording, we don't open the widget
        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        // Notify other callers
        if (this.widget.classList.contains('gm-hidden')) {
            this.instance.emit('close-overlays');
            this.instance.emit('keyboard-disable');
        } else {
            this.instance.emit('keyboard-enable');
        }

        // Toggle display
        this.widget.classList.toggle('gm-hidden');
        this.toolbarBtnImage.classList.toggle('gm-active');

        if (keepIconActive === true) {
            this.toolbarBtnImage.classList.add('gm-screencast-button-recording');
        }
    }

    /**
     * Take a screenshot.
     *
     * @param {Event} event Event.
     */
    onScreenshotClick(event) {
        event.preventDefault();

        this.toggleWidget();

        // Setup
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const {video} = this.instance;

        // Set canvas size to render to
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Render into the canvas the current state of video
        if (ctx && video instanceof HTMLVideoElement) {
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, video.videoWidth, video.videoHeight);
        } else {
            return;
        }

        // configure download link
        const downloadLink = document.createElement('a');
        downloadLink.download = 'device-screenshot.png';
        document.body.appendChild(downloadLink);

        // Get canvas data / force download
        let data = canvas.toDataURL('image/png');
        if (data) {
            data = data.replace(/^data:image\/[^;]*/, 'data:application/octet-stream');
        }
        downloadLink.href = data;

        // Trigger download
        downloadLink.click();

        setTimeout(() => {
            document.body.removeChild(downloadLink);
        }, 100);
    }

    /**
     * Toggle screencast recording.
     */
    onScreencastClick() {
        if (!this.isRecording) {
            this.toggleWidget(true);
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }
};
