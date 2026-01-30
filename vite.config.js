import { defineConfig } from 'vite';
import path from 'path';

import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            basicSsl(),
            {
                name: 'html-transform',
                transformIndexHtml(html) {
                    if (mode === 'development') {
                        // For development, instead of using the built dist, hot reload the files from src with auto-reconnect
                        let newHtml = html.replace(
                            /<script src="\.\.\/dist\/js\/device-renderer\.min\.js" data-player-url><\/script>/,
                            `
                            <script type="module">
                                import genyDeviceWebPlayer from '/src/index.js';
                                window.genyDeviceWebPlayer = genyDeviceWebPlayer;

                                // --- Auto-connect dev helper ---
                                const storageKey = 'geny_dev_auto_connect_ws';
                                const wsInput = document.getElementById('wsAddress');
                                const connectBtn = document.getElementById('connectExistingInstance');
                                const stopBtn = document.getElementById('stop');

                                if (wsInput && connectBtn) {
                                    // Save WS address when connecting
                                    connectBtn.addEventListener('click', () => {
                                        if (wsInput.value) {
                                            sessionStorage.setItem(storageKey, wsInput.value);
                                        }
                                    });

                                    // Clear saved WS when stopping
                                    if (stopBtn) {
                                        stopBtn.addEventListener('click', () => {
                                            sessionStorage.removeItem(storageKey);
                                        });
                                    }

                                    // Auto-connect on page load if saved WS exists
                                    const savedWs = sessionStorage.getItem(storageKey);
                                    if (savedWs) {
                                        console.log('[Dev] Auto-connecting to:', savedWs);
                                        wsInput.value = savedWs;
                                        // Small delay to ensure player is ready
                                        setTimeout(() => connectBtn.click(), 500);
                                    }
                                }
                            </script>
                            `,
                        );
                        // Remove dist CSS to rely on HMR from src/index.js import
                        newHtml = newHtml.replace(
                            /<link rel="stylesheet" href="\.\.\/dist\/css\/device-renderer\.min\.css" data-player-url \/>/,
                            '<!-- dist css removed for dev HMR -->',
                        );
                        return newHtml;
                    }
                    return html;
                },
            },
        ],
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
            minify: mode === 'production' ? 'esbuild' : false,
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
