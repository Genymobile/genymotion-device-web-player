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
    isKeyboardEventsEnabled: false,
    isMouseEventsEnabled: false,
};

const createStore = (instance, reducer, state) => {
    const listeners = [];

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
            cb: () => listener(instance.store.state),
        });

        const unsubscribe = () => {
            const index = listeners.findIndex(({uid: internalUID}) => internalUID === uid);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        };

        return unsubscribe;
    };

    instance.store = {state, dispatch, subscribe, getters};
};

const reducer = (state, action) => {
    let newState = state;
    switch (action.type) {
        case 'WEBRTC_CONNECTION_READY':
            newState = {...state, isWebRTCConnectionReady: action.payload};
            break;
        case 'KEYBOARD_EVENTS_ENABLED':
            newState = {...state, isKeyboardEventsEnabled: action.payload};
            break;
        case 'MOUSE_EVENTS_ENABLED':
            newState = {...state, isMouseEventsEnabled: action.payload};
            break;
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
            newState = {
                ...state,
                overlay: {
                    isOpen: widgetOpened.length > 0,
                    widgetOpened,
                },
                isKeyboardEventsEnabled: true,
            };
            break;
        default:
            log.debug('Store not updated, action type :', action.type, ' unknown');
            break;
    }

    log.debug('Store updated below type - payload - result', action.type, action.payload, newState);

    return newState;
};

const store = (instance) => {
    createStore(instance, reducer, initialState);
};

module.exports = store;
