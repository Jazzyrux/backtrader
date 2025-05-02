import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/market': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/trading': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/strategies': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/binance/, '/api/v3'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Erreur proxy:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Requête proxy:', req.method, req.url);
          });
        },
      },
    },
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@/workers/backtest.worker']
  }
}); 