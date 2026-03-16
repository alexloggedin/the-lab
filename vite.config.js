import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: command === 'serve' ? {
      '^(?!/@vite|/@react-refresh|/src|/node_modules).*': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
          })
        }
      }
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