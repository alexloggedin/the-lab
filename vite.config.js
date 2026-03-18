// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: mode === 'nextcloud' ? {
      '^/remote\\.php': { target: 'http://localhost:8080', changeOrigin: true },
      '^/index\\.php':  { target: 'http://localhost:8080', changeOrigin: true },
      '^/ocs':          { target: 'http://localhost:8080', changeOrigin: true },
    } : {},
  },

  build: {
    outDir: 'dist',
    rollupOptions: { input: 'index.html' },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
}));
