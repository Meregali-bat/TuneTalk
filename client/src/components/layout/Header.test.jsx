import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header.jsx';
import { notificationsApi } from '../../api/index.js';
import { makeAuth, renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({
  notificationsApi: { list: vi.fn(), unreadCount: vi.fn(), readAll: vi.fn() },
}));

const notifications = [
  { id: 1, tipo: 'new_follower', conteudo: 'seguiu você', lida: false, postId: null, autor: { id: 3, nome: 'Bia', fotoPerfil: 'b.png' } },
  { id: 2, tipo: 'like', conteudo: 'curtiu seu post', lida: false, postId: 10, autor: { id: 4, nome: 'Caio', fotoPerfil: 'c.png' } },
];

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsApi.unreadCount.mockResolvedValue(2);
    notificationsApi.list.mockResolvedValue(notifications);
    notificationsApi.readAll.mockResolvedValue(null);
  });

  it('linka para o perfil do usuário logado', () => {
    renderWithProviders(<Header />);
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

  it('abrir as notificações lista, marca como lidas e zera o contador', async () => {
    renderWithProviders(<Header />);
    await screen.findByTestId('unread-count');
    notificationsApi.unreadCount.mockResolvedValue(0);

    await userEvent.click(screen.getByRole('button', { name: 'Notificações' }));

    const dialog = await screen.findByRole('dialog', { name: 'Notificações' });
    expect(notificationsApi.readAll).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId('unread-count')).toBeNull());

    const follower = within(dialog).getByText('Bia').closest('a');
    expect(follower).toHaveAttribute('href', '/perfil/3');
    expect(within(dialog).getByText('seguiu você')).toBeInTheDocument();

    const like = within(dialog).getByText('Caio').closest('a');
    expect(like).toHaveAttribute('href', '/post/10');
  });

  it('mostra mensagem quando não há notificações', async () => {
    notificationsApi.list.mockResolvedValue([]);
    renderWithProviders(<Header />);
    await userEvent.click(screen.getByRole('button', { name: 'Notificações' }));
    expect(await screen.findByText('Nenhuma notificação.')).toBeInTheDocument();
  });

  it('o botão sair encerra a sessão e vai para /login', async () => {
    const logout = vi.fn().mockResolvedValue();
    renderWithProviders(<Header />, { auth: makeAuth({ logout }) });

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(logout).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});
