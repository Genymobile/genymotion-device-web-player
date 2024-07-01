'use strict';

module.exports = class APIManager {
    constructor(instance) {
        this.instance = instance;
        this.apiFunctions = {};

        // record fn to send data to instance
        this.registerFunction({
            name: 'sendData',
            category: 'VM_communication',
            fn: (json) => {
                this.instance.sendEvent(json);
            },
            description: `send data to WS messages of player, must be a JSON object. 
                Example: {type: "MOUSE_PRESS", x: 100, y: 100}`,
        });

        // record fn to get registered functions
        this.registerFunction({
            name: 'getRegisteredFunctions',
            category: 'utils',
            fn: () => this.getRegisteredFunctions(),
            description: 'list all registered functions',
        });

        // record fn to get registered functions
        this.registerFunction({
            name: 'addEventListener',
            category: 'VM_communication',
            fn: (event, fn) => {
                return this.instance.addEventListener(event, fn);
            },
            description: 'attach event listener to WS messages of player',
        });

        // record fn to disconnect from the instance
        this.registerFunction({
            name: 'disconnect',
            category: 'VM_communication',
            fn: () => {
                this.instance.disconnect();
            },
            description: 'disconnect from the instance',
        });
    }

    registerFunction({name, category = 'global', fn, description = ''}) {
        if (this.apiFunctions[`${category}_${name}`]) {
            throw new Error(`Function ${name} for category ${category} is already registered.`);
        }
        this.apiFunctions[`${category}_${name}`] = {
            fn,
            category,
            description,
            name,
        };
    }

    /**
     * Get exposed API description
     * @returns {Array} list of api description {apiName: string, apiDescription: string}
     */
    getRegisteredFunctions() {
        const exposedFunctionsDescription = Object.entries(this.apiFunctions).reduce((acc, val) => {
            acc[val[1].name] = val[1].description;
            return acc;
        }, {});
        return exposedFunctionsDescription;
    }

    /**
     * Get exposed API functions
     * @returns {Array} list of api fn {apiName: fn}
     */
    getExposedApiFunctions() {
        const exposedFunctions = Object.entries(this.apiFunctions).reduce((acc, val) => {
            const {name, category, fn} = val[1];

            if (!acc[category]) {
                acc[category] = {};
            }
            acc[category][name] = fn;
            return acc;
        }, {});
        return exposedFunctions;
    }
};
