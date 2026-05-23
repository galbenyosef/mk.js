import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:55555',
        ws: true,
      },
    },
    fs: { allow: ['..'] },
  },
  publicDir: path.resolve(__dirname, '..'),
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
