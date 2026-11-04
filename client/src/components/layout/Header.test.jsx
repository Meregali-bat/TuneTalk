import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header, INTERVALO_NOTIFICACOES_MS } from './Header.jsx';
import { notificationsApi } from '../../api/index.js';
import { makeAuth, renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({
  notificationsApi: { list: vi.fn(), unreadCount: vi.fn(), readAll: vi.fn() },
}));

const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();

const notifications = [
  { id: 3, tipo: 'comment', conteudo: 'comentou no seu post', lida: false, postId: 10, data: minutesAgo(5), autor: { id: 5, nome: 'duda', fotoPerfil: 'd.png' } },
  { id: 2, tipo: 'like', conteudo: 'curtiu seu post', lida: false, postId: 10, data: minutesAgo(120), autor: { id: 4, nome: 'caio', fotoPerfil: 'c.png' } },
  { id: 1, tipo: 'new_follower', conteudo: 'seguiu você', lida: true, postId: null, data: minutesAgo(60 * 30), autor: { id: 3, nome: 'bia', fotoPerfil: 'b.png' } },
];

const openPanel = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Notificações' }));
  return screen.findByRole('dialog', { name: 'Notificações' });
};

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.unreadCount.mockResolvedValue(2);
    notificationsApi.list.mockResolvedValue(notifications);
    notificationsApi.readAll.mockResolvedValue(null);
  });

  it('tem o logo levando ao feed e o link para o próprio perfil', () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole('link', { name: 'TuneTalk, início' })).toHaveAttribute('href', '/foryou');
    expect(screen.getByRole('link', { name: 'Meu perfil' })).toHaveAttribute('href', '/perfil/1');
  });

  it('tem a lupa que leva à busca', () => {
    renderWithProviders(<Header />);
    expect(screen.getByRole('link', { name: 'Buscar' })).toHaveAttribute('href', '/buscar');
  });

  it('mostra a quantidade de notificações não lidas', async () => {
    renderWithProviders(<Header />);
    expect(await screen.findByTestId('unread-count')).toHaveTextContent('2');
  });

  it('esconde o contador quando não há não lidas', async () => {
    notificationsApi.unreadCount.mockResolvedValue(0);
    renderWithProviders(<Header />);
    await waitFor(() => expect(notificationsApi.unreadCount).toHaveBeenCalled());
    expect(screen.queryByTestId('unread-count')).toBeNull();
  });

  it('mostra "9+" quando há muitas não lidas', async () => {
    notificationsApi.unreadCount.mockResolvedValue(14);
    renderWithProviders(<Header />);
    expect(await screen.findByTestId('unread-count')).toHaveTextContent('9+');
  });

  describe('painel de notificações', () => {
    it('lista cada notificação com quem fez, o que fez, quando e o link certo', async () => {
      renderWithProviders(<Header />);
      const panel = await openPanel();
      const items = await within(panel).findAllByRole('listitem');

      expect(items.map((item) => item.textContent)).toEqual([
        expect.stringContaining('duda comentou no seu post'),
        expect.stringContaining('caio curtiu seu post'),
        expect.stringContaining('bia seguiu você'),
      ]);
      expect(within(items[0]).getByText('há 5 minutos').tagName).toBe('TIME');
      expect(within(items[0]).getByRole('link')).toHaveAttribute('href', '/post/10');
      expect(within(items[2]).getByRole('link')).toHaveAttribute('href', '/perfil/3');
    });

    it('destaca as que ainda não tinham sido lidas', async () => {
      renderWithProviders(<Header />);
      const panel = await openPanel();
      const items = await within(panel).findAllByRole('listitem');

      expect(within(items[0]).getByText('Não lida')).toBeInTheDocument();
      expect(within(items[1]).getByText('Não lida')).toBeInTheDocument();
      expect(within(items[2]).queryByText('Não lida')).toBeNull();
    });

    it('busca a lista antes de marcar tudo como lido e zera o contador', async () => {
      const order = [];
      notificationsApi.list.mockImplementation(async () => { order.push('list'); return notifications; });
      notificationsApi.readAll.mockImplementation(async () => { order.push('readAll'); });
      renderWithProviders(<Header />);
      await screen.findByTestId('unread-count');
      notificationsApi.unreadCount.mockResolvedValue(0);

      await openPanel();

      await waitFor(() => expect(order).toEqual(['list', 'readAll']));
      await waitFor(() => expect(screen.queryByTestId('unread-count')).toBeNull());
    });

    it('mostra estado vazio', async () => {
      notificationsApi.list.mockResolvedValue([]);
      renderWithProviders(<Header />);
      const panel = await openPanel();
      expect(await within(panel).findByText('Nada por aqui ainda')).toBeInTheDocument();
    });

    it('fecha ao escolher uma notificação', async () => {
      renderWithProviders(<Header />);
      const panel = await openPanel();
      const [first] = await within(panel).findAllByRole('link');
      await userEvent.click(first);
      expect(screen.queryByRole('dialog', { name: 'Notificações' })).toBeNull();
      expect(screen.getByTestId('location')).toHaveTextContent('/post/10');
    });
  });

  it('o botão sair encerra a sessão e vai para /login', async () => {
    const logout = vi.fn().mockResolvedValue();
    renderWithProviders(<Header />, { auth: makeAuth({ logout }) });

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(logout).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  describe('atualiza sozinho, sem recarregar a página', () => {
    afterEach(() => vi.useRealTimers());

    it('confere as não lidas a cada 30 s', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      notificationsApi.unreadCount.mockResolvedValueOnce(0).mockResolvedValue(3);
      renderWithProviders(<Header />);
      await waitFor(() => expect(notificationsApi.unreadCount).toHaveBeenCalledTimes(1));
      expect(screen.queryByTestId('unread-count')).toBeNull();

      await act(() => vi.advanceTimersByTimeAsync(INTERVALO_NOTIFICACOES_MS));
      expect(await screen.findByTestId('unread-count')).toHaveTextContent('3');
    });

    it('não consulta com a aba escondida e confere na hora em que a pessoa volta', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      let visivel = 'hidden';
      vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visivel);
      renderWithProviders(<Header />);
      await waitFor(() => expect(notificationsApi.unreadCount).toHaveBeenCalledTimes(1));

      await act(() => vi.advanceTimersByTimeAsync(INTERVALO_NOTIFICACOES_MS * 3));
      expect(notificationsApi.unreadCount).toHaveBeenCalledTimes(1);

      visivel = 'visible';
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
      expect(notificationsApi.unreadCount).toHaveBeenCalledTimes(2);
    });

    it('com a lista aberta, notificação nova entra nela', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderWithProviders(<Header />);
      const painel = await openPanel();
      await within(painel).findByText(/comentou no seu post/);

      const nova = { id: 4, tipo: 'like', conteudo: 'curtiu seu comentário', lida: false, postId: 10, data: minutesAgo(0), autor: { id: 6, nome: 'edu', fotoPerfil: 'e.png' } };
      notificationsApi.unreadCount.mockResolvedValue(1);
      notificationsApi.list.mockResolvedValue([nova, ...notifications]);
      await act(() => vi.advanceTimersByTimeAsync(INTERVALO_NOTIFICACOES_MS));

      expect(await within(painel).findByText(/curtiu seu comentário/)).toBeInTheDocument();
    });
  });
});
