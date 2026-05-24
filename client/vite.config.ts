import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'inject-defines',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [{
        tag: 'script',
        attrs: { type: 'module' },
        children: 'window.__DEFINES__ = {};',
      }],
    },
  }],
  define: {
    __DEFINES__: '{}',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 17000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:17001',
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
