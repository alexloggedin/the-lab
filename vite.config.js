import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  console.log('Vite mode:', mode)

  // Proxies only the paths that belong to Nextcloud.
  // Everything else (/, /?share=token, /src, /@vite) stays on Vite.
  const dockerProxy = {
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
    '^/js': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
    '^/css': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],

    server: {
      port: 5173,
      hmr: {
        host: 'localhost',
        port: 5173,
      },
      // docker mode  → proxy Nextcloud paths to container
      // dev mode     → no proxy, all requests stay on Vite, mock data used
      proxy: mode === 'docker' ? dockerProxy : {},
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: 'src/main.tsx',
        output: {
          entryFileNames: 'thevault.js',
          assetFileNames: (info) =>
            info.name?.endsWith('.css') ? 'thevault.css' : '[name][extname]',
        }
      },
    }
  }
})