'use strict';

/**
 * List of available network profiles to send to VM
 */
module.exports = [
    {
        id: 8,
        name: 'wifi',
        label: 'Wifi',
        downSpeed: {
            label: '40.0Mb/s',
            value: 40000,
        },
        downDelay: {
            label: '0ms',
            value: 0,
        },
        downPacketLoss: {
            label: '0%',
            value: 0.0,
        },
        upSpeed: {
            label: '33.0Mb/s',
            value: 33000,
        },
        upDelay: {
            label: '0ms',
            value: 0,
        },
        upPacketLoss: {
            label: '0%',
            value: 0.0,
        },
        dnsDelay: {
            label: '0ms',
            value: 0,
        },
    },
    {
        id: 7,
        name: '4g_with_loss',
        label: '4G (High packet losses)',
        downSpeed: {
            label: '17.9Mb/s',
            value: 17900,
        },
        downDelay: {
            label: '50ms',
            value: 50,
        },
        downPacketLoss: {
            label: '10%',
            value: 10.0,
        },
        upSpeed: {
            label: '5.5Mb/s',
            value: 5500,
        },
        upDelay: {
            label: '50ms',
            value: 50,
        },
        upPacketLoss: {
            label: '10%',
            value: 10.0,
        },
        dnsDelay: {
            label: '100ms',
            value: 100,
        },
    },
    {
        id: 6,
        name: '4g_with_delay',
        label: '4G (High DNS delay)',
        downSpeed: {
            label: '17.9Mb/s',
            value: 17900,
        },
        downDelay: {
            label: '50ms',
            value: 50,
        },
        downPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        upSpeed: {
            label: '5.5Mb/s',
            value: 5500,
        },
        upDelay: {
            label: '50ms',
            value: 50,
        },
        upPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        dnsDelay: {
            label: '3000ms',
            value: 3000,
        },
    },
    {
        id: 5,
        name: '4g',
        label: '4G',
        downSpeed: {
            label: '17.9Mb/s',
            value: 17900,
        },
        downDelay: {
            label: '50ms',
            value: 50,
        },
        downPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        upSpeed: {
            label: '5.5Mb/s',
            value: 5500,
        },
        upDelay: {
            label: '50ms',
            value: 50,
        },
        upPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        dnsDelay: {
            label: '100ms',
            value: 100,
        },
    },
    {
        id: 4,
        name: '3g',
        label: '3G',
        downSpeed: {
            label: '7.2Mb/s',
            value: 7200,
        },
        downDelay: {
            label: '100ms',
            value: 100,
        },
        downPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        upSpeed: {
            label: '1.5Mb/s',
            value: 1500,
        },
        upDelay: {
            label: '100ms',
            value: 100,
        },
        upPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        dnsDelay: {
            label: '200ms',
            value: 200,
        },
    },
    {
        id: 3,
        name: 'edge',
        label: 'EDGE',
        downSpeed: {
            label: '240Kb/s',
            value: 240,
        },
        downDelay: {
            label: '400ms',
            value: 400,
        },
        downPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        upSpeed: {
            label: '200Kb/s',
            value: 200,
        },
        upDelay: {
            label: '400ms',
            value: 400,
        },
        upPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        dnsDelay: {
            label: '800ms',
            value: 800,
        },
    },
    {
        id: 2,
        name: 'gprs',
        label: 'GPRS',
        downSpeed: {
            label: '40Kb/s',
            value: 40,
        },
        downDelay: {
            label: '500ms',
            value: 500,
        },
        downPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        upSpeed: {
            label: '40Kb/s',
            value: 40,
        },
        upDelay: {
            label: '500ms',
            value: 500,
        },
        upPacketLoss: {
            label: '0.01%',
            value: 0.01,
        },
        dnsDelay: {
            label: '1000ms',
            value: 1000,
        },
    },
    {
        id: 1,
        name: 'no_data',
        label: 'No data',
        downSpeed: {
            label: '0Kb/s',
            value: 0,
        },
        downDelay: {
            label: '0ms',
            value: 0,
        },
        downPacketLoss: {
            label: '0%',
            value: 0.0,
        },
        upSpeed: {
            label: '0Kb/s',
            value: 0,
        },
        upDelay: {
            label: '0ms',
            value: 0,
        },
        upPacketLoss: {
            label: '0%',
            value: 0.0,
        },
        dnsDelay: {
            label: '0ms',
            value: 0,
        },
    },
    {
        id: 0,
        name: 'native',
        label: 'Native',
        downSpeed: {
            label: 'N/A',
            value: Infinity,
        },
        downDelay: {
            label: 'N/A',
            value: 0,
        },
        downPacketLoss: {
            label: 'N/A',
            value: 0,
        },
        upSpeed: {
            label: 'N/A',
            value: Infinity,
        },
        upDelay: {
            label: 'N/A',
            value: 0,
        },
        upPacketLoss: {
            label: 'N/A',
            value: 0,
        },
        dnsDelay: {
            label: 'N/A',
            value: 0,
        },
    },
];
