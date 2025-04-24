'use strict';

const DeviceRenderer = require('./DeviceRenderer');
const defaultsDeep = require('lodash/defaultsDeep');

const store = require('./store');
const APIManager = require('./APIManager');
const ToolbarManager = require('./plugins/util/ToolBarManager');

const log = require('loglevel');
log.setDefaultLevel('debug');

// Default options
const defaultOptions = {
    toolbarOrder: [
        'ButtonsEvents_VOLUME_UP',
        'ButtonsEvents_VOLUME_DOWN',
        'ButtonsEvents_ROTATE',
        'separator',
        'unordered',
        'separator',
        'ButtonsEvents_RECENT_APP',
        'ButtonsEvents_HOMEPAGE',
        'ButtonsEvents_BACK',
        'ButtonsEvents_POWER',
    ],
    toolbarPosition: 'right',
    touch: true,
    mouse: true,
    volume: true,
    rotation: true,
    navbar: true,
    power: true,
    keyboard: true,
    keyboardMapping: true,
    fullscreen: true,
    camera: true,
    microphone: false,
    fileUpload: true,
    streamBitrate: false,
    clipboard: true,
    battery: true,
    gps: true,
    capture: true,
    identifiers: true,
    network: true,
    mobilethrottling: false,
    baseband: false,
    phone: true,
    streamResolution: true,
    diskIO: true,
    gamepad: true,
    biometrics: true,
    token: '',
    i18n: {},
    stun: {
        urls: [
            // TODO: remove what we don't have
            'stun:stun-eu.genymotion.com:80',
            'stun:stun-eu.genymotion.com:443',
            'stun:stun-eu.genymotion.com:3478',
            'stun:stun-eu.genymotion.com:5349',
            'stun:stun-na.genymotion.com:80',
            'stun:stun-na.genymotion.com:443',
            'stun:stun-na.genymotion.com:3478',
            'stun:stun-na.genymotion.com:5349',
        ],
    },
    connectionFailedURL: '',
    turn: {},
    giveFeedbackLink: 'https://github.com/orgs/Genymobile/discussions',
};

/**
 * Setup & create instances of the device renderer
 */
