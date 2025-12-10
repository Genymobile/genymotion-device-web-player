import Original from '../../src/DeviceRenderer.js';
import DeviceRendererFactory from '../../src/DeviceRendererFactory.js';
import OriginalToolbarManager from '../../src/plugins/util/ToolBarManager.js';
import OriginalTooltipManager from '../../src/plugins/util/TooltipManager.js';
import OriginalApiManager from '../../src/APIManager.js';
import {vi} from 'vitest';

import store from '../../src/store/index.js';

class ToolBarManager extends OriginalToolbarManager {
    constructor(instance) {
        super(instance);
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
export default class DeviceRenderer extends Original {
    constructor(options = {}) {
        if (!options.i18n) {
            options.i18n = {};
        }
        // we use the factory to load the template, like in production, this way the template generated takes the options
        const factory = new DeviceRendererFactory();

        const htmlFromFactory = document.createElement('div');
        factory.loadTemplate(htmlFromFactory, options);
        document.body.innerHTML = htmlFromFactory.outerHTML;
        super(document.body, options);

        navigator.mediaDevices = {
            getUserMedia: vi.fn().mockReturnValue(Promise.resolve(null)),
        };

        this.outgoingMessages = [];
        this.apiManager = new OriginalApiManager(this);
        this.toolbarManager = new ToolBarManager(this);
        this.tooltipManager = new OriginalTooltipManager(this);
        // Load store since it's deviceRendererFactory which load it
        store(this);
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
}
