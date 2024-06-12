'use strict';

/**
 * List of available network profiles to send to the VM
 * for android versions greater or equal to 8
 */
module.exports = [
    {
        id: 7,
        name: '5g',
        label: '5G',
    },
    {
        id: 6,
        name: 'lte',
        label: '4G LTE',
    },
    {
        id: 5,
        name: 'hsdpa',
        label: '3G HSDPA',
    },
    {
        id: 4,
        name: 'umts',
        label: '3G UMTS',
    },
    {
        id: 3,
        name: 'edge',
        label: '2G EDGE',
    },
    {
        id: 2,
        name: 'gprs',
        label: '2G GPRS',
    },
    {
        id: 1,
        name: 'gsm',
        label: '2G GSM',
    },
    {
        id: 0,
        name: 'none',
        label: 'Unlimited',
    },
];
