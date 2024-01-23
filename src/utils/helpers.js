'use strict';

function generateUID() {
    const date = Date.now().toString(36);
    const part1 = date.substring(date.length - 5);
    const part2 = Math.random().toString(36)
        .substring(2, 7);
    return part1 + part2;
}

module.exports = {
    generateUID
};
