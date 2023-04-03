'use strict';

// Plugins
const PeerConnectionStats = require('./plugins/PeerConnectionStats');

const log = require('loglevel');
log.setDefaultLevel('debug');

/**
 * Device renderer instance.
 * Initialize a renderer for a specific VM instance
 */
module.exports = class DeviceRenderer {
    /**
     * Renderer instance initialization.
     *
     * @param {HTMLElement} domRoot DOM element to attach the renderer to.
     * @param {Object}      options Instance configuration options.
     */
    constructor(domRoot, options) {
        this.timeoutCallbacks = [];
        this.videoBackupStyleBackground = '';

        // Options associated with this instance
        this.options = options;

        // Websocket & WebRTC connection state
        this.initialized = false;
        this.reconnecting = false;

        // Enabled features
        this.keyboardEventsEnabled = false;
        this.touchEventsEnabled = false;
        this.mouseEventsEnabled = false;

        // Websocket
        this.webRTCWebsocket = null;
        this.webRTCWebsocketName = 'gm-webrtc';
        this.useWebsocketAsDataChannel = false;

        // DOM elements
        this.root = domRoot;
        this.video = this.getChildByClass(this.root, 'gm-video');
        this.wrapper = this.getChildByClass(this.root, 'gm-wrapper');
        this.videoWrapper = this.getChildByClass(this.root, 'gm-video-wrapper');
        this.stream = null;

        // Event callbacks
        this.callbacks = {};

        // WebRTC related attributes
        this.peerConnection = null;
        this.signalingDataChannel = null;
        this.cameraSender = null;
        this.microphoneSender = null;
        this.sdpConstraints = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };

        // last accessed x/y position
        this.x = 0;
        this.y = 0;

        document.addEventListener('click', (event) => {
            if (!this.hasSomeParentTheClass(event.target, 'gm-overlay')
                && !event.target.classList.contains('gm-icon-button')
                && !event.target.classList.contains('gm-dont-close')) {
                this.emit('close-overlays');
            }
        });
    }

    /**
     * Create & dispatch a custom event.
     *
     * @param {string} name    Event name.
     * @param {Object} payload Event payload.
     */
    dispatchEvent(name, payload) {
        window.dispatchEvent(new CustomEvent(name, {detail: payload}));
    }

    /**
     * Find a child of a DOM element of given a class.
     *
     * @param  {HTMLElement} element   DOM element to search into.
     * @param  {string}      className Name of the class to search for.
     * @return {HTMLElement}           The first DOM element found, or null.
     */
    getChildByClass(element, className) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes[i];
            if (node.classList && node.classList.contains(className)) {
                return node;
            }

            const child = this.getChildByClass(node, className);
            if (child) {
                return child;
            }
        }
        return null;
    }

    /**
     * Register new callback to be executed when an event is emitted.
     *
     * @param {string}   eventTag Tag of event to react to.
     * @param {Function} callback Action to execute to handle the event.
     */
    registerEventCallback(eventTag, callback) {
        if (!this.callbacks[eventTag]) {
            this.callbacks[eventTag] = [];
        }
        this.callbacks[eventTag].push(callback);
    }

    /**
     * Emit a new event.
     *
     * @param {string} eventTag Tag of the event.
     * @param {Object} payload  Event payload.
     */
    emit(eventTag, payload) {
        if (!this.callbacks[eventTag]) {
            return;
        }

        this.callbacks[eventTag].forEach((callback) => {
            callback(payload);
        });
    }

    /**
     * Look for a class applied in a element parent tree.
     *
     * @param  {HTMLElement} element   DOM element to check.
     * @param  {string}      className Class name to look for.
     * @return {boolean}               Whether or not the class has been found in the given element parents.
     */
    hasSomeParentTheClass(element, className) {
        if (element.classList && element.classList.contains(className)) {
            return true;
        }
        return element.parentNode && this.hasSomeParentTheClass(element.parentNode, className);
    }

    /**
     * Check a websocket instance status.
     *
     * @param  {WebSocket} webSocket websocket instance.
     * @return {boolean}             Whether or not the websocket is open.
     */
    isWebsocketOpen(webSocket) {
        return webSocket && webSocket instanceof WebSocket && webSocket.readyState === webSocket.OPEN;
    }

    /**
     * WebRTC channel ready callback.
     */
    onWebRTCReady() {
        this.webRTCConnectionRetryCount = 0;
        this.openWebRTCConnection();
    }

    /**
     * Open WebSocket and WebRTC connection.
     */
    openWebRTCConnection() {
        if (this.webRTCWebsocket) {
            this.disconnect();
            this.reconnecting = true;
        }

        this.webRTCWebsocket = new WebSocket(this.options.webRTCUrl, this.webRTCWebsocketName);
        this.webRTCWebsocket.onopen = this.sendAuthenticationToken.bind(this);
        this.webRTCWebsocket.onmessage = this.onWebSocketMessage.bind(this);
        this.webRTCWebsocket.onerror = this.onWebSocketMessage.bind(this);
        this.webRTCWebsocket.binaryType = 'arraybuffer';

        /**
         * In case of unexpected close of the WebSocket connection, the handler will retry n times before dying
         * For now we'll be using a lucky value until behaviour is further specified
         */
        if (this.webRTCConnectionRetryCount <= 13) {
            this.onConnectionClosed();
        } else {
            log.error('Unable to establish connection to your instance.');
        }
    }

    /**
     * WebRTC / WebSocket connection closed callback.
     * This will poll the WebRTC sequence until the WebSocket stops throwing the onclose event (unexpected quit).
     */
    onConnectionClosed() {
        this.webRTCWebsocket.onclose = (event) => {
            this.video.style.background = this.videoBackupStyleBackground;
            this.initialized = false;
            log.debug('Error! Maybe your VM is not available yet? (' + event.code +') ' + event.reason);

            switch (event.code) {
            case 1000:
            case 1001:
            case 1005:
                log.debug('Closing websocket');
                this.dispatchEvent('closeConnection', {msg: 'Closing connection'});
                break;

            case 1002:
            case 1003:
            case 1006:
            case 1007:
            case 1008:
            case 1009:
            case 1010:
            case 1011:
            case 1012:
            case 1013:
            case 1014:
            case 1015: {
                // Might be interesting to be able to setup polling debounce in the object configuration (DOM / Frontend Portal)
                this.dispatchEvent('closeConnectionUnavailable', {msg: 'Can\'t connect to the WebSocket'});
                log.debug('Retrying in 3 seconds...');

                const timeout = setTimeout(() => {
                    this.openWebRTCConnection();
                }, 3000);
                this.timeoutCallbacks.push(timeout);
                this.webRTCConnectionRetryCount++;
                break;
            }
            case 4242: // wrong token provided
                this.dispatchEvent('closeWrongToken', {msg: 'Wrong token, can\'t establish connection'});
                break;

            case 4243: // token no longer valid
                this.dispatchEvent('closeNoLongerValidToken', {
                    msg: 'The token provided is no longer valid',
                });
                break;

            case 4244: // server is shutting down
                this.dispatchEvent('closeServerShutdown', {msg: 'Server is shutting down...'});
                break;

            default:
                this.dispatchEvent('defaultCloseConnection', {msg: 'Default close connection'});
                // Do nothing (for now)
                break;
            }
        };
    }

    /**
     * Send auhentication token through the WebSocket connection.
     */
    sendAuthenticationToken() {
        const tokenRequest = {
            type: 'token',
            token: this.options.token,
        };

        if (this.isWebsocketOpen(this.webRTCWebsocket)) {
            this.webRTCWebsocket.send(JSON.stringify(tokenRequest));
        }
    }

    /**
     * Disconnect the current instance, closing any open data channels.
     */
    disconnect() {
        this.initialized = false;

        if (typeof this.camera !== 'undefined' && typeof this.camera.getClientVideoStream !== 'undefined') {
            this.removeLocalStream(this.camera.getClientVideoStream());
        }

        if (this.webRTCWebsocket) {
            this.webRTCWebsocket.close();
            this.webRTCWebsocket = null;
            this.timeoutCallbacks.forEach((timeout) => {
                clearTimeout(timeout);
            });
            this.timeoutCallbacks = [];
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        if (this.signalingDataChannel) {
            this.signalingDataChannel.close();
            this.signalingDataChannel = null;
        }

        if (typeof this.fileUpload !== 'undefined') {
            const msg = {type: 'close'};
            this.fileUpload.loaderWorker.postMessage(msg);
        }
    }

    /**
     * Send event to the instance through the Websocket connection.
     *
     * @param {Object} event Event to send.
     */
    sendEvent(event) {
        event = JSON.stringify(event);

        if (this.useWebsocketAsDataChannel) {
            if (this.isWebsocketOpen(this.webRTCWebsocket)) {
                this.webRTCWebsocket.send(event);
            }
        } else {
            if (this.signalingDataChannel && this.signalingDataChannel.readyState === 'open') {
                this.signalingDataChannel.send(event);
            } else {
                log.warn('cannot send event, signaling data channel closed');
            }
        }
    }

    /**
     * Reconfigure & setup the peer-to-peer connection (SDP).
     * Can be used anytime to renegotiate the SDP if necessary.
     */
    renegotiateWebRTCConnection() {
        // For safari we add audio & video before sending SDP to avoid empty SDP
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
            this.peerConnection.addTransceiver('audio');
            this.peerConnection.addTransceiver('video');
        }
        // creating SDP offer
        this.peerConnection.createOffer(
            this.setLocalDescription.bind(this),
            this.onWebRTCConnectionError.bind(this),
            this.sdpConstraints
        );
    }

    /**
     * Find RTCRtpSender corresponding RTCRtpTransceiver and set its direction.
     *
     * @param {RTCRtpSender} sender    Peer (sender).
     * @param {string}       direction Transceiver direction.
     */
    setTransceiverDirection(sender) {
        // find transceiver that contains sender
        this.peerConnection.getTransceivers().forEach((transceiver) => {
            if (transceiver.sender === sender) {
                transceiver.direction = 'sendrecv';
            }
        });
    }

    /**
     * Add a local stream and send it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addStream
     *
     * @param {MediaStream} stream Stream to add.
     */
    addLocalStream(stream) {
        if (typeof this.peerConnection.addTrack === 'function') {
            // If the new API "addTrack" is available, we use it

            /**
             * If cameraSender or microphoneSender is defined, this means that we already added
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
                    this.cameraSender = this.peerConnection.addTrack(stream.getVideoTracks()[0],
                        stream);
                }
            }

            if (this.options.microphone && stream.getAudioTracks().length > 0) {
                if (this.microphoneSender) {
                    log.debug('Replacing audio track on sender');
                    this.microphoneSender.replaceTrack(stream.getAudioTracks()[0]);
                    this.setTransceiverDirection(this.microphoneSender, 'sendrecv');
                } else {
                    this.microphoneSender = this.peerConnection.addTrack(stream.getAudioTracks()[0],
                        stream);
                }
            }
        } else {
            // Else if it is not available, we use the old "addStream"
            this.peerConnection.addStream(stream);
        }
        this.renegotiateWebRTCConnection();
    }

    /**
     * Remove a local stream and stop sending it through SDP renegotiation.
     *
     * See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeTrack
     * and https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/removeStream
     *
     * @param {MediaStream} stream Stream to stop and remove.
     */
    removeLocalStream(stream) {
        if (stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
            // If the new API "removeTrack" is available, we use it
            if (typeof this.peerConnection.addTrack === 'function') {
                this.peerConnection.removeTrack(this.cameraSender);
                if (this.microphoneSender) {
                    this.peerConnection.removeTrack(this.microphoneSender);
                }
                // Else if it is not available, we use the old "removeStream"
            } else {
                this.peerConnection.removeStream(stream);
            }
            this.renegotiateWebRTCConnection();
        }
    }

    /**
     * Creates a peer connection that connects through WebRTC to the instance.
     */
    createPeerConnection() {
        log.debug('Creating peer connection');

        const iceServers = [];

        if (Object.keys(this.options.stun).length > 0) {
            iceServers.push(this.options.stun);
        }

        if (Object.keys(this.options.turn).length > 0) {
            iceServers.push(this.options.turn);
        }

        const config = {
            iceServers: iceServers,
        };

        if (!this.peerConnection) {
            try {
                this.peerConnection = new RTCPeerConnection(config);
            } catch (e) {
                log.warn('Failed to create PeerConnection, exception:', e.message);
            }
        } else {
            log.debug('Peer connection already exists');
        }

        if (typeof this.peerConnection.createDataChannel !== 'undefined') {
            const dataChannelOptions = {
                ordered: true,
            };

            this.signalingDataChannel = this.peerConnection.createDataChannel('events', dataChannelOptions);

            this.signalingDataChannel.onerror = (error) => {
                log.warn('Data Channel Error:', error);
            };

            this.signalingDataChannel.onmessage = (event) => {
                log.debug('Got Data Channel Message:', event.data);
            };
            this.signalingDataChannel.onopen = () => {
                log.debug('Data Channel opened');
            };

            this.signalingDataChannel.onclose = () => {
                log.debug('The Data Channel is Closed');
            };

            this.peerConnection.ondatachannel = (event) => {
                const answererDataChannel = event.channel;
                answererDataChannel.onmessage = this.onDataChannelMessage.bind(this);
            };
        } else {
            this.useWebsocketAsDataChannel = true;
        }

        this.peerConnection.onicecandidate = (event) => {
            if (typeof event.candidate === 'undefined') {
                // Nothing we can do
                return;
            }

            if (event.candidate) {
                this.sendIceCandidate(event.candidate);
            } else {
                log.debug('All candidates ready');
            }
        };

        this.peerConnection.ontrack = (event) => {
            log.debug('Received track:', event.track.kind);

            if (event.track.kind !== 'video') {
                return;
            }

            log.debug('Added remote video track using ontrack');
            this.video.srcObject = event.streams[0];
            this.video.setAttribute('playsinline', true); // needed on iOs
            this.stream = event.streams[0];

            // Get the PeerConnection Statistics after 3 seconds
            new PeerConnectionStats(this, this.peerConnection, 3000);

            this.videoBackupStyleBackground = this.video.style.background;
            this.video.style.background = 'transparent';

            if (this.touchEventsEnabled) {
                this.touchEvents.addTouchCallbacks();
            }

            if (this.mouseEventsEnabled) {
                this.mouseEvents.addMouseCallbacks();
            }

            if (this.keyboardEventsEnabled) {
                this.keyboardEvents.addKeyboardCallbacks();
            }

            const playWithSound = this.video.play(); // needed on Safari (web & iOs)
            if (!playWithSound) {
                return;
            }

            playWithSound.then(() => {
                log.debug('Playing video with sound enabled');
                this.dispatchEvent('video', {msg: 'play automatically allowed with sound'});
            }).catch(() => {
                log.debug('Can\'t play video with sound enabled');
                this.dispatchEvent('video', {msg: 'play with sound denied'});
                this.video.muted = true;
                const playWithoutSound = this.video.play();
                playWithoutSound.then(() => {
                    log.debug('Playing video with sound disabled');
                    this.dispatchEvent('video', {msg: 'play automatically allowed without sound'});
                    const popup = document.createElement('div');
                    popup.classList.add('gm-click-to-unmute');
                    popup.innerHTML = 'By default, the sound has been turned off, '
                        + 'please click anywhere to re-enable audio';
                    this.videoWrapper.prepend(popup);
                    const addSound = () => {
                        this.video.muted = false;
                        this.video.removeEventListener('click', addSound);
                        this.video.removeEventListener('touchend', addSound);
                        this.dispatchEvent('video', {msg: 'sound manually allowed by click'});
                        popup.remove();
                        log.debug('Playing video with sound enabled has been authorized due to user click');
                    };
                    this.video.addEventListener('click', addSound);
                    this.video.addEventListener('touchend', addSound);
                }).catch(() => {
                    log.debug('Can\'t play video, even with sound disabled');
                    this.dispatchEvent('video', {msg: 'play denied even without sound'});
                    const div = document.createElement('div');
                    this.classList.add('gm-click-to-display');
                    this.classList.add('gm-video-overlay');
                    this.videoWrapper.prepend(div);
                    const allowPlay = () => {
                        this.video.play();
                        div.remove();
                        this.dispatchEvent('video', {msg: 'play manually allowed by click'});
                        log.debug('Playing video with sound disabled has been authorized due to user click');
                    };
                    div.addEventListener('click', allowPlay);
                    div.addEventListener('touchend', allowPlay);
                });
            });
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const iceConnectionState =
                this.peerConnection ? this.peerConnection.iceConnectionState : 'No peerConnection';
            log.debug('iceConnectionState: ', iceConnectionState);
            this.dispatchEvent('iceConnectionState', {msg: iceConnectionState});

            if (iceConnectionState !== 'failed') {
                return;
            }

            let message = '<div class="gm-error-text">Aw, snap!<br/>Connection failed.<p>Check your internet ' +
                'connection & firewall rules.{DOC_AVAILABLE}</p></div>';
            const div = document.createElement('div');
            div.classList.add('gm-overlay-cant-connect');
            div.classList.add('gm-video-overlay');
            this.videoWrapper.prepend(div);
            if (this.options.connectionFailedURL) {
                message = message.replace(
                    '{DOC_AVAILABLE}',
                    '</br>See <a href="">help</a> to setup TURN configuration.'
                );
                const openDocumentationLink = () => {
                    this.dispatchEvent('iceConnectionStateDocumentation', {msg: 'clicked'});
                    div.remove();
                    window.open(this.options.connectionFailedURL, '_blank');
                };
                div.addEventListener('click', openDocumentationLink);
                div.addEventListener('touchend', openDocumentationLink);
            } else {
                message = message.replace('{DOC_AVAILABLE}', '');
            }

            div.innerHTML = message;
        };

        this.peerConnection.onconnectionstatechange = () => {
            log.debug('ConnectionState changed:', this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState === 'disconnected') {
                this.onWebRTCReady();
            }
        };

        this.peerConnection.onnegotiationneeded = () => {
            log.debug('on Negotiation needed');
        };

        this.renegotiateWebRTCConnection();
    }

    /**
     * Send any ice candidates to the other peer.
     *
     * @param {RTCIceCandidate} iceCandidate Candidate to send.
     */
    sendIceCandidate(iceCandidate) {
        if (this.isWebsocketOpen(this.webRTCWebsocket)) {
            this.webRTCWebsocket.send(JSON.stringify(iceCandidate));
        }
    }

    /**
     * Called when a PeerConnection receives a description.
     *
     * @param {RTCSessionDescription} description Peer connection session description.
     */
    setLocalDescription(description) {
        this.peerConnection.setLocalDescription(description);
        if (this.isWebsocketOpen(this.webRTCWebsocket)) {
            this.webRTCWebsocket.send(JSON.stringify(description));
        }
    }

    /**
     * Called when the WebRTC WebSocket socket receives a message.
     *
     * @param {Event} message WebRTC message.
     */
    onWebSocketMessage(message) {
        let data = null;

        try {
            data = JSON.parse(message.data);
        } catch (error) {
            return;
        }

        if (!data) {
            return;
        }

        if (data.sdp) {
            try {
                const sdp = new RTCSessionDescription(data);
                this.peerConnection.setRemoteDescription(
                    sdp,
                    this.onWebRTCConnectionEstablished.bind(this),
                    this.onWebRTCConnectionError.bind(this)
                );
            } catch (error) {
                log.warn('Failed to create SDP ', error.message);
            }
        } else if (data.candidate) {
            try {
                const candidate = new RTCIceCandidate(data);
                this.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                log.warn('Failed to create ICE ', error.message);
            }
        } else if (data.connection) {
            this.createPeerConnection();
        } else {
            this.handleMessage(data);
        }
    }

    /**
     * Called when both local and remote SDP have been set.
     */
    onWebRTCConnectionEstablished() {
        log.debug('WebRTC connection success');

        if (this.initialized) {
            return;
        }

        this.initialized = true;
        if (this.reconnecting) {
            this.reconnecting = false;
        } else {
            this.dispatchEvent('successConnection', {msg: 'Connection established'});
        }

        if (this.fileUpload) {
            const msg = {
                type: 'address',
                fileUploadAddress: this.options.fileUploadUrl,
                token: this.options.token,
            };

            if (this.fileUpload.loaderWorker) {
                this.fileUpload.loaderWorker.postMessage(msg);
            }
        }
    }

    /**
     * WebRTC connection error.
     *
     * @param {string} code Error code.
     */
    onWebRTCConnectionError(code) {
        log.debug('Failure callback:', code);
    }

    /**
     * Parse & process data events received from WebRTC data channel.
     *
     * @param {Event} event WebRTC event.
     */
    onDataChannelMessage(event) {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
    }

    /**
     * Process WebRTC message.
     *
     * @param {Object} data Message payload.
     */
    handleMessage(data) {
        if (data.type === 'USERS') {
            if (data.code === 'SUCCESS') {
                this.dispatchEvent('userListUpdated', {msg: data.message});
            }
        } else if (data.type === 'VERSION') {
            if (data.code === 'SUCCESS') {
                const versionNumber = this.getChildByClass(this.root, 'gm-version-number');
                if (versionNumber) {
                    versionNumber.innerHTML = data.message;
                }
            }
        } else if (data.type === 'CAPABILITIES') {
            [{
                widget: this.battery,
                capability: data.message.battery,
            }, {
                widget: this.camera,
                capability: data.message.camera,
            }, {
                widget: this.gps,
                capability: data.message.gps,
            }, {
                widget: this.identifiers,
                capability: data.message.identifiers,
            }, {
                widget: this.network,
                capability: data.message.network,
            }, {
                widget: this.network,
                capability: data.message.mobileThrottling,
                enable: (widget) => {
                    widget.enableMobileThrottling();
                },
                disable: (widget) => {
                    widget.disableMobileThrottling();
                },
            }, {
                widget: this.network,
                capability: data.message.enable5G,
                enable: (widget) => {
                    widget.enable5G();
                },
                disable: (widget) => {
                    widget.disable5G();
                },
            }, {
                widget: this.phone,
                capability: data.message.phone,
            }, {
                widget: this.baseband,
                capability: data.message.phone,
            }, {
                widget: this.diskIO,
                capability: data.message.diskIO,
            }, {
                widget: this.buttonsEvents,
                capability: data.message.accelerometer,
                enable: (widget) => {
                    widget.enableRotation();
                },
                disable: (widget) => {
                    widget.disableRotation();
                },
            }, {
                widget: this.fileUpload,
                capability: data.message.systemPatcher,
                enable: (widget) => {
                    widget.setAvailability(true);
                },
                disable: (widget) => {
                    widget.setAvailability(false);
                },
            }].forEach((feature) => {
                if (typeof feature.widget !== 'undefined') {
                    if (feature.capability === true) {
                        if (feature.enable) {
                            feature.enable(feature.widget);
                        } else {
                            feature.widget.enable();
                        }
                    } else {
                        // If feature.capability is not defined or false
                        if (feature.disable) {
                            feature.disable(feature.widget);
                        } else {
                            feature.widget.disable();
                        }
                    }
                }
            });
        }

        // Emit message to anyone who wants to listen
        if (data.code === 'SUCCESS') {
            this.emit(data.type, data.message);
        }
    }
};
