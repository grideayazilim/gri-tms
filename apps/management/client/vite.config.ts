import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul';
export default defineConfig({
  plugins: [
    react(),
    process.env.VITE_COVERAGE === 'true' && istanbul({
      include: 'src/*',
      exclude: ['node_modules', 'test/'],
      extension: ['.js', '.jsx', '.ts', '.tsx'],
      requireEnv: false,
    }),
  ].filter(Boolean),
});