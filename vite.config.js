import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
    return {
        plugins: [basicSsl()],
        build: {
            target: 'es2015',
            lib: {
                entry: path.resolve(__dirname, 'src/index.js'),
                name: 'genyDeviceWebPlayer',
                fileName: (format) => `js/device-renderer.min.js`,
                formats: ['umd'],
            },
            outDir: 'dist',
            emptyOutDir: true,
            minify: mode === 'production' ? 'terser' : false,
            cssCodeSplit: false,
            rollupOptions: {
                output: {
                    name: 'genyDeviceWebPlayer',
                    globals: {},
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name.endsWith('.css')) return 'css/device-renderer.min.css';
                        return assetInfo.name;
                    },
                },
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 8000,
            open: '/example/geny-window.html',
        },
    };
});
