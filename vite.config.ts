import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/dheraimaaya/',
  build: {
    assetsInlineLimit: 0,
    target: 'esnext',
  },
  server: {
    port: 5173,
    open: true,
  },
});
