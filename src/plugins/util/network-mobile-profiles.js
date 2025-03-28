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
        icon: 'five-G',
    },
    {
        id: 6,
        name: 'lte',
        label: '4G LTE',
        icon: 'four-G',
    },
    {
        id: 5,
        name: 'hsdpa',
        label: '3G HSDPA',
        icon: 'three-G',
    },
    {
        id: 4,
        name: 'umts',
        label: '3G UMTS',
        icon: 'three-G',
    },
    {
        id: 3,
        name: 'edge',
        label: '2G EDGE',
        icon: 'two-G-edge',
    },
    {
        id: 2,
        name: 'gprs',
        label: '2G GPRS',
        icon: 'two-G-gprs',
    },
    {
        id: 1,
        name: 'gsm',
        label: '2G GSM',
        icon: 'two-G-gsm',
    },
    {
        id: 0,
        name: 'none',
        label: 'Unlimited',
        icon: 'unlimited',
    },
];
