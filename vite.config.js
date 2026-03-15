import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.jsx',
      output: {
        entryFileNames: 'wipshare.js',
        assetFileNames: (info) =>
          info.name?.endsWith('.css') ? 'wipshare.css' : '[name][extname]',
      }
    },
  }
})