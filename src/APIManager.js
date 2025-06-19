'use strict';

module.exports = class APIManager {
    constructor(instance) {
        this.instance = instance;
        this.apiFunctions = {};

        // Register a function to send data to the instance
        this.registerFunction({
            name: 'sendData',
            category: 'VM_communication',
            fn: (json) => {
                this.instance.sendEvent(json);
            },
            description:
                // eslint-disable-next-line max-len
                'Send data to the instance using WebSocket messages. The data must be a JSON object. Example usage: {type: "MOUSE_PRESS", x: 100, y: 100}',
        });

        // Register a function to add an event listener
        this.registerFunction({
            name: 'addEventListener',
            category: 'VM_communication',
            fn: (event, fn) => {
                return this.instance.registerEventCallback(event, fn);
            },
            description:
                // eslint-disable-next-line max-len
                'Add an event listener for WebSocket messages from the instance. The listener will be triggered whenever the specified event occurs.',
        });

        // Register a function to disconnect from the instance
        this.registerFunction({
            name: 'disconnect',
            category: 'VM_communication',
            fn: () => {
                this.instance.destroy();
            },
            description:
                // eslint-disable-next-line max-len
                'Disconnect from the current instance, clearing all registered listeners and ending the WebSocket communication.',
        });

        // Register a function to get all registered functions
        this.registerFunction({
            name: 'getRegisteredFunctions',
            category: 'utils',
            fn: () => this.getRegisteredFunctions(),
            description: 'Retrieve a list of all registered API functions with their descriptions.',
        });

        // Register a function to enable or disable tracking of events
        this.registerFunction({
            name: 'enableTrackEvents',
            category: 'analytics',
            fn: (isActive) => {
                this.instance.store.dispatch({type: 'ENABLE_TRACKED_EVENTS', payload: isActive});
                if (!isActive) {
                    this.instance.store.dispatch({type: 'FLUSH_TRACKED_EVENTS'});
                }
            },
            description:
                'Enable or disable the tracking of analytic events. If disabled, all tracked events will be cleared.',
        });

        // Register open a widget
        this.registerFunction({
            name: 'openWidget',
            category: 'widget',
            fn: (widgetName) => {
                this.instance.store.dispatch({
                    type: 'OVERLAY_OPEN',
                    payload: {
                        overlayID: widgetName,
                        toOpen: true,
                    },
                });
            },
            description: 'Open the modal of a widget by specifying its constructor name.',
        });

        // Register close a widget
        this.registerFunction({
            name: 'closeWidget',
            category: 'widget',
            fn: (widgetName) => {
                this.instance.store.dispatch({
                    type: 'OVERLAY_OPEN',
                    payload: {
                        overlayID: widgetName,
                        toOpen: false,
                    },
                });
            },
            description: 'Close the modal of a widget by specifying its constructor name.',
        });

        // Register a function to process tracked events
        this.registerFunction({
            name: 'trackEvents',
            category: 'analytics',
            fn: (cb) => {
                // Subscribe to store's TRACKEVENT changes
                this.instance.store.subscribe(
                    ({trackedEvents}) => {
                        if (this.instance.store.state.trackedEvents.events.length) {
                            cb([...trackedEvents.events]);
                            // Flush the tracked events
                            this.instance.store.dispatch({type: 'FLUSH_TRACKED_EVENTS'});
                        }
                    },
                    ['trackedEvents.events'],
                );
            },
            description:
                // eslint-disable-next-line max-len
                'Invoke a callback function with an array of tracked events. This function is called whenever a new event is recorded.',
        });
    }

    // Register a new API function with its name, category, function, and description
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
     * Get the description of exposed API functions
     * @returns {Array} List of API descriptions {apiName: string, apiDescription: string}
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
     * @returns {Array} List of API functions {apiName: fn}
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
