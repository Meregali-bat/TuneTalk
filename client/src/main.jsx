import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/global.css';
import './styles/public.css';
import './styles/authForm.css';
import './styles/app.css';
import { App } from './App.jsx';

async function start() {
  let router = BrowserRouter;
  let banner = null;

  // Build de demonstração (`npm run build:demo`): backend fake no navegador e rotas em memória.
  if (import.meta.env.VITE_DEMO) {
    const { installFakeBackend } = await import('./demo/fakeApi.js');
    const { DemoBanner } = await import('./demo/DemoBanner.jsx');
    router = MemoryRouter;
    banner = <DemoBanner api={installFakeBackend()} />;
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App router={router}>{banner}</App>
    </StrictMode>,
  );
}

start();
