import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true
  },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // A function is accepted by both Rollup (Vite 5) and Rolldown (Vite 8).
        // Keep React and Lucide in stable chunks without the object form rejected by Rolldown.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/]react(?:-dom)?(?:[\\/]|$)/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/]lucide-react(?:[\\/]|$)/.test(id)) return 'lucide';
          return undefined;
        }
      }
    }
  }
});
