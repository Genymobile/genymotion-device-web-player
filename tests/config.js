import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [],
        include: ['tests/unit/**/*.test.js'],
    },
});
