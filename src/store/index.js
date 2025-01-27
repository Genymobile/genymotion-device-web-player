'use strict';
const {generateUID} = require('../utils/helpers');
const log = require('loglevel');
log.setDefaultLevel('debug');

const initialState = {
    isWebRTCConnectionReady: false,
    overlay: {
        isOpen: false,
        widgetsOpened: [],
    },
    isKeyboardEventsEnabled: false,
    isMouseEventsEnabled: false,
    trackedEvents: {
        isActive: false,
        events: [],
    },
};

const createStore = (instance, reducer) => {
    const listeners = [];

    const getters = {
        isWidgetOpened: (overlayID) =>
            instance.store.state.overlay.isOpen && instance.store.state.overlay.widgetsOpened.includes(overlayID),
    };

    const hasChanged = (changedKeys, keyPath) => {
        const keys = keyPath.split('.');
        return changedKeys.some((changedKey) => {
            const changedKeyParts = changedKey.split('.');
            return keys.every((key, index) => key === changedKeyParts[index]);
        });
    };

    const findChangedKeys = (newState, oldState, path = []) => {
        let changedKeys = [];

        const isObject = (obj) => obj && typeof obj === 'object';

        for (const key in newState) {
            const fullPath = [...path, key].join('.');

            if (!Object.prototype.hasOwnProperty.call(oldState, key)) {
                changedKeys.push(fullPath);
            } else if (isObject(newState[key]) && isObject(oldState[key])) {
                if (Array.isArray(newState[key]) && Array.isArray(oldState[key])) {
                    if (newState[key].length !== oldState[key].length) {
                        changedKeys.push(fullPath);
                    } else {
                        let arrayHasChanged = false;
                        for (let i = 0; i < newState[key].length; i++) {
                            if (newState[key][i] !== oldState[key][i]) {
                                arrayHasChanged = true;
                            }
                        }
                        if (arrayHasChanged) {
                            changedKeys.push(fullPath);
                        }
                    }
                } else {
                    changedKeys = changedKeys.concat(findChangedKeys(newState[key], oldState[key], [...path, key]));
                }
            } else if (newState[key] !== oldState[key]) {
                changedKeys.push(fullPath);
            }
        }

        return changedKeys;
    };

    const notifyListeners = (changedKeys) => {
        listeners.forEach(({keys, cb}) => {
            if (keys.length === 0 || keys.some((key) => hasChanged(changedKeys, key))) {
                // send a copy of the store's state, in order to avoid mutation of the store
                cb({...instance.store.state});
            }
        });
    };

    const dispatch = (action) => {
        const previousState = JSON.parse(JSON.stringify(instance.store.state));
        instance.store.state = reducer({...instance.store.state}, action);
        const changedKeys = findChangedKeys(instance.store.state, previousState);
        notifyListeners(changedKeys);
    };

    const subscribe = (listener, keys = []) => {
        const uid = generateUID();
        listeners.push({
            uid,
            keys,
            cb: listener,
        });

        const unsubscribe = () => {
            const index = listeners.findIndex(({uid: internalUID}) => internalUID === uid);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        };

        return unsubscribe;
    };

    instance.store = {state: initialState, dispatch, subscribe, getters};
};

const reducer = (state, action) => {
    switch (action.type) {
        case 'WEBRTC_CONNECTION_READY':
            state.isWebRTCConnectionReady = action.payload;
            break;
        case 'KEYBOARD_EVENTS_ENABLED':
            state.isKeyboardEventsEnabled = action.payload;
            break;
        case 'MOUSE_EVENTS_ENABLED':
            state.isMouseEventsEnabled = action.payload;
            break;
        case 'OVERLAY_OPEN':
            // eslint-disable-next-line no-case-declarations
            const {overlayID, toOpen = null} = action.payload;
            // eslint-disable-next-line no-case-declarations
            const shouldOpenOverlay = toOpen === null ? !state.overlay.widgetsOpened.includes(overlayID) : toOpen;

            if (shouldOpenOverlay) {
                // Open
                state.overlay.isOpen = true;
                /*
                 * to open several widgets at the same time
                 * widgetsOpened: [...state.overlay.widgetsOpened, overlayID],
                 */
                state.overlay.widgetsOpened = [overlayID];
                state.isKeyboardEventsEnabled = false;
                state.isMouseEventsEnabled = false;
            } else {
                // Close
                state.overlay.isOpen = false;
                state.overlay.widgetsOpened = [];
                state.isKeyboardEventsEnabled = true;
                state.isMouseEventsEnabled = true;
            }
            break;
        case 'ENABLE_TRACKED_EVENTS':
            state.trackedEvents.isActive = action.payload;
            break;
        case 'ADD_TRACKED_EVENT':
            if (!state.trackedEvents.isActive) {
                return state;
            }
            state.trackedEvents.events.push(action.payload);

            break;
        case 'FLUSH_TRACKED_EVENTS':
            state.trackedEvents.events.length = 0;
            break;
        default:
            log.debug('Store not updated, action type :', action.type, ' unknown');
            break;
    }

    log.debug('Store updated below type - payload - result', action.type, action.payload, state);

    return state;
};

const store = (instance) => {
    createStore(instance, reducer);
};

module.exports = store;
