'use strict';

// Plugins
const MultiTouchEvents = require('./plugins/MultiTouchEvents');
const ButtonsEvents = require('./plugins/ButtonsEvents');
const Fullscreen = require('./plugins/Fullscreen');
const Clipboard = require('./plugins/Clipboard');
const StreamBitrate = require('./plugins/StreamBitrate');
const Screencast = require('./plugins/Screencast');
const StreamResolution = require('./plugins/StreamResolution');
const CoordinateUtils = require('./plugins/CoordinateUtils');
const KeyboardEvents = require('./plugins/KeyboardEvents');
const KeyboardMapping = require('./plugins/KeyboardMapping');
const MouseEvents = require('./plugins/MouseEvents');
const PeerConnectionStats = require('./plugins/PeerConnectionStats');
const Gamepad = require('./plugins/Gamepad');
const Camera = require('./plugins/Camera');
const GPS = require('./plugins/GPS');
const FileUpload = require('./plugins/FileUpload');
const Battery = require('./plugins/Battery');
const Identifiers = require('./plugins/Identifiers');
const Network = require('./plugins/Network');
const Phone = require('./plugins/Phone');
const BasebandRIL = require('./plugins/BasebandRIL');
const IOThrottling = require('./plugins/IOThrottling');
const GamepadManager = require('./plugins/GamepadManager');
const FingerPrint = require('./plugins/FingerPrint');
const MediaManager = require('./plugins/MediaManager');

