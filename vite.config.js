// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Only add the proxy config in dev mode
  server: mode === 'development' ? {
    port: 5173,
    proxy: {
      // Proxy everything to Docker EXCEPT Vite's own dev paths
      '^(?!/@vite|/@react-refresh|/src|/node_modules).*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
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