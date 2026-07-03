import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// 100% client-side app: no proxy, no backend. See docs/plans/adr/ADR-0001.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Reliable file watching across the Docker bind mount (see docker-compose.yml).
    watch: { usePolling: true, interval: 300 },
  },
});
