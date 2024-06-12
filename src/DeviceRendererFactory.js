'use strict';

const DeviceRenderer = require('./DeviceRenderer');
const defaultsDeep = require('lodash/defaultsDeep');

const store = require('./store');
const APIManager = require('./APIManager');

const log = require('loglevel');
log.setDefaultLevel('debug');

// Templates are loaded dynamically from the `templates` folder
const TEMPLATE_JS = 'device-renderer-js';
const TEMPLATE_CSS = 'device-renderer-css';

// Default options
const defaultOptions = {
    template: 'renderer',
    touch: true,
    mouse: true,
    volume: true,
    rotation: true,
    navbar: true,
    power: true,
    keyboard: true,
    fullscreen: true,
    camera: true,
    microphone: false,
    fileUpload: true,
    streamBitrate: false,
    clipboard: true,
    battery: true,
    gps: true,
    gpsSpeedSupport: false,
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
    translateHomeKey: false,
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
        /* global GEN_TEMPLATES */
        this.templates = GEN_TEMPLATES;
    }

    /**
     * Setup a device renderer instance in the given dom element, for the device instance identified by its instanceWebRTCUrl.
     *
     * @param  {HTMLElement|string} dom                            The DOM element (or its ID) to setup the device renderer into.
     * @param  {string}             webRTCUrl                      WebRTC URL of the instance.
     * @param  {Object}             options                        Various configuration options.
     * @param  {string}             options.template               Template to use. Default: 'renderer'.
     * @param  {boolean}            options.touch                  Touch support activated. Default: true.
     * @param  {boolean}            options.mouse                  Mouse support activated. Default: true.
     * @param  {boolean}            options.volume                 Audio volume control support activated. Default: true.
     * @param  {boolean}            options.rotation               Screen rotation support activated. Default: true.
     * @param  {boolean}            options.navbar                 Android navbar support activated. Default: true.
     * @param  {boolean}            options.power                  Power control support activated. Default: true.
     * @param  {boolean}            options.keyboard               Keyboad support activated. Default: true.
     * @param  {boolean}            options.fullscreen             Fullscreen support activated. Default: true.
     * @param  {boolean}            options.camera                 Camera support activated. Default: true.
     * @param  {boolean}            options.microphone             Microphone support activated. Default: false.
     * @param  {boolean}            options.fileUpload             File upload support activated. Default: true.
     * @param  {string}             options.fileUploadUrl          File upload URL. Required if fileUpload===true.
     * @param  {boolean}            options.streamBitrate          Stream bitrate control support activated. Default: false.
     * @param  {boolean}            options.clipboard              Clipboard forwarding support activated. Default: true.
     * @param  {boolean}            options.battery                Battery support activated. Default: true.
     * @param  {boolean}            options.gps                    GPS support activated. Default: true.
     * @param  {boolean}            options.gpsSpeedSupport        GPS speed support activated. Default: false.
     * @param  {boolean}            options.capture                Screen capture support activated. Default: true.
     * @param  {boolean}            options.identifiers            Identifiers (IMEI, etc...) support activated. Default: true.
     * @param  {boolean}            options.network                Network throttling support activated. Default: true.
     * @param  {boolean}            options.mobilethrottling       Mobile throttling support activated. Default: false.
     * @param  {boolean}            options.baseband               Baseband controll support activated. Default: false.
     * @param  {boolean}            options.phone                  Baseband support activated. Default: true.
     * @param  {boolean}            options.streamResolution       Stream resolution control support activated. Default: true.
     * @param  {boolean}            options.diskIO                 Disk I/O throttling support activated. Default: true.
     * @param  {boolean}            options.gamepad                Experimental gamepad support activated. Default: false.
     * @param  {boolean}            options.translateHomeKey       Whether or not the HOME key button should be decompose to META + ENTER. Default: false.
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
        dom.classList.add('gm-template-' + options.template);
        document.body.classList.add('gm-template-' + options.template + '-body');

        // Load template before creating the Device Renderer that is using HTML elements
        this.loadTemplate(dom, this.templates[options.template], options);

        const instance = new RendererClass(dom, options);
        store(instance);

        instance.apiManager = new APIManager(instance);

        this.instances.push(instance);

        this.addPlugins(instance);
        instance.onWebRTCReady();

        return instance.apiManager.getExposedApiFunctions();
    }

    /**
     * Loads the selected template.
     *
     * @param  {HTMLElement}        dom       The DOM element to setup the device renderer into.
     * @param  {string}             template  Template to use.
     * @param  {Object}             options   Various configuration options.
     */
    loadTemplate(dom, template, options) {
        const head = document.getElementsByTagName('head')[0];
        const scriptId = TEMPLATE_JS + '-' + options.template;
        const styleId = TEMPLATE_CSS + '-' + options.template;

        // Handle template JS
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.text = template.js;
            head.appendChild(script);
        }

        // Handle template CSS
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.appendChild(document.createTextNode(template.css));
            head.appendChild(style);
        }

        // Handle template dom
        dom.innerHTML = template.html;
    }

    /**
     * Initialize all the needed plugins.
     *
     * @param  {DeviceRenderer}     instance The DeviceRenderer instance reference to link into each plugin.
     * @param  {Object}             options  Various configuration options.
     */
    addPlugins(instance) {
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

        const dependenciesLoaded = [];
        pluginInitMap.forEach((plugin) => {
            const args = plugin.params || [];

            if (plugin.enabled) {
                // load dependencies
                if (plugin.dependencies) {
                    plugin.dependencies.forEach((Dep) => {
                        if (dependenciesLoaded.indexOf(Dep.name) !== -1) {
                            return;
                        }
                        new Dep(instance);
                        dependenciesLoaded.push(Dep.name);
                    });
                }
                // eslint-disable-next-line no-unused-expressions
                plugin.class && new plugin.class(instance, ...args);
            }
        });
    }
};