const {generateUID} = require('./utils/helpers');
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

        this.touchEventsEnabled = false;
        this.gamepadEventsEnabled = false;

        // Websocket
        this.webRTCWebsocket = null;
        this.useWebsocketAsDataChannel = false;

        // DOM elements
        this.root = domRoot;
        this.video = this.getChildByClass(this.root, 'gm-video');
        this.wrapper = this.getChildByClass(this.root, 'gm-wrapper');
        this.videoWrapper = this.getChildByClass(this.root, 'gm-video-wrapper');
        this.stream = null;

        // Event callbacks
        this.callbacks = {};

        // Event listeners
        this.allListeners = [];

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
    }

    /**
     * get plugins to initialize.
     * @returns {Array} List of plugins to initialize.
     */
    getPlugins() {
        const pluginInitMap = [
            {enabled: this.options.touch, class: MultiTouchEvents},
            {enabled: this.options.fullscreen, class: Fullscreen},
            {enabled: this.options.clipboard, class: Clipboard, params: [this.options.i18n]},
            {enabled: this.options.streamBitrate, class: StreamBitrate, params: [this.options.i18n]},
            {enabled: this.options.camera, class: Camera, params: [this.options.i18n], dependencies: [MediaManager]},
            {enabled: this.options.fileUpload, class: FileUpload, params: [this.options.i18n]},
            {enabled: this.options.battery, class: Battery, params: [this.options.i18n]},
            {enabled: this.options.gps, class: GPS, params: [this.options.i18n, this.options.gpsSpeedSupport]},
            {enabled: this.options.capture, class: Screencast, params: [this.options.i18n]},
            {enabled: this.options.streamResolution, class: StreamResolution},
            {enabled: this.options.touch || this.options.mouse, class: CoordinateUtils},
            {enabled: this.options.keyboard, class: KeyboardEvents},
            {enabled: this.options.keyboardMapping, class: KeyboardMapping},
            {enabled: this.options.mouse, class: MouseEvents},
            {
                enabled: this.options.gamepad,
                class: Gamepad,
                params: [this.options.i18n],
                dependencies: [GamepadManager],
            },
            {enabled: this.options.identifiers, class: Identifiers, params: [this.options.i18n]},
            {enabled: this.options.network, class: Network, params: [this.options.i18n]},
            {enabled: this.options.phone, class: Phone, params: [this.options.i18n]},
            {enabled: this.options.baseband, class: BasebandRIL, params: [this.options.i18n, this.options.baseband]},
            {enabled: this.options.diskIO, class: IOThrottling, params: [this.options.i18n]},
            {enabled: this.options.biometrics, class: FingerPrint},
            {enabled: this.options.microphone, dependencies: [MediaManager]},
            {
                enabled: this.options.buttons,
                class: ButtonsEvents,
                params: [this.options.i18n, this.options.translateHomeKey],
            },
        ];

        return pluginInitMap;
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
        // closure to expose the right video and store context to onclose event
        const video = this.video;
        const store = this.store;

        this.webRTCWebsocket.onclose = (event) => {
            store.dispatch({type: 'WEBRTC_CONNECTION_READY', payload: false});
            store.dispatch({type: 'KEYBOARD_EVENTS_ENABLED', payload: false});
            store.dispatch({type: 'MOUSE_EVENTS_ENABLED', payload: false});
            video.style.background = this.videoBackupStyleBackground;
            this.initialized = false;
            log.debug('Error! Maybe your VM is not available yet? (' + event.code + ') ' + event.reason);

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
                    this.dispatchEvent('closeConnectionUnavailable', {msg: "Can't connect to the WebSocket"});
                    log.debug('Retrying in 3 seconds...');

                    const timeout = setTimeout(() => {
                        this.openWebRTCConnection();
                    }, 3000);
                    this.timeoutCallbacks.push(timeout);
                    this.webRTCConnectionRetryCount++;
                    break;
                }
                case 4242: // wrong token provided
                    this.dispatchEvent('closeWrongToken', {msg: "Wrong token, can't establish connection"});
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

        this.mediaManager?.disconnect();

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
     * @returns {Promise<boolean>} A promise that always resolves, with true on success and false on fail
     */
    async renegotiateWebRTCConnection() {
        // For safari we add audio & video before sending SDP to avoid empty SDP
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
            this.peerConnection.addTransceiver('audio');
            this.peerConnection.addTransceiver('video');
        }
        // creating SDP offer
        try {
            const description = await this.peerConnection.createOffer(this.sdpConstraints);
            this.setLocalDescription(description);
        } catch (error) {
            this.onWebRTCConnectionError(error);
            return false;
        }
        return true;
    }

    /**
     * Creates a peer connection that connects through WebRTC to the instance.
     */
    createPeerConnection() {
        log.debug('Creating peer connection');

        const iceServers = [];

        if (Array.isArray(this.options.stun)) {
            this.options.stun.forEach((stunServer) => {
                iceServers.push(stunServer);
            });
        } else if (Object.keys(this.options.stun).length > 0) {
            iceServers.push(this.options.stun);
        }

        if (Array.isArray(this.options.turn)) {
            this.options.turn.forEach((turnServer) => {
                iceServers.push(turnServer);
            });
        } else if (Object.keys(this.options.turn).length > 0) {
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
            this.createDataChannels();
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

            if (this.gamepadEventsEnabled) {
                this.gamepadManager.addGamepadCallbacks();
            }

            this.store.dispatch({type: 'KEYBOARD_EVENTS_ENABLED', payload: true});
            this.store.dispatch({type: 'MOUSE_EVENTS_ENABLED', payload: true});

            const playWithSound = this.video.play(); // needed on Safari (web & iOs)
            if (!playWithSound) {
                return;
            }

            playWithSound
                .then(() => {
                    log.debug('Playing video with sound enabled');
                    this.dispatchEvent('video', {msg: 'play automatically allowed with sound'});
                })
                .catch(() => {
                    log.debug("Can't play video with sound enabled");
                    this.dispatchEvent('video', {msg: 'play with sound denied'});
                    this.video.muted = true;
                    const playWithoutSound = this.video.play();
                    playWithoutSound
                        .then(() => {
                            log.debug('Playing video with sound disabled');
                            this.dispatchEvent('video', {msg: 'play automatically allowed without sound'});
                            const popup = document.createElement('div');
                            popup.classList.add('gm-click-to-unmute');
                            popup.innerHTML =
                                this.options.i18n.UNMUTE_INVITE ||
                                'By default, the sound has been turned off, ' +
                                    'please click anywhere to re-enable audio';
                            this.videoWrapper.prepend(popup);
                            const addSound = () => {
                                this.video.muted = false;
                                this.removeAddSoundListener();
                                this.dispatchEvent('video', {msg: 'sound manually allowed by click'});
                                popup.remove();
                                log.debug('Playing video with sound enabled has been authorized due to user click');
                            };
                            this.removeAddSoundListener = this.addListener(window, ['click', 'touchend'], addSound);
                        })
                        .catch(() => {
                            log.debug("Can't play video, even with sound disabled");
                            this.dispatchEvent('video', {msg: 'play denied even without sound'});
                            const div = document.createElement('div');
                            this.classList.add('gm-click-to-display');
                            this.classList.add('gm-video-overlay');
                            this.videoWrapper.prepend(div);
                            const allowPlay = () => {
                                this.removeAllowPlayListener();
                                this.video.play();
                                div.remove();
                                this.dispatchEvent('video', {msg: 'play manually allowed by click'});
                                log.debug('Playing video with sound disabled has been authorized due to user click');
                            };
                            this.removeAllowPlayListener = this.addListener(div, ['click', 'touchend'], allowPlay);
                        });
                });
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            const iceConnectionState = this.peerConnection
                ? this.peerConnection.iceConnectionState
                : 'No peerConnection';
            log.debug('iceConnectionState: ', iceConnectionState);
            this.dispatchEvent('iceConnectionState', {msg: iceConnectionState});

            if (iceConnectionState !== 'failed') {
                return;
            }

            let message =
                '<div class="gm-error-text">Aw, snap!<br/>Connection failed.<p>Check your internet ' +
                'connection & firewall rules.{DOC_AVAILABLE}</p></div>';
            const div = document.createElement('div');
            div.classList.add('gm-overlay-cant-connect');
            div.classList.add('gm-video-overlay');
            this.videoWrapper.prepend(div);
            if (this.options.connectionFailedURL) {
                message = message.replace(
                    '{DOC_AVAILABLE}',
                    '</br>See <a href="">help</a> to setup TURN configuration.',
                );
                const openDocumentationLink = () => {
                    this.removeOpenDocListener();
                    this.dispatchEvent('iceConnectionStateDocumentation', {msg: 'clicked'});
                    div.remove();
                    window.open(this.options.connectionFailedURL, '_blank');
                };
                this.removeOpenDocListener = this.addListener(div, ['click', 'touchend'], openDocumentationLink);
            } else {
                message = message.replace('{DOC_AVAILABLE}', '');
            }

            div.innerHTML = message;
        };

        this.onConnectionStateChange = () => {
            log.debug('ConnectionState changed:', this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState === 'disconnected') {
                this.onWebRTCReady();
            }
        };
        this.addListener(this.peerConnection, 'connectionstatechange', this.onConnectionStateChange);

        this.peerConnection.onnegotiationneeded = () => {
            log.debug('on Negotiation needed');
        };

        this.renegotiateWebRTCConnection();
    }

    /**
     * Create datachannel(s)
     */
    createDataChannels() {
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
            // Adding status to store, this way all logic for new connection can be handled by plugin
            this.store.dispatch({type: 'WEBRTC_CONNECTION_READY', payload: true});
            log.debug('Data Channel opened');
        };

        this.signalingDataChannel.onclose = () => {
            log.debug('The Data Channel is Closed');
        };

        this.peerConnection.ondatachannel = (event) => {
            const answererDataChannel = event.channel;
            answererDataChannel.onmessage = this.onDataChannelMessage.bind(this);
        };
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
        /*
         * Munging SDP before setLocalDescription is not really standard compliant, but seems like
         * the only way to make Chrome advertise it prefers stereo.
         * Setting maxplaybackrate and maxaveragebitrate are not necessary, but they
         * may improve audio quality by specifying HQ defaults.
         */
        const m = [...description.sdp.matchAll(/a=rtpmap:(\d+) opus\/48000\/2/g)][0];
        if (m) {
            /**
             * Adding stereo=1;maxplaybackrate=48000;maxaveragebitrate=256000 to the opus codec
             * taking care of prepending with ';' if necessary
             */
            description.sdp = description.sdp.replace(
                new RegExp(`(a=fmtp:${m[1]}) ?(.*)(\r?\n)`, 'g'),
                // eslint-disable-next-line no-unused-vars
                (match, fmtpId, existingParams, lineEnding, offset, string) => {
                    const modified = existingParams ? `${fmtpId} ${existingParams};` : `${fmtpId} `;
                    return `${modified}stereo=1;maxplaybackrate=48000;maxaveragebitrate=256000${lineEnding}`;
                },
            );
        }

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
                    this.onWebRTCConnectionError.bind(this),
                );
            } catch (error) {
                log.warn('Failed to create SDP ', error.message);
            }
        } else if (data.candidate) {
            if (data.candidate === 'end-of-candidates') {
                log.debug('End of ICE candidates received');
                return;
            }
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
            [
                {
                    widget: this.battery,
                    capability: data.message.battery,
                },
                {
                    widget: this.camera,
                    capability: data.message.camera,
                },
                {
                    widget: this.gps,
                    capability: data.message.gps,
                },
                {
                    widget: this.identifiers,
                    capability: data.message.identifiers,
                },
                {
                    widget: this.network,
                    capability: data.message.network,
                },
                {
                    widget: this.network,
                    capability: data.message.mobileThrottling,
                    enable: (widget) => {
                        widget.enableMobileThrottling();
                    },
                    disable: (widget) => {
                        widget.disableMobileThrottling();
                    },
                },
                {
                    widget: this.network,
                    capability: data.message.enable5G,
                    enable: (widget) => {
                        widget.enable5G();
                    },
                    disable: (widget) => {
                        widget.disable5G();
                    },
                },
                {
                    widget: this.phone,
                    capability: data.message.phone,
                },
                {
                    widget: this.baseband,
                    capability: data.message.phone,
                },
                {
                    widget: this.diskIO,
                    capability: data.message.diskIO,
                },
                {
                    widget: this.buttonsEvents,
                    capability: data.message.accelerometer,
                    enable: (widget) => {
                        widget.enableRotation();
                    },
                    disable: (widget) => {
                        widget.disableRotation();
                    },
                },
                {
                    widget: this.fileUpload,
                    capability: data.message.systemPatcher,
                    enable: (widget) => {
                        widget.setAvailability(true);
                    },
                    disable: (widget) => {
                        widget.setAvailability(false);
                    },
                },
                {
                    widget: this.fingerprint,
                    capability: data.message.biometrics,
                },
                {
                    widget: this.gamepad,
                    capability: data.message.gamepad,
                },
            ].forEach((feature) => {
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

    /**
     * This function wraps around the plain js `addEventListener` function, also registering everything in a local array.
     * The aim is to be able to remove all listeners at a later time.
     * @param {EventTarget} object Object which emits the event
     * @param {Array<String>|String} events Either one case-sensitive string reprensenting the event type to listen for, or an array of such strings
     * @param {any} handler The object that receives a notification when an event of the specified type occus. This must be either `null`, an object with a `handleEvent()` method, or a function.
     * @param {any} options Either a bool, specifying the `useCapture` arg, or an object specifying the `options` arg. Refer to the js api.
     * @return {function} A removeListener function. This must be saved on the caller side if you ever want to use it to remove the listener
     */
    addListener(object, events, handler, options = {}) {
        const eventArray = Array.isArray(events) ? events : [events];
        const id = generateUID();
        eventArray.forEach((event) => {
            object.addEventListener(event, handler, options);
            this.allListeners.push({id, object, event, handler, options});
        });

        return () => {
            this.allListeners = this.allListeners.filter((item) => {
                if (item.id === id) {
                    object.removeEventListener(item.event, item.handler, item.options);
                    return false;
                }
                return true;
            });
        };
    }

    /**
     * Removes all listeners that were added through `addListener`
     */
    removeAllListeners() {
        this.allListeners.forEach(({object, event, handler, options}) => {
            object.removeEventListener(event, handler, options);
        });
        this.allListeners.length = 0;
    }

    /**
     * Destructor for the device renderer. This won't actually destroy the instance, but simply remove all event bindings
     * so that things can be garbage-collected.
     * References to the instance in the caller need to be manually deleted too in order for the instance to be garbage-collected.
     * This method also calls recursively the destroy methods on the plugins if they exist.
     */
    destroy() {
        /**
         *  if the websocket is in connecting state,
         *  we can't destroy the instance cause object is not fully initialized
         */
        if (this.webRTCWebsocket.readyState === 0) {
            return;
        }

        this.removeAllListeners();
        this.disconnect();
        this.peerConnectionStats?.destroy();
        delete this.peerConnectionStats;
        delete this.video;
        delete this.wrapper;
        delete this.videoWrapper;
        delete this.root;
        delete this.stream;
    }
};
