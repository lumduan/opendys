import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
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
