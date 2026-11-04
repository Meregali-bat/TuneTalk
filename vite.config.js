import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Versão de cada build (o commit na Vercel). O app compara com /version.json para saber se saiu versão nova.
const versaoDoBuild = () => (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(0, 12);

function arquivoDeVersao(versao) {
  return {
    name: 'arquivo-de-versao',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ versao }) });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  // Fora do build de produção (dev, testes, demo) não há checagem de versão nova.
  const versao = command === 'build' && mode !== 'demo' ? versaoDoBuild() : 'dev';
  return {
  root: 'client',
  plugins: [react(), ...(versao === 'dev' ? [] : [arquivoDeVersao(versao)])],
  // `npm run build:demo` gera uma versão que roda sozinha no navegador, servida fora da raiz.
  base: mode === 'demo' ? './' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(versao),
    ...(mode === 'demo' ? { 'import.meta.env.VITE_DEMO': 'true' } : {}),
  },
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
          // Cada arquivo de banco sobe um Postgres em memória (PGlite) e aplica as migrations:
          // com a suíte toda em paralelo, isso passa dos 10s padrão.
          hookTimeout: 30000,
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
};
});
