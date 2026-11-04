import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvisosNoCelular } from './AvisosNoCelular.jsx';
import { pushApi } from '../../api/index.js';
import { chaveParaBytes } from '../../utils/avisos.js';

vi.mock('../../api/index.js', () => ({
  pushApi: { chave: vi.fn(), inscrever: vi.fn().mockResolvedValue(null), cancelar: vi.fn().mockResolvedValue(null), testar: vi.fn().mockResolvedValue({ aparelhos: 1 }) },
}));

// Navegador com push: service worker, PushManager e Notification simulados.
function simularNavegador({ permissao = 'default', inscrito = false, respostaPermissao = 'granted' } = {}) {
  const inscricao = {
    endpoint: 'https://push.example/1',
    toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(inscrito ? inscricao : null),
    subscribe: vi.fn().mockResolvedValue(inscricao),
  };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager }) } });
  window.PushManager = function PushManager() {};
  window.Notification = { permission: permissao, requestPermission: vi.fn().mockResolvedValue(respostaPermissao) };
  return { inscricao, pushManager };
}

describe('AvisosNoCelular', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushApi.chave.mockResolvedValue('BAAA');
  });

  afterEach(() => {
    delete navigator.serviceWorker;
    delete window.PushManager;
    delete window.Notification;
  });

  it('servidor sem chaves: não mostra nada', async () => {
    pushApi.chave.mockResolvedValue(null);
    simularNavegador();
    const { container } = render(<AvisosNoCelular />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });

  it('ativa: pede permissão, inscreve o aparelho e manda para o servidor', async () => {
    const { pushManager } = simularNavegador();
    render(<AvisosNoCelular />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ativar' }));

    expect(window.Notification.requestPermission).toHaveBeenCalled();
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: chaveParaBytes('BAAA') });
    expect(pushApi.inscrever).toHaveBeenCalledWith({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } });
    expect(await screen.findByText('Avisos no celular ativados.')).toBeInTheDocument();
  });

  it('ativado: "Enviar aviso de teste" pede o aviso ao servidor e avisa que foi', async () => {
    simularNavegador({ permissao: 'granted', inscrito: true });
    render(<AvisosNoCelular />);
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar aviso de teste' }));
    expect(pushApi.testar).toHaveBeenCalled();
    expect(await screen.findByText(/Aviso enviado/)).toBeInTheDocument();
  });

  it('já ativado: mostra e deixa desativar', async () => {
    const { inscricao } = simularNavegador({ permissao: 'granted', inscrito: true });
    render(<AvisosNoCelular />);
    await userEvent.click(await screen.findByRole('button', { name: 'Desativar' }));
    expect(pushApi.cancelar).toHaveBeenCalledWith('https://push.example/1');
    expect(inscricao.unsubscribe).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Ativar' })).toBeInTheDocument();
  });

  it('a pessoa nega a permissão: explica como liberar', async () => {
    simularNavegador({ respostaPermissao: 'denied' });
    render(<AvisosNoCelular />);
    await userEvent.click(await screen.findByRole('button', { name: 'Ativar' }));
    expect(await screen.findByText(/estão bloqueados/)).toBeInTheDocument();
  });

  it('iPhone fora da tela inicial: ensina a adicionar', async () => {
    const ua = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    render(<AvisosNoCelular />);
    expect(await screen.findByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
    ua.mockRestore();
  });
});
