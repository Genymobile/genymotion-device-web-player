'use strict';
const { generateUuid } = require('../utils/uuid');

const initialState = {
    isWebRTCReady: false,
};

const createStore = (instance, reducer, initialState) => {


    const listeners = [];

    const getState = () => instance.store.state;

    const dispatch = (action) => {
        instance.store.state = reducer(instance.store.state, action);
        listeners.forEach(({cb}) => cb());
    };

    const subscribe = listener => {
        const uuid = generateUuid();
        listeners.push({
            uuid,
            cb: ()=>listener(getState())
        });

        const unsubscribe =  () => {
            const index = listeners.findIndex(({uuid}) => uuid === uuid);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        };

        return unsubscribe;
    };

    instance.store = { state: initialState, getState, dispatch, subscribe };
};

const reducer = (state, action) => {
    switch (action.type) {
        
        case 'SET_WEBRTC_READY':  
            return {...state, isWebRTCReady: action.payload};
        default:
            return state;
    }
};

const store = (instance) => { createStore(instance, reducer, initialState)};

module.exports = store;

