'use strict';

const OverlayPlugin = require('./util/OverlayPlugin');

const log = require('loglevel');
log.setDefaultLevel('debug');

const MAX_SCREENRECORD_LENGTH_IN_MINUTES = 3;
const CAPTURE_INTERVAL_MS = 50;

/**
 * Instance screenrecord plugin.
 * Provides screenshot and video capture.
 */
module.exports = class Screenrecord extends OverlayPlugin {
    static get name() {
        return 'Screenrecord';
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
        this.instance.screenrecord = this;

        // Render components
        this.registerToolbarButton();
        this.checkForMediarecorder();

        // Screenrecord webrtc stuff
        this.recordedBlobs = [];
        this.mediaRecorder = null;
        this.isRecording = false;
        this.startTime = 0;
        this.displayInterval = null;
        this.timerElement = null;
    }

    /**
     * Add the buttons to the renderer toolbar.
     */
    registerToolbarButton() {
        this.toolbarBtn = this.instance.toolbarManager.registerButton({
            id: this.constructor.name,
            iconClass: 'gm-screenrecord-button',
            title: this.i18n.SCREENRECORD_TITLE || 'Screenrecord',
            onClick: () => {
                this.onScreenrecordClick();
            },
        });
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
     * Download recorded screenrecord.
     */
    downloadScreenrecord() {
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
            this.toolbarBtn.disable();
        }
    }

    /**
     * Display screenrecord timer indicator.
     */
    displayTimer() {
        const endTime = new Date();

        // compute seconds
        let timeDiff = endTime - this.startTime;
        timeDiff /= 1000;
        const seconds = Math.round(timeDiff % 60);

        // compute minutes
        const minutes = Math.floor(timeDiff / 60);

        if (this.timerElement) {
            this.timerElement.textContent = ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2);
        }

        // if the screenrecord is 3min long, we stop it
        if (minutes === MAX_SCREENRECORD_LENGTH_IN_MINUTES) {
            this.stopRecording();
        }
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
     * Start screenrecord recording.
     */
    startRecording() {
        try {
            this.mediaRecorder = new MediaRecorder(this.instance.video.srcObject, {
                mimeType: this.findBestMimeType(),
            });
        } catch (error) {
            log.error('Error while creating MediaRecorder: ' + error);
            return;
        }

        this.toolbarBtn.setIndicator('notification');
        this.instance.root.classList.add('gm-screenrecord-recording');

        // Create timer element and adding it next to the button
        this.timerElement = document.createElement('div');
        this.timerElement.className = 'gm-screenrecord-timer';
        this.instance.toolbarManager
            .getButtonById(this.constructor.name)
            .buttonIcon.insertAdjacentElement('afterend', this.timerElement);

        this.recordedBlobs = [];
        this.isRecording = true;
        this.startTime = new Date();

        this.displayTimer();
        this.displayInterval = setInterval(this.displayTimer.bind(this), 1000);

        this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
        this.mediaRecorder.start(CAPTURE_INTERVAL_MS);
        log.debug('MediaRecorder started', this.mediaRecorder);
    }

    /**
     * Stop screenrecord recording.
     */
    stopRecording() {
        this.mediaRecorder.stop();
        this.toolbarBtn.setIndicator('');
        this.instance.root.classList.remove('gm-screenrecord-recording');
        clearInterval(this.displayInterval);
        if (this.timerElement) {
            this.timerElement.remove();
            this.timerElement = null;
        }
        this.downloadScreenrecord();
        log.debug('MediaRecorder stopped', this.mediaRecorder);
    }
    /**
     * Toggle screenrecord recording.
     */
    onScreenrecordClick() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }
};
