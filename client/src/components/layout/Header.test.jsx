import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header.jsx';
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
});
