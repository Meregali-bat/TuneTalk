import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  root: 'client',
  plugins: [react()],
  // `npm run build:demo` gera uma versão que roda sozinha no navegador, servida fora da raiz.
  base: mode === 'demo' ? './' : '/',
  define: mode === 'demo' ? { 'import.meta.env.VITE_DEMO': 'true' } : {},
  build: {
    outDir: mode === 'demo' ? '../dist-demo' : '../dist',
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
}));