module.exports = class DeviceRendererFactory {
    constructor() {
        this.instances = [];
    }

    /**
     * Setup a device renderer instance in the given dom element, for the device instance identified by its instanceWebRTCUrl.
     *
     * @param  {HTMLElement|string} dom                            The DOM element (or its ID) to setup the device renderer into.
     * @param  {string}             webRTCUrl                      WebRTC URL of the instance.
     * @param  {Object}             options                        Various configuration options.
     * @param  {boolean}            options.showPhoneBorder        Show phone border. Default: false.
     * @param  {string}             options.toolbarPosition        Toolbar position. Default: 'right'. Available values: 'left', 'right'.
     * @param  {boolean}            options.toolbarOrder           Toolbar buttons order. Default: see defaultOptions.
     * @param  {boolean}            options.touch                  Touch support activated. Default: true.
     * @param  {boolean}            options.mouse                  Mouse support activated. Default: true.
     * @param  {boolean}            options.volume                 Audio volume control support activated. Default: true.
     * @param  {boolean}            options.rotation               Screen rotation support activated. Default: true.
     * @param  {boolean}            options.navbar                 Android navbar support activated. Default: true.
     * @param  {boolean}            options.power                  Power control support activated. Default: true.
     * @param  {boolean}            options.keyboard               Keyboad support activated. Default: true.
     * @param  {boolean}            options.keyboardMapping        Keyboad mapping support activated. Default: true.
     * @param  {boolean}            options.fullscreen             Fullscreen support activated. Default: true.
     * @param  {boolean}            options.camera                 Camera support activated. Default: true.
     * @param  {boolean}            options.microphone             Microphone support activated. Default: false.
     * @param  {boolean}            options.fileUpload             File upload support activated. Default: true.
     * @param  {string}             options.fileUploadUrl          File upload URL. Required if fileUpload===true.
     * @param  {boolean}            options.streamBitrate          Stream bitrate control support activated. Default: false.
     * @param  {boolean}            options.clipboard              Clipboard forwarding support activated. Default: true.
     * @param  {boolean}            options.battery                Battery support activated. Default: true.
     * @param  {boolean}            options.gps                    GPS support activated. Default: true.
     * @param  {boolean}            options.capture                Screen capture support activated. Default: true.
     * @param  {boolean}            options.identifiers            Identifiers (IMEI, etc...) support activated. Default: true.
     * @param  {boolean}            options.network                Network throttling support activated. Default: true.
     * @param  {boolean}            options.mobilethrottling       Mobile throttling support activated. Default: false.
     * @param  {boolean}            options.baseband               Baseband controll support activated. Default: false.
     * @param  {boolean}            options.phone                  Baseband support activated. Default: true.
     * @param  {boolean}            options.streamResolution       Stream resolution control support activated. Default: true.
     * @param  {boolean}            options.diskIO                 Disk I/O throttling support activated. Default: true.
     * @param  {boolean}            options.gamepad                Experimental gamepad support activated. Default: false.
     * @param  {string}             options.token                  Instance access token (JWT). Default: ''.
     * @param  {Object}             options.i18n                   Translations keys for the UI. Default: {}.
     * @param  {Object}             options.stun                   WebRTC STUN servers configuration.
     * @param  {Array<string>}      options.stun.urls              WebRTC STUN servers URLs.
     * @param  {string}             options.connectionFailedURL    Redirection page in case of connection establishment error.
     * @param  {Object}             options.turn                   WebRTC TURN servers configuration.
     * @param  {Array<string>}      options.turn.urls              WebRTC TURN servers URLs.
     * @param  {string}             options.turn.username          WebRTC TURN servers username.
     * @param  {string}             options.turn.credential        WebRTC TURN servers password.
     * @param  {boolean}            options.turn.default           Whether or not we should use the TURN servers by default. Default: false.
     * @param  {string}             options.giveFeedbackLink       URL to the feedback form. Default: 'https://github.com/orgs/Genymobile/discussions'
     * @param  {Object}             RendererClass                  Class to be instanciated. Defaults to DeviceRenderer.
     * @return {Array}                                             An array of API for device renderer instance, see return of APIManager.getExposedApiFunctions.
     */
    setupRenderer(dom, webRTCUrl, options, RendererClass = DeviceRenderer) {
        if (typeof dom === 'string') {
            dom = document.getElementById(dom);
        }

        if (typeof options === 'undefined') {
            options = {};
        }
        options = defaultsDeep(options, defaultOptions);
        options.webRTCUrl = webRTCUrl;
        // if we have at least one button to setup, we will instantiate the "buttons" plugin
        options.buttons = options.volume || options.rotation || options.navbar || options.power;

        log.debug('Creating genymotion display on ' + webRTCUrl);
        dom.classList.add('device-renderer-instance');
        this.loadTemplate(dom, options);

        const instance = new RendererClass(dom, options);
        store(instance);

        // Add a class to the wrapper when we are waiting for the stream to be ready in order to display a loader
        instance.store.subscribe(({isWebRTCConnectionReady}) => {
            if (isWebRTCConnectionReady) {
                instance.wrapper.classList.remove('waitingForStream');
            } else {
                instance.wrapper.classList.add('waitingForStream');
            }
        });

        instance.apiManager = new APIManager(instance);
        instance.toolbarManager = new ToolbarManager(instance);

        this.instances.push(instance);

        this.loadPlugins(instance);
        this.loadToolbar(instance);
        instance.onWebRTCReady();

        return instance.apiManager.getExposedApiFunctions();
    }

    /**
     * Loads HTML template.
     *
     * @param  {HTMLElement}        dom       The DOM element to setup the device renderer into.
     * @param  {Object}             options   Various configuration options.
     */
    loadTemplate(dom, options) {
        dom.innerHTML = `
        <div class="gm-wrapper waitingForStream ${options.showPhoneBorder ? 'phoneBorder' : ''} 
        toolbarPosition-${options.toolbarPosition}">
            <div class="gm-video-wrapper">
                <video class="gm-video" autoplay preload="none">Your browser does not support the VIDEO tag</video>
                ${options.showPhoneBorder ? '<div class="gm-phone-button"></div>' : ''}
            </div>
            <div class="gm-toolbar-wrapper">
                <div class="gm-toolbar">
                    <ul></ul>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Initialize all the needed plugins.
     *
     * @param  {DeviceRenderer}     instance The DeviceRenderer instance reference to link into each plugin.
     * @param  {Object}             options  Various configuration options.
     */
    loadPlugins(instance) {
        /*
         * Load instance dedicated plugins
         */

        const pluginInitMap = [];

        if (typeof instance.getPlugins === 'function') {
            const plugins = instance.getPlugins();
            if (Array.isArray(plugins)) {
                pluginInitMap.push(...plugins);
            }
        }

        const dependenciesLoaded = new Map();
        pluginInitMap.forEach((plugin) => {
            const args = plugin.params || [];

            if (plugin.enabled) {
                // load dependencies
                if (plugin.dependencies) {
                    plugin.dependencies.forEach((Dep) => {
                        if (dependenciesLoaded.has(Dep)) {
                            return;
                        }

                        new Dep(instance);
                        dependenciesLoaded.set(Dep, true);
                    });
                }
                // eslint-disable-next-line no-unused-expressions
                if (plugin.class) {
                    new plugin.class(instance, ...args);
                }
            }
        });
    }

    /**
     * Load toolbar buttons in the specified order:
     * Buttons listed in options.toolbarOrder will be rendered in the specified sequence.
     * Buttons not included in options.toolbarOrder will be added at the end of the toolbar.
     * If the keyword 'unordered' is specified in options.toolbarOrder, unlisted buttons will be inserted at the position of 'unordered'.
     * @param {DeviceRenderer} instance The DeviceRenderer instance.
     */
    loadToolbar(instance) {
        const {toolbarOrder} = instance.options;
        const orderMap = new Map(toolbarOrder.map((name, index) => [name, index]));

        const orderedButtons = [];
        const unorderedButtons = [];

        instance.toolbarManager.buttonRegistry.forEach((value, key) => {
            const order = orderMap.get(key);
            if (typeof order !== 'undefined') {
                orderedButtons.push({key, value, order});
            } else {
                unorderedButtons.push({key, value});
            }
        });

        toolbarOrder.forEach((name, index) => {
            if (name === 'separator') {
                orderedButtons.push({
                    key: `separator-${index}`,
                    value: 'separator',
                    order: index,
                });
            }
        });

        orderedButtons.sort((a, b) => a.order - b.order);

        const sortedToolbarItems = [];
        if (toolbarOrder.includes('unordered')) {
            const unOrderedIndex = toolbarOrder.findIndex((name) => name === 'unordered');
            sortedToolbarItems.push(
                ...orderedButtons.slice(0, unOrderedIndex),
                ...unorderedButtons,
                ...orderedButtons.slice(unOrderedIndex),
            );
        } else {
            sortedToolbarItems.push(...orderedButtons, ...unorderedButtons);
        }

        sortedToolbarItems.forEach(({key, value}) => {
            if (value === 'separator') {
                instance.toolbarManager.renderSeparator(key);
            } else {
                instance.toolbarManager.renderButton(key);
            }
        });
    }
};
