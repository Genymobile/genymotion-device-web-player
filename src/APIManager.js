'use strict';

class APIManager {
    constructor() {
        this.apiFunctions = {};
    }

    registerFunction(name, fn) {
        if (this.apiFunctions[name]) {
            throw new Error(`Function ${name} is already registered.`);
        }
        this.apiFunctions[name] = fn;
    }
}

const apiManager = new APIManager();
module.exports = apiManager;
