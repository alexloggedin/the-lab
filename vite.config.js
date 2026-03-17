import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  server: {
    port: 5173,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
    proxy: mode === 'docker' ? {
      '^/index\\.php': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '^/remote\\.php': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '^/ocs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '^/apps': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    } : {},
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.jsx',
      output: {
        entryFileNames: 'thelab.js',
        assetFileNames: (info) =>
          info.name?.endsWith('.css') ? 'thelab.css' : '[name][extname]',
      }
    },
  }
}))