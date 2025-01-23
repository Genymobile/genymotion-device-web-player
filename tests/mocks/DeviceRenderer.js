'use strict';

const Original = require('../../src/DeviceRenderer');
const OriginalToolbarManager = require('../../src/plugins/util/ToolBarManager');

class ToolBarManager extends OriginalToolbarManager {
    constructor() {
        super();
    }
    registerButton(args) {
        const button = super.registerButton(args);
        /**
         * Tricks, render button after register
         * cause it's the deviceRenderFactory script which launch the renderButton
         * and this script is not available in test
         */
        this.renderButton(args.id);

        return button;
    }
}
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
            dispatch: jest.fn(),
            getters: {
                isWidgetOpened: () => false,
            },
        };
        this.apiManager = {
            registerFunction: jest.fn(),
        };
        this.toolbarManager = new ToolBarManager();
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
