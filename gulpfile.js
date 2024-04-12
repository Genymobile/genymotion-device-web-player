'use strict';

/**
 * gulpfile.js
 * Gulp task definitions
 */

// This variable is used to store templates generated from the template folder
let templates;

const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const base64 = require('gulp-css-base64');
const browserify = require('browserify');
const browserSync = require('browser-sync').create();
const concat = require('gulp-concat');
const del = require('del');
const graspify = require('./gulp/graspify-squery');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const inject = require('gulp-inject');
const merge2 = require('merge2');
const minifyCss = require('gulp-clean-css');
const minifyHtml = require('gulp-htmlmin');
const sass = require('gulp-sass')(require('sass'));
const source = require('vinyl-source-stream');
const streamify = require('gulp-streamify');
const tap = require('gulp-tap');
const templateCollector = require('./gulp/gulp-template-collector');
const uglify = require('gulp-uglify-es').default;
const using = require('gulp-using');
const util = require('gulp-util');

const PATHS = {
    SRC: {
        APP: 'index.js',
        BASE: './src',
        WORKER: './src/worker',
        TEMPLATES: './src/templates',
        ASSETS: {
            STYLES: './src/scss'
        }
    },
    DEST: {
        BASE: 'dist',
        TEMPLATES: 'dist/templates',
        ASSETS: {
            CSS: 'dist/css'
        },
        LIB: {
            JS: 'dist/js',
            CSS: 'dist/css'
        }
    },
    TEST: {
        UTIL: './test/util',
        UT: './test/specs',
        E2E: './test/e2e'
    }

};

function getTemplateStylesStream() {
    return gulp.src([PATHS.SRC.TEMPLATES + '/**/*.css'])
        .pipe(base64());
}

function getTemplatesStream() {
    return merge2(
        gulp.src([PATHS.SRC.TEMPLATES + '/**/*.html']),
        gulp.src([PATHS.SRC.TEMPLATES + '/**/*.js']),
        getTemplateStylesStream()
    ).pipe(templateCollector());
}

// Clean dist dir
gulp.task('clean', function(cb) {
    del([PATHS.DEST.BASE]).then(function() {
        cb();
    }, function(err) {
        cb(err);
    });
});

// HTML templates
gulp.task('app-partials', function() {
    return gulp.src(['*.html'])
        .pipe(gulpif(util.env.debug, using()))
        .pipe(gulpif(util.env.production, minifyHtml({empty: true})))
        .pipe(gulp.dest(PATHS.DEST.BASE));
});

// SASS styles
gulp.task('app-styles', function() {
    return gulp.src(PATHS.SRC.ASSETS.STYLES + '/**/*.scss')
        .pipe(gulpif(util.env.debug, using()))
        .pipe(sass().on('error', sass.logError))
        .pipe(base64())
        .pipe(autoprefixer())
        .pipe(gulpif(util.env.production, minifyCss()))
        .pipe(concat('device-renderer.min.css'))
        .pipe(gulp.dest(PATHS.DEST.ASSETS.CSS));
});

gulp.task('app-templates', function() {
    return getTemplatesStream()
        .pipe(tap(function(file) {
            // After getting the templates to a JSON form, we need to transform it to a javascript string
            templates = file.contents.toString();
            templates = templates.replace(/\\n/g, ''); // we remove \n
            templates = templates.replace(/\\"/g, 'xFic1RoIH8'); // we change \" to a tmp replacement string
            templates = templates.replace(/'/g, '\\\''); // we change all ' to \'
            templates = templates.replace(/"/g, '\''); // we replace all " by '
            templates = templates.replace(/xFic1RoIH8/g, '\\"'); // we change back the tmp replacement string to \"
        }));
});

function getBundler() {
    return new Promise((resolve) => {
        if (!templates) {
            gulp.series('app-templates')(() => {
                resolve(setupBrowserify());
            });
        } else {
            resolve(setupBrowserify());
        }
    });
}

function setupBrowserify() {
    return browserify({
        entries: [PATHS.SRC.BASE + '/' + PATHS.SRC.APP],
        standalone: 'index',
        debug: true
    }).transform(graspify, ['#GEN_TEMPLATES', templates]);
}

gulp.task('app-js', async function() {
    const bundler = await getBundler();
    return merge2(bundler.bundle()
        .pipe(source(PATHS.SRC.APP)), {end: true})
        .pipe(gulpif(util.env.debug, using()))
        .pipe(gulpif(util.env.production, streamify(babel({
            compact: false,
            presets: [
                [
                    '@babel/env', {
                        targets: 'last 2 versions, not dead, not ie 11, not ie_mob 11, not op_mini all, not and_uc 12'
                    }
                ]
            ]
        }))))
        .pipe(streamify(concat('device-renderer.min.js')))
        .pipe(gulpif(util.env.production, streamify(uglify({keep_fnames : true}))))
        .pipe(gulp.dest(PATHS.DEST.LIB.JS));
});

// Dependencies injection
gulp.task('inject', function() {
    return gulp.src('*.html')
        .pipe(inject(
            gulp.src([
                PATHS.DEST.LIB.CSS + '/**/*.css',
                PATHS.DEST.LIB.JS + '/**/*.js'
            ], {read: false})
            , {
                addRootSlash: false,
                ignorePath: PATHS.DEST.BASE
            }
        ))
        .pipe(gulp.dest(PATHS.DEST.BASE));
});

// Simple webserver
gulp.task('connect', function() {
    browserSync.init({
        server: {
            baseDir: PATHS.DEST.BASE
        },
        port: 8000
    });
});

// Build project
gulp.task('build', gulp.series(
    'clean',
    'app-templates',
    gulp.parallel('app-partials', 'app-styles', 'app-js'),
    'inject',
    function(cb) {
        cb();
    }
));

// Watch project update
gulp.task('watch', gulp.series('build', function(cb) {
    gulp.watch([
        PATHS.SRC.ASSETS.STYLES + '/**/*.scss'
    ], gulp.series('app-styles'));

    gulp.watch([
        PATHS.SRC.BASE + '/*.js',
        PATHS.SRC.BASE + '/**/*.js',
        PATHS.SRC.WORKER + '/*.js',
        PATHS.SRC.WORKER + '/**/*.js',
        PATHS.SRC.TEMPLATES + '/**/*'
    ], gulp.series('app-js'));

    cb();
}));

// Serve project
gulp.task('serve', gulp.series('watch', function(cb) {
    browserSync.init({
        files: [PATHS.DEST.BASE + '/**/*'],
        server: {
            baseDir: PATHS.DEST.BASE
        },
        port: 8000
    }, cb);
}));
