'use strict';
const {generateUID} = require('../utils/helpers');

const initialState = {
    isWebRTCConnectionReady: false,
};

const createStore = (instance, reducer, state) => {
    const listeners = [];

    const getState = () => instance.store.state;

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
            cb: () => listener(getState())
        });

        const unsubscribe = () => {
            const index = listeners.findIndex(({uid: internalUID}) => internalUID === uid);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        };

        return unsubscribe;
    };

    instance.store = {state, getState, dispatch, subscribe};
};

const reducer = (state, action) => {
    switch (action.type) {
    case 'WEBRTC_CONNECTION_READY':
        return {...state, isWebRTCConnectionReady: action.payload};
    default:
        return state;
    }
};

const store = (instance) => {
    createStore(instance, reducer, initialState);
};

module.exports = store;

