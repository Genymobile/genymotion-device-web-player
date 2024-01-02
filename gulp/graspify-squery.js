'use strict';

const grasp = require('grasp');
const transformTools = require('browserify-transform-tools');

const options = {
    jsFilesOnly: true,
};

/**
 * String transform is called per-module.
 * In that, as many `require` calls you have, that many times it is called.
 * If you replace `require` call, transform for that module won't be called.
 *
 * Transform can be called globally as `browserify -g graspify`.
 * In that case transform is called for each nested module as well,
 * getting global config, defined in package.json.
 *
 * `opts.config` is taken from package.json, can be whether object or array.
 * `opts.opts` is taken as browserify transform param.
 *
 * Module taken from https://www.npmjs.com/package/graspify
 */
module.exports = transformTools.makeStringTransform('graspify', options, (content, opts, done) => {
    try {
        // Normalize plain replacements
        opts.opts = opts.opts ? 
            Array.isArray(opts.opts) ? 
                opts.opts : [opts.opts] 
            : [];
        opts.config = opts.config ? 
            Array.isArray(opts.config) ? 
                opts.config : [opts.config]
            : [];

        // Merge opts & config for the full list of replacements an loop over
        [].concat(opts.opts, opts.config).forEach((args) => {
            const selectorType = args.length === 3 ? args.shift() : 'squery';
            const selector = args[0];
            const replacement = args[1];

            content = grasp.replace(selectorType, selector, replacement, content);
        });

        done(null, content);
    } catch (e) {
        done(e);
    }
});
