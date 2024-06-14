'use strict';
const {generateUID} = require('../utils/helpers');
const log = require('loglevel');
log.setDefaultLevel('debug');

const initialState = {
    isWebRTCConnectionReady: false,
    overlay: {
        isOpen: false,
        widgetOpened: [],
    },
    isKeyboardEventsEnabled: true,
};

const createStore = (instance, reducer, state) => {
    const listeners = [];

    const getState = () => instance.store.state;

    const getters = {
        isWidgetOpened: (overlayID) =>
            instance.store.state.overlay.isOpen && instance.store.state.overlay.widgetOpened.includes(overlayID),
    };

    const dispatch = (action) => {
        instance.store.state = reducer(instance.store.state, action);
        listeners.forEach(({cb}) => {
            cb();
        });
    };

    const subscribe = (listener) => {
        const uid = generateUID();
        listeners.push({
            uid,
            cb: () => listener(getState()),
        });

        const unsubscribe = () => {
            const index = listeners.findIndex(({uid: internalUID}) => internalUID === uid);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        };

        return unsubscribe;
    };

    instance.store = {state, getState, dispatch, subscribe, getters};
};

const reducer = (state, action) => {
    log.debug('Store updated', action.type, action.payload);

    switch (action.type) {
        case 'WEBRTC_CONNECTION_READY':
            return {...state, isWebRTCConnectionReady: action.payload};
        case 'KEYBOARD_EVENTS_ENABLED':
            return {...state, isKeyboardEventsEnabled: action.payload};
        case 'OVERLAY_OPEN':
            // eslint-disable-next-line no-case-declarations
            const {overlayID, toOpen} = action.payload;
            if (toOpen) {
                return {
                    ...state,
                    overlay: {
                        isOpen: true,
                        widgetOpened: [overlayID],
                        /*
                         * to open several widgets at the same time
                         * widgetOpened: [...state.overlay.widgetOpened, overlayID],
                         */
                    },
                    isKeyboardEventsEnabled: false,
                };
            }
            // eslint-disable-next-line no-case-declarations
            const widgetOpened = [];
            /*
             *  to open several widgets at the same time
             * const widgetOpened = state.overlay.widgetOpened.filter((widgetId) => widgetId !== overlayID);
             */
            return {
                ...state,
                overlay: {
                    isOpen: widgetOpened.length > 0,
                    widgetOpened,
                },
                isKeyboardEventsEnabled: true,
            };

        default:
            return state;
    }
};

const store = (instance) => {
    createStore(instance, reducer, initialState);
};

module.exports = store;
