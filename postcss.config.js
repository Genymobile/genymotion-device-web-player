'use strict';

module.exports = {
    plugins: [
        require('autoprefixer'),
        require('@fullhuman/postcss-purgecss')({
            content: [
                './src/**/*.html',
                './src/**/*.js',
                './src/**/*.jsx',
                './src/**/*.ts',
                './src/**/*.tsx',
                './src/**/*.vue',
            ],
            safelist: {
                standard: [/^mdi-/, /^v-/, /^theme-/, /^layout-/, /^v-application/, 
                    /^gm-tag-/, /^gm-.*-fingerprint-image$/, /^gm-toolbar-dot-/],
                deep: [/^v-/, /^theme-/, /^layout-/],
                greedy: [/^v-/, /^theme-/, /^layout-/],
            },
            defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
            fontFace: true,
            keyframes: true,
            variables: true,
            rejected: true,
        }),
    ],
};
