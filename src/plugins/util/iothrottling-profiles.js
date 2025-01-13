'use strict';

/**
 * List of available IO throttling profiles to send to VM
 *
 * readByteRate: The total rate in MegaBytes of read per second
 * writeByteRate: The total rate in MegaBytes of write per second
 * readIoRate: The number of read operation allowed per second
 * writeIoRate: The number of write operation allowed per second
 *
 */
module.exports = [
    {
        name: 'None',
        label: '(No disk performance alteration)',
        readByteRate: 0,
    },
    {
        name: 'High-end device',
        label: '(200 MiB per second)',
        readByteRate: 200,
    },
    {
        name: 'Mid-range device',
        label: '(100 MiB per second)',
        readByteRate: 100,
    },
    {
        name: 'Low-end device',
        label: '(50 MiB per second)',
        readByteRate: 50,
    },
    {
        name: 'Custom',
    },
];
