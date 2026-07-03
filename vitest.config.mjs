import {defineConfig} from 'vitest/config';
import path from 'path';

const nodeMajorVersion = parseInt(process.versions.node.split('.')[0], 10);
const testEnvironment = nodeMajorVersion >= 20 ? 'jsdom' : 'happy-dom';

export default defineConfig({
    test: {
        globals: true,
        environment: testEnvironment,
        setupFiles: ['tests/setup.js'],
        include: ['tests/unit/**/*.test.js'],
        clearMocks: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
