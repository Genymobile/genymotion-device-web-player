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
module.exports = [{
    name: 'High-end device',
    label: 'High-end device',
    readByteRate: 200,
}, {
    name: 'Mid-range device',
    label: 'Mid-range device',
    readByteRate: 100,
}, {
    name: 'Low-end device',
    label: 'Low-end device',
    readByteRate: 50,
}, {
    name: 'Custom',
    label: 'Custom device',
}];
