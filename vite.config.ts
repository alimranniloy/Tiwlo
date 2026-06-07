import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
    },
    server: {
      // HMR can be disabled via DISABLE_HMR when running background startup tasks.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/graphql': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/admin': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/health': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/webhooks': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/api': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/data': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/discord': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/automation': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/ai': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
        '/payments': {
          target: env.TIWLO_BACKEND_URL || 'http://127.0.0.1:4000',
          changeOrigin: true,
        },
      },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/.data/**',
          '**/.logs/**',
          '**/.tools/**',
          '**/dist/**',
          '**/node_modules/**',
          '**/x/**',
        ],
      },
    },
  };
});
