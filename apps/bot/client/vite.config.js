import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/bot/',
  server: {
    port: 3005,
  },
  build: {
    outDir: 'build'
  }
});
