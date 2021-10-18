'use strict';

/**
 * gulp/gulp-template-collector.js
 * Gulp plugin to collect all template resources
 */

const through = require('through2');
const File = require('vinyl');

/**
 * templateCollector
 * Collect / combine all resources for an individual template
 *
 * @param {Object} options {Object}
 * @param {string} options.file concat all templates into single file
 * @return {Object} Gulp plugin
 */
module.exports = function templateCollector(options) {
    const templates = {};
    options = options || {};
    options.file = options.file || 'templates.js';

    return through.obj(
        function transform(file, enc, done) {
            // Ensure file, not directory
            if (file.isNull()) {
                return done();
            }

            // Break up filename
            const pieces = file.relative.split('/');
            const template = pieces[0];
            const fileName = pieces[1];

            // Capture contents
            if (!templates[template]) {
                templates[template] = {};
            }
            templates[template][fileName.split('.')[1]] = file.contents.toString();

            return done();
        },
        function flush(done) {
            const templateBlob = JSON.stringify(templates);
            this.push(new File({
                path: options.file,
                contents: Buffer.from(templateBlob),
            }));
            done();
        }
    );
};
