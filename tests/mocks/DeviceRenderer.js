'use strict';

const Original = require('../../src/DeviceRenderer');

module.exports = class DeviceRenderer extends Original {
    constructor(options) {
        document.body.innerHTML = `
<div class="gm-wrapper">
    <div class="gm-renderer">
        <div class="gm-video-wrapper">
            <video class="gm-video" autoplay preload="none">
                Your browser does not support the VIDEO tag
            </video>
        </div>
        <div class="gm-toolbars">
            <div class="gm-toolbar">
                <ul>
                </ul>
            </div>
        </div>
    </div>
</div>`;

        window.adapter = {
            browserDetails: {
                browser: 'test',
            },
        };

        navigator.mediaDevices = {
            getUserMedia: jest.fn().mockReturnValue(Promise.resolve(null)),
        };

        super(document.body, options || {});
        this.outgoingMessages = [];
        this.store = {
            getState: () => {
                return {};
            },
            subscribe: jest.fn(),
        };
        this.apiManager = {
            registerFunction: jest.fn(),
        };
    }

    /**
     * Send event to the instance through the Websocket connection.
     *
     * @param {Object} event Event to send.
     */
    sendEvent(event) {
        this.outgoingMessages.push(event);
    }

    /**
     * Add a local stream and send it through SDP renegotiation.
     */
    addLocalStream() {}

    /**
     * Remove a local stream and stop sending it through SDP renegotiation.
     */
    removeLocalStream() {}

    /**
     * Reconfigure & setup the peer-to-peer connection (SDP).
     * Can be used anytime to renegotiate the SDP if necessary.
     */
    renegotiateWebRTCConnection() {}
};
