'use strict';

/**
 * List of available network profiles to send to the VM 
 * for android versions greater or equal to 8
 */
module.exports = [{
    id: 7,
    name: '5g',
    label: '5G',
}, {
    id: 6,
    name: 'lte',
    label: '4G',
}, {
    id: 5,
    name: 'hsdpa',
    label: '3G+',
}, {
    id: 4,
    name: 'umts',
    label: '3G',
}, {
    id: 3,
    name: 'edge',
    label: 'EDGE',
}, {
    id: 2,
    name: 'gprs',
    label: 'GPRS',
}, {
    id: 1,
    name: 'gsm',
    label: 'GSM',
}, {
    id: 0,
    name: 'none',
    label: 'Unlimited',
}];
