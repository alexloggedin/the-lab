// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Only add the proxy config in dev mode
  server: mode === 'development' ? {
    port: 5173,
    proxy: {
      // Forward everything EXCEPT Vite's own assets to Docker
      '/apps/thelab/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Also proxy the page itself so we get real window.OC context
      '/index.php': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/core': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ocs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    }
  } : {},

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