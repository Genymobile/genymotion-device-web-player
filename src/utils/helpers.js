export function generateUID() {
    const date = Date.now().toString(36);
    const part1 = date.substring(date.length - 5);
    const part2 = Math.random().toString(36).substring(2, 7);
    return part1 + part2;
}

/**
 * Whether the current browser is Safari (desktop or iOS). Excludes Chrome/Chromium
 * derivatives and Android, which report a "Safari" token in their user agent.
 *
 * @param  {string}  userAgent Optional user agent string (defaults to navigator.userAgent).
 * @return {boolean}           True when running on Safari.
 */
export function isSafariBrowser(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent || '') {
    return /Safari/i.test(userAgent) && !/Chrome|CriOS|Chromium|Android/i.test(userAgent);
}
