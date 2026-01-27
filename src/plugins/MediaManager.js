import log from 'loglevel';
log.setDefaultLevel('debug');

export default class MediaManager {
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
            log.error("MediaDevices API unsupported: camera and microphone won't be available.");
            this.instance.mediaEventsEnabled = false;
            return;
        }
        this.setupPermissions();
        this.instance.mediaEventsEnabled = true;

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
                this.microphonePermissionObject = permissionObj;
                this.instance.addListener(permissionObj, 'change', this.onMicrophonePermissionChange.bind(this));
            } catch (error) {
                log.warn("Can't get microphone permission object", error);
                return false;
            }
        }

        try {
            const permissionObj = await navigator.permissions.query({name: 'camera'});
            log.debug(`camera ${permissionObj.state}`);
            this.cameraPermissionObject = permissionObj;
            this.instance.addListener(permissionObj, 'change', this.onCameraPermissionChange.bind(this));
        } catch (error) {
            log.warn("Can't get camera permission object", error);
            return false;
        }

        return true;
    }

    /**
     * Initialize and start client webcam video stream.
     * @param {MediaStream|null} customStream Optional custom media stream to use instead of getUserMedia
     * @param {string} type Type of camera ('front' or 'back')
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async startVideoStreaming(customStream = null, type = 'front') {
        if (!navigator.mediaDevices) {
            return false;
        }

        try {
            let mediaStream;
            if (customStream) {
                mediaStream = customStream;
            } else {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: this.videoWithMicrophone,
                    video: {
                        width: this.videoWidth,
                        height: this.videoHeight,
                    },
                });
            }
            log.debug(`Client ${type} video stream ready`);
            if (type === 'front') {
                this.localFrontVideoStream = mediaStream;
            } else {
                this.localBackVideoStream = mediaStream;
            }

            return this.addVideoStream(mediaStream, type);
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
                video: false,
            });
            log.debug('Client audio stream ready');
            this.localAudioStream = mediaStream;
            const addAudioStreamResult = await this.addAudioStream(mediaStream);
            return addAudioStreamResult;
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
        log.error("Can't start client video stream", error);
    }

    /**
     * Client audio stream error handler.
     *
     * @param {Error} error Microphone stream error.
     */
    onAudioStreamError(error) {
        log.error("Can't start client audio stream", error);
    }

    /**
     * Stop client webcam video stream.
     * @param {string} type Type of camera ('front' or 'back')
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async stopVideoStreaming(type = 'front') {
        let stream;
        if (type === 'front') {
            if (!this.localFrontVideoStream) {
                return false;
            }
            stream = this.localFrontVideoStream;
        } else {
            if (!this.localBackVideoStream) {
                return false;
            }
            stream = this.localBackVideoStream;
        }

        log.debug(`removed local ${type} video stream`);
        const result = await this.removeVideoStream(stream, type);

        if (type === 'front') {
            this.localFrontVideoStream = null;
        } else {
            this.localBackVideoStream = null;
        }
        return result;
    }

    /**
     * Stop client microphone audio stream.
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async stopAudioStreaming() {
        if (!this.localAudioStream) {
            return false;
        }
        log.debug('removed local audio stream');
        const result = await this.removeAudioStream(this.localAudioStream);
        this.localAudioStream = null;
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
                    this.microphoneSender = this.instance.peerConnection.addTrack(stream.getAudioTracks()[0], stream);
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
     * @param {string} type Type of camera ('front' or 'back')
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async addVideoStream(stream, type = 'front') {
        log.debug(`addVideoStream called for type: ${type}`);
        if (!this.instance.peerConnection) {
            log.error('Could not add video stream: connection is not ready');
            return false;
        }
        /**
         * If sender is defined, this means that we already added
         * it to the PeerConnection. Since removeTrack() just remove the track
         * from it, re-add it and switch back the RTCRtpTranceiver direction
         * to send and recv.
         */
        if (stream.getVideoTracks().length > 0) {
            const sender = type === 'front' ? this.frontCameraSender : this.backCameraSender;

            if (sender) {
                log.debug(`Replacing ${type} video track on sender`);
                await sender.replaceTrack(stream.getVideoTracks()[0]);
                sender.setStreams(stream);
                this.setTransceiverDirection(sender, 'sendrecv');

                // Limit bitrate to avoid congestion (1.5 Mbps)
                const parameters = sender.getParameters();
                if (!parameters.encodings) {
                    parameters.encodings = [{}];
                }
                parameters.encodings[0].maxBitrate = 1500000;
                await sender.setParameters(parameters).catch((e) => log.warn('Failed to set sender parameters', e));
            } else {
                // Try to find an existing video transceiver that is recvonly (reusable)
                const transceivers = this.instance.peerConnection.getTransceivers();
                const reusableTransceiver = transceivers.find(
                    (t) => t.receiver.track.kind === 'video' && t.direction === 'recvonly',
                );

                if (reusableTransceiver) {
                    log.debug(`Reusing existing video transceiver for ${type}`);
                    await reusableTransceiver.sender.replaceTrack(stream.getVideoTracks()[0]);
                    reusableTransceiver.direction = 'sendrecv';
                    reusableTransceiver.sender.setStreams(stream);

                    if (type === 'front') {
                        this.frontCameraSender = reusableTransceiver.sender;
                    } else {
                        this.backCameraSender = reusableTransceiver.sender;
                    }
                } else {
                    log.debug(`Adding new transceiver for ${type}`);
                    const transceiver = this.instance.peerConnection.addTransceiver(stream.getVideoTracks()[0], {
                        direction: 'sendrecv',
                        streams: [stream],
                    });

                    if (type === 'front') {
                        this.frontCameraSender = transceiver.sender;
                    } else {
                        this.backCameraSender = transceiver.sender;
                    }

                    const newSender = transceiver.sender;
                    const parameters = newSender.getParameters();
                    if (!parameters.encodings) {
                        parameters.encodings = [{}];
                    }
                    parameters.encodings[0].maxBitrate = 1500000;
                    await newSender.setParameters(parameters)
                        .catch((e) => log.warn('Failed to set new sender parameters', e));
                }
            }
        } else {
            log.warn(`Stream for ${type} has no video tracks`);
        }

        // If the video stream is supposed to be sent with the microphone, add it too
        if (this.videoWithMicrophone && stream.getAudioTracks().length > 0) {
            if (this.microphoneSender) {
                await this.microphoneSender.replaceTrack(stream.getAudioTracks()[0]);
                this.setTransceiverDirection(this.microphoneSender, 'sendrecv');
            } else {
                // Try to find an existing audio transceiver that is recvonly (reusable)
                const transceivers = this.instance.peerConnection.getTransceivers();
                const reusableTransceiver = transceivers.find(
                    (t) => t.receiver.track.kind === 'audio' && t.direction === 'recvonly',
                );

                if (reusableTransceiver) {
                    log.debug('Reusing existing audio transceiver');
                    await reusableTransceiver.sender.replaceTrack(stream.getAudioTracks()[0]);
                    reusableTransceiver.direction = 'sendrecv';
                    this.microphoneSender = reusableTransceiver.sender;
                } else {
                    log.debug('Adding new audio track');
                    const sender = this.instance.peerConnection.addTrack(stream.getAudioTracks()[0], stream);
                    this.microphoneSender = sender;
                }
            }
        }

        log.debug('Renegotiating WebRTC connection...');
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
     * @param {string} type Type of camera ('front' or 'back')
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async removeVideoStream(stream, type = 'front') {
        if (!this.instance.peerConnection) {
            log.error('Could not remove video stream: connection is not ready');
            return false;
        }
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });

            const sender = type === 'front' ? this.frontCameraSender : this.backCameraSender;

            if (sender) {
                this.instance.peerConnection.removeTrack(sender);
                if (type === 'front') {
                    this.frontCameraSender = null;
                } else {
                    this.backCameraSender = null;
                }
            }
            /*
             * if the flag for bundled audio&video stream is set, we'll remove the audio track too
             * Note: Only if we are closing the stream that owns the audio?
             * Current simplified logic: if generic videoWithMicrophone is on, we remove mic sender.
             */
            if (this.microphoneSender && this.videoWithMicrophone) {
                this.instance.peerConnection.removeTrack(this.microphoneSender);
                this.microphoneSender = null;
            }
            return this.instance.renegotiateWebRTCConnection();
        }
        return false;
    }

    /**
     * Stop the audio & video streaming
     */
    disconnect() {
        if (this.localAudioStream) {
            this.stopAudioStreaming();
        }
        if (this.localFrontVideoStream) {
            this.stopVideoStreaming('front');
        }
        if (this.localBackVideoStream) {
            this.stopVideoStreaming('back');
        }
        this.frontCameraSender = null;
        this.backCameraSender = null;
        this.microphoneSender = null;
    }
}
