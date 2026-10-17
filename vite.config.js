import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    root: '.',
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['server/tests/**/*.test.js'],
        },
      },
      {
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['client/src/**/*.test.{js,jsx}'],
          setupFiles: ['client/src/test/setup.js'],
          css: false,
        },
      },
    ],
  },
});
