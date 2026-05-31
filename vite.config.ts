/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:8001';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      watch: {
        ignored: ['**/backend/**', '**/dist/**', '**/docs/**'],
      },
    },
    build: {
      // Code splitting optimization
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'framer-motion': ['framer-motion'],
            'router': ['react-router-dom'],
          },
        },
      },
      // Resource optimization
      chunkSizeWarningLimit: 1000,
    },
    publicDir: path.resolve(__dirname, 'frontend/public'),
    plugins: [
      react(),
      tailwindcss(),
    ],
    // define block removed: Gemini API key must not be exposed to frontend
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'frontend'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./frontend/test-setup.ts'],
      exclude: ['**/e2e/**', '**/node_modules/**'],
    },
  };
});
