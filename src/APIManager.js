'use strict';

module.exports = class APIManager {
    constructor(instance) {
        this.instance = instance;
        this.apiFunctions = {};

        // record fn to send data to instance
        this.registerFunction(
            'sendData',
            (json) => {
                this.instance.sendEvent(json);
            },
            'send data to WS messages of player, must be a JSON object. Example: {type: "MOUSE_PRESS", x: 100, y: 100}',
        );

        // record fn to get registered functions
        this.registerFunction(
            'getRegisteredFunctions',
            () => this.getRegisteredFunctions(),
            'list all registered functions',
        );

        // record fn to get registered functions
        this.registerFunction(
            'addEventListener',
            (event, fn) => {
                return this.addEventListener(event, fn);
            },
            'attach event listener to WS messages of player',
        );

        // record fn to disconnect from the instance
        this.registerFunction(
            'disconnect',
            () => {
                this.instance.disconnect();
            },
            'disconnect from the instance',
        );
    }

    registerFunction(name, fn, description = '') {
        if (this.apiFunctions[name]) {
            throw new Error(`Function ${name} is already registered.`);
        }
        this.apiFunctions[name] = {
            fn,
            description,
        };
    }
    addEventListener(event, fn) {
        // expose listener to ws instance
        this.instance.registerEventCallback(event, fn);
    }

    getRegisteredFunctions() {
        const exposedFunctionsDescription = Object.entries(this.apiFunctions).reduce((acc, val) => {
            acc[val[0]] = val[1].description;
            return acc;
        }, {});
        return exposedFunctionsDescription;
    }

    /**
     * Get exposed API functions
     * @returns {Array} list of api {apiName: string, apiDescription: string}
     */
    getExposedApiFunctions() {
        const exposedFunctions = Object.entries(this.apiFunctions).reduce((acc, val) => {
            acc[val[0]] = val[1].fn;
            return acc;
        }, {});
        return exposedFunctions;
    }
};
