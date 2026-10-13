import { defineConfig } from 'vite';
import react from '../client/node_modules/@vitejs/plugin-react';
import path from 'path';

const shim = (n: string) => path.resolve(__dirname, 'shims', n + '.js');

export default defineConfig({
  root: __dirname,
  base: './',
  plugins: [react()],
  resolve: {
    alias: { express: shim('express'), fs: shim('fs'), path: shim('path') },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  css: { postcss: __dirname },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    modulePreload: false,
    commonjsOptions: { include: [/server\/routes/, /shims/, /node_modules/], transformMixedEsModules: true },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
