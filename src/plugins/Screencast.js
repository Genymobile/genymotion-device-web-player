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
    static get name() {
        return 'Screencast';
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
        this.instance.screencast = this;

        // Render components
        this.registerToolbarButton();
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
        this.timer.remove();
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
            this.mediaRecorder = new MediaRecorder(this.instance.video.srcObject, {
                mimeType: this.findBestMimeType(),
            });
        } catch (error) {
            log.error('Error while creating MediaRecorder: ' + error);
            this.hideTimer();
            this.toolbarBtn.removeClass('gm-screencast-button-recording');
            return;
        }

        this.recordedBlobs = [];
        this.isRecording = true;
        this.startTime = new Date();

        this.timer.style.display = '';
        this.displayInterval = setInterval(this.displayTimer.bind(this), 1000);

        this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
        this.mediaRecorder.start(CAPTURE_INTERVAL_MS);
        log.debug('MediaRecorder started', this.mediaRecorder);
    }

    /**
     * Stop screencast recording.
     */
    stopRecording() {
        this.timer.style.display = 'none';
        this.mediaRecorder.stop();
        this.hideTimer();
        this.toolbarBtn.removeClass('gm-screencast-button-recording');
        this.downloadScreencast();
        log.debug('MediaRecorder stopped', this.mediaRecorder);
    }

    /**
     * Add the button to the renderer toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-screencast-button',
            title: this.i18n.SCREENCAST_TITLE || 'Screencast',
            onClick: (event) => {
                if (event.target.parentElement.querySelector('.gm-screencast-timer') === null) {
                    this.timer = document.createElement('div');
                    this.timer.className = 'gm-screencast-timer';
                    this.timer.style.display = 'none';
                    event.target.parentElement.appendChild(this.timer);
                }
                this.toggleWidget();
            },
        });
    }

    /**
     * Render the widget.
     */
    renderWidget() {
        // Create elements
        const {modal, container} = this.createTemplateModal({
            title: this.i18n.SCREENCAST_TITLE || 'Screencast',
            classes: 'gm-screencast-plugin',
        });

        // TODO delete this line in the PR which will refacto this plugin, keep for css compatibility
        modal.classList.add('gm-overlay');

        this.form = document.createElement('form');

        // Generate input rows
        const inputs = document.createElement('div');
        inputs.className = 'gm-inputs';

        const screenshot = document.createElement('div');
        this.screenshotBtn = document.createElement('div');
        this.screenshotBtn.className = 'gm-action gm-screencast-screenshot';
        screenshot.onclick = this.onScreenshotClick.bind(this);
        screenshot.className = 'gm-screenshot';

        const screenshotLabel = this.i18n.SCREENCAST_SCREENSHOT || 'Screenshot';
        screenshot.innerHTML = '<label>' + screenshotLabel + '</label>';

        screenshot.appendChild(this.screenshotBtn);
        inputs.appendChild(screenshot);

        this.screencast = document.createElement('div');
        this.screencastBtn = document.createElement('div');
        this.screencastBtn.className = 'gm-action gm-screencast-screencast';

        this.screencast.onclick = this.onScreencastClick.bind(this);
        this.screencast.className = 'gm-screencast';

        const screencastLabel = this.i18n.SCREENCAST_SCREENCAST || 'Screencast';
        this.screencast.innerHTML = '<label>' + screencastLabel + '</label>';

        this.screencast.appendChild(this.screencastBtn);
        inputs.appendChild(this.screencast);

        this.form.appendChild(inputs);

        container.appendChild(this.form);
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

        super.toggleWidget();

        if (keepIconActive === true) {
            this.toolbarBtn.addClass('gm-screencast-button-recording');
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
