import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// 100% client-side app: no proxy, no backend. See docs/plans/adr/ADR-0001.
//
// OCR (Phase 3, ADR-0004) is fully self-hosted with zero runtime egress: the tesseract.js
// worker + the LSTM core WASM variants are copied out of node_modules at build time into
// /tesseract/**, and the language models are committed under public/tesseract/lang/.
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // tesseract.js worker script -> /tesseract/worker.min.js
        { src: 'node_modules/tesseract.js/dist/worker.min.js', dest: 'tesseract' },
        // LSTM core variants only (we pin OEM.LSTM_ONLY): plain / simd / relaxedsimd,
        // each .wasm + .wasm.js -> /tesseract/core/  (loader auto-selects by CPU features)
        { src: 'node_modules/tesseract.js-core/tesseract-core*lstm.wasm*', dest: 'tesseract/core' },
      ],
    }),
    // PWA (Phase 5): precache the app shell + fonts; runtime-cache the ~24 MB OCR assets on first
    // use. MUST come after viteStaticCopy (it globs dist/ in closeBundle) — hence globIgnores.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'opendys — dyslexia reading aid',
        short_name: 'opendys',
        description:
          'A free, 100% client-side dyslexia reading aid for English and Thai. Offline OCR, dyslexia-friendly typography, and text-to-speech.',
        theme_color: '#65c3c8',
        background_color: '#faf7f5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'any',
        lang: 'en',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Precache app shell + self-hosted fonts. The ~24 MB tesseract tree and unused .woff are
        // excluded — models/wasm are runtime-cached below on first OCR use.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        globIgnores: ['**/tesseract/**', '**/*.woff'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tesseract/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'opendys-tesseract-v1',
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 24 * 365,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [0, 200] },
              matchOptions: { ignoreSearch: true },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // tesseract.js is CJS and manages its own worker; excluding it from dep pre-bundling
  // avoids esbuild mangling the worker/path resolution in dev.
  optimizeDeps: {
    exclude: ['tesseract.js'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Reliable file watching across the Docker bind mount (see docker-compose.yml).
    watch: { usePolling: true, interval: 300 },
  },
});
