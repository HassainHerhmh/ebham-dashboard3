import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5190,
    strictPort: true,
    open: false,
    proxy: {
      '/api': 'https://working-hours-production.up.railway.app',
      '/uploads': 'https://working-hours-production.up.railway.app'
    }
  }
});
