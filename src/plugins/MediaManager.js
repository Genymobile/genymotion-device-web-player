'use strict';

const log = require('loglevel');
log.setDefaultLevel('debug');

module.exports = class MediaManager {
    /**
     * Constructor to this MediaManager class
     * @param {DeviceRenderer} instance root instance
     * @param {boolean} videoWithMicrophone flag indicating wether the video must always be played with the microphone.
     *  This flag is used when we don't want to split audio&video and instead want the audio bundled with the video in the same stream.
     *  Defaults to the microphone flag in the instance options
     * @param {number} videoWidth Maximum video width. Defaults to 1280
     * @param {number} videoHeight Maximum video height. Defaults to 720
     */
    constructor(instance, videoWithMicrophone = instance.options.microphone, videoWidth = 1280, videoHeight = 720) {
        this.instance = instance;
        this.instance.mediaManager = this;

        if (!navigator.mediaDevices) {
            log.error('MediaDevices API unsupported: camera and microphone won\'t be available.');
            this.instance.mediaEventsEnabled = false;
            return;
        }
        this.setupPermissions();
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
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async toggleVideoStreaming() {
        if (!this.videoStreaming) {
            return this.startVideoStreaming();
        }
        return this.stopVideoStreaming();
    }

    /**
     * Toggle local audio forwarding.
     * Redirect the client microphone audio stream to the instance.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async toggleAudioStreaming() {
        if (!this.audioStreaming) {
            return this.startAudioStreaming();
        }
        return this.stopAudioStreaming();
    }

    /**
     * Initialize and start client webcam video stream.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async startVideoStreaming() {
        if (!navigator.mediaDevices) {
            return false;
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
            return this.addVideoStream(mediaStream);
        } catch (error) {
            this.onVideoStreamError(error);
            return false;
        }
    }

    /**
     * Initialize and start client microphone audio stream.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async startAudioStreaming() {
        if (!navigator.mediaDevices) {
            return false;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            log.debug('Client audio stream ready');
            this.audioStreaming = true;
            this.localAudioStream = mediaStream;
            return await this.addAudioStream(mediaStream);
        } catch (error) {
            this.onAudioStreamError(error);
            return false;
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
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async stopVideoStreaming() {
        if (!this.videoStreaming) {
            return false;
        }
        log.debug('removed local video stream');
        const result = await this.removeVideoStream(this.localVideoStream);
        this.localVideoStream = null;
        this.videoStreaming = false;
        return result;
    }

    /**
     * Stop client microphone audio stream.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async stopAudioStreaming() {
        if (!this.audioStreaming) {
            return false;
        }
        log.debug('removed local audio stream');
        const result = await this.removeAudioStream(this.localAudioStream);
        this.localAudioStream = null;
        this.audioStreaming = false;
        return result;
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
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async addAudioStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not add audio stream: connection is not ready');
            return false;
        }
        /**
         * If microphoneSender is defined, this means that we already added
         * it to the PeerConnection. Since removeTrack() just remove the track
         * from it, re-add it and switch back the RTCRtpTranceiver direction
         * to send and recv.
         */

        try {
            if (this.instance.options.microphone && stream.getAudioTracks().length > 0) {
                if (this.microphoneSender) {
                    log.debug('Replacing audio track on sender');
                    await this.microphoneSender.replaceTrack(stream.getAudioTracks()[0]);
                    this.setTransceiverDirection(this.microphoneSender, 'sendrecv');
                } else {
                    this.microphoneSender = this.instance.peerConnection.addTrack(stream.getAudioTracks()[0],
                        stream);
                }
            }
        } catch (error) {
            log.error(error);
            return false;
        }
        return this.instance.renegotiateWebRTCConnection();
    }

    /**
     * Add a local video stream and send it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream
     *
     * @param {MediaStream} stream Video stream to add.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async addVideoStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not add video stream: connection is not ready');
            return false;
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

        // if the flag for bundled audio&video stream is set, let's add the audio track of this stream too
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
        return this.instance.renegotiateWebRTCConnection();
    }

    /**
     * Remove a local audio stream and stop sending it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeStream
     *
     * @param {MediaStream} stream Audio stream to stop and remove.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async removeAudioStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not remove audio stream: connection is not ready');
            return false;
        }
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
            if (this.microphoneSender) {
                this.instance.peerConnection.removeTrack(this.microphoneSender);
            }
            return this.instance.renegotiateWebRTCConnection();
        }
        return false;
    }

    /**
     * Remove a local video stream and stop sending it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeStream
     *
     * @param {MediaStream} stream Video stream to stop and remove.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async removeVideoStream(stream) {
        if (!this.instance.peerConnection) {
            log.error('Could not remove video stream: connection is not ready');
            return false;
        }
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
            if (this.cameraSender) {
                this.instance.peerConnection.removeTrack(this.cameraSender);
            }
            // if the if the flag for bundled audio&video stream is set, we'll remove the audio track too
            if (this.microphoneSender && this.videoWithMicrophone) {
                this.instance.peerConnection.removeTrack(this.microphoneSender);
            }
            return this.instance.renegotiateWebRTCConnection();
        }
        return false;
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
        this.cameraSender = null;
        this.microphoneSender = null;
    }
};
