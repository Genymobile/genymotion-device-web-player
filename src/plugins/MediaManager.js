'use strict';

const log = require('loglevel');
log.setDefaultLevel('debug');

module.exports = class MediaManager {
    /**
     * Constructor to this MediaManager class
     * @param {DeviceRenderer} instance root instance
     * @param {boolean} videoWithMicrophone flag indicating wether the video must always be played with the microphone. Defaults to the microphone flag in the instance options
     * @param {number} videoWidth Maximum video width. Defaults to 1280
     * @param {number} videoHeight Maximum video height. Defaults to 720
     */
    constructor(instance, videoWithMicrophone = instance.options.microphone, videoWidth = 1280, videoHeight = 720) {
        this.instance = instance;
        this.instance.mediaManager = this;

        if (!navigator.mediaDevices || !this.setupPermissions()) {
            log.error('MediaDevices API unsupported: camera and microphone won\'t be available.');
            this.instance.mediaEventsEnabled = false;
            return;
        }
        this.instance.mediaEventsEnabled = true;

        this.videoStreaming = false;
        this.audioStreaming = false;

        this.videoWidth = videoWidth;
        this.videoHeight = videoHeight;
        this.videoWithMicrophone = videoWithMicrophone;
    }

    /**
     * Tries to get the current microphone and camera permission status. If it can, binds listeners to their change
     * @returns {boolean} True if it could find the permissions object
     */
    async setupPermissions() {
        if (!navigator.permissions) {
            return false;
        }

        if (this.instance.options.microphone) {
            try {
                const permissionObj = await navigator.permissions.query({name: 'microphone'});
                log.debug(`microphone ${permissionObj.state}`);
                permissionObj.addEventListener('change', this.onMicrophonePermissionChange.bind(this));
            } catch (error) {
                log.warn('Can\'t get microphone permission object', error);
                return false;
            }
        }

        try {
            const permissionObj = await navigator.permissions.query({name: 'camera'});
            log.debug(`camera ${permissionObj.state}`);
            permissionObj.addEventListener('change', this.onCameraPermissionChange.bind(this));
        } catch (error) {
            log.warn('Can\'t get camera permission object', error);
            return false;
        }

        return true;
    }

    /**
     * Toggle local video forwarding.
     * Redirect the client webcam video stream to the instance.
     */
    toggleVideoStreaming() {
        if (!this.videoStreaming) {
            this.startVideoStreaming();
        } else {
            this.stopVideoStreaming();
        }
    }

    /**
     * Toggle local audio forwarding.
     * Redirect the client microphone audio stream to the instance.
     */
    toggleAudioStreaming() {
        if (!this.audioStreaming) {
            this.startAudioStreaming();
        } else {
            this.stopAudioStreaming();
        }
    }

    /**
     * Initialize and start client webcam video stream.
     */
    async startVideoStreaming() {
        if (!navigator.mediaDevices) {
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: this.videoWithMicrophone,
                video: {
                    width: this.videoWidth,
                    height: this.videoHeight,
                },
            });
            log.debug('Client video stream ready');
            this.videoStreaming = true;
            this.localVideoStream = mediaStream;
            this.addVideoStream(mediaStream);
        } catch (error) {
            this.onVideoStreamError(error);
        }
    }

    /**
     * Initialize and start client microphone audio stream.
     */
    async startAudioStreaming() {
        if (!navigator.mediaDevices) {
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            log.debug('Client audio stream ready');
            this.audioStreaming = true;
            this.localAudioStream = mediaStream;
            this.addAudioStream(mediaStream);
        } catch (error) {
            this.onAudioStreamError(error);
        }
    }

    /**
     * Client video stream error handler.
     *
     * @param {Error} error Camera stream error.
     */
    onVideoStreamError(error) {
        log.error('Can\'t start client video stream', error);
    }

    /**
     * Client audio stream error handler.
     *
     * @param {Error} error Microphone stream error.
     */
    onAudioStreamError(error) {
        log.error('Can\'t start client audio stream', error);
    }

    /**
     * Stop client webcam video stream.
     */
    stopVideoStreaming() {
        log.debug('removed local video stream');
        this.removeVideoStream(this.localVideoStream);
        this.localVideoStream = null;
        this.videoStreaming = false;
    }

    /**
     * Stop client microphone audio stream.
     */
    stopAudioStreaming() {
        log.debug('removed local audio stream');
        this.removeAudioStream(this.localAudioStream);
        this.localAudioStream = null;
        this.audioStreaming = false;
    }

    /**
     * Listener to the camera permission change. Reemits a custom event dispatched on the window
     */
    onCameraPermissionChange() {
        window.dispatchEvent(new CustomEvent('gm-cameraPermissionChange'));
    }

    /**
     * Listener to the microphone permission change. Reemits a custom event dispatched on the window
     */
    onMicrophonePermissionChange() {
        window.dispatchEvent(new CustomEvent('gm-microphopnePermissionChange'));
    }

    /**
     * Find RTCRtpSender corresponding RTCRtpTransceiver and set its direction.
     *
     * @param {RTCRtpSender} sender    Peer (sender).
     * @param {string}       direction Transceiver direction.
     */
    setTransceiverDirection(sender, direction) {
        // find transceiver that contains sender
        this.instance.peerConnection.getTransceivers().forEach((transceiver) => {
            if (transceiver.sender === sender) {
                transceiver.direction = direction;
            }
        });
    }

    /**
     * Add a local audio stream and send it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream
     *
     * @param {MediaStream} stream Audio stream to add.
     */
    addAudioStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not add audio stream: connection is not ready');
            return;
        }
        /**
         * If microphoneSender is defined, this means that we already added
         * it to the PeerConnection. Since removeTrack() just remove the track
         * from it, re-add it and switch back the RTCRtpTranceiver direction
         * to send and recv.
         */

        if (this.instance.options.microphone && stream.getAudioTracks().length > 0) {
            if (this.microphoneSender) {
                log.debug('Replacing audio track on sender');
                this.microphoneSender.replaceTrack(stream.getAudioTracks()[0]);
                this.setTransceiverDirection(this.microphoneSender, 'sendrecv');
            } else {
                this.microphoneSender = this.instance.peerConnection.addTrack(stream.getAudioTracks()[0],
                    stream);
            }
        }
        this.instance.renegotiateWebRTCConnection();
    }

    /**
     * Add a local video stream and send it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream
     *
     * @param {MediaStream} stream Video stream to add.
     */
    addVideoStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not add video stream: connection is not ready');
            return;
        }
        /**
         * If cameraSender is defined, this means that we already added
         * it to the PeerConnection. Since removeTrack() just remove the track
         * from it, re-add it and switch back the RTCRtpTranceiver direction
         * to send and recv.
         */
        if (stream.getVideoTracks().length > 0) {
            if (this.cameraSender) {
                log.debug('Replacing video track on sender');
                this.cameraSender.replaceTrack(stream.getVideoTracks()[0]);
                this.setTransceiverDirection(this.cameraSender, 'sendrecv');
            } else {
                this.cameraSender = this.instance.peerConnection.addTrack(stream.getVideoTracks()[0],
                    stream);
            }
        }

        if (this.videoWithMicrophone && stream.getAudioTracks().length > 0) {
            if (this.microphoneSender) {
                log.debug('Replacing audio track on sender');
                this.microphoneSender.replaceTrack(stream.getAudioTracks()[0]);
                this.setTransceiverDirection(this.microphoneSender, 'sendrecv');
            } else {
                this.microphoneSender = this.instance.peerConnection.addTrack(stream.getAudioTracks()[0],
                    stream);
            }
        }
        this.instance.renegotiateWebRTCConnection();
    }

    /**
     * Remove a local audio stream and stop sending it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeStream
     *
     * @param {MediaStream} stream Audio stream to stop and remove.
     */
    removeAudioStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not remove audio stream: connection is not ready');
            return;
        }
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
            if (this.microphoneSender) {
                this.instance.peerConnection.removeTrack(this.microphoneSender);
            }
            this.instance.renegotiateWebRTCConnection();
        }
    }

    /**
     * Remove a local video stream and stop sending it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeStream
     *
     * @param {MediaStream} stream Video stream to stop and remove.
     */
    removeVideoStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not remove video stream: connection is not ready');
            return;
        }
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
            if (this.cameraSender) {
                this.instance.peerConnection.removeTrack(this.cameraSender);
            }
            if (this.microphoneSender && this.videoWithMicrophone) {
                this.instance.peerConnection.removeTrack(this.microphoneSender);
            }
            this.instance.renegotiateWebRTCConnection();
        }
    }

    /**
     * Stop the audio & video streaming
     */
    disconnect() {
        if (this.audioStreaming) {
            this.stopAudioStreaming();
        }
        if (this.videoStreaming) {
            this.stopVideoStreaming();
        }
    }
};
