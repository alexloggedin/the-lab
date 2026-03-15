import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '.',
    rollupOptions: {
      input: 'src/main.jsx',
      output: {
        entryFileNames: 'js/wipshare.js',
        chunkFileNames:  'js/[name].js',
        assetFileNames:  (info) =>
          info.name?.endsWith('.css') ? 'css/wipshare.css' : 'js/[name][extname]',
      }
    },
    emptyOutDir: false, // don't wipe appinfo/, lib/ etc.
  }
});