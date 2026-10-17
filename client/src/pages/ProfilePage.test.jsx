import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from './ProfilePage.jsx';
import { usersApi } from '../api/index.js';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  usersApi: { profile: vi.fn(), follow: vi.fn(), unfollow: vi.fn(), updateMe: vi.fn() },
  postsApi: { like: vi.fn(), unlike: vi.fn(), remove: vi.fn() },
}));

const bia = { id: 2, nome: 'Bia', fotoPerfil: 'bia.png', bio: 'curto rock' };

const profile = (overrides = {}) => ({
  usuario: bia,
  posts: [{
    id: 10, texto: 'post da bia', likes: 1, nota: 4, data: new Date().toISOString(), quantidadeComentarios: 0,
    tipo: 'música', titulo: 'Help!', artista: 'Beatles', capa: 'h.jpg', releaseDate: '100', preview: null,
    curtido: false, autor: { id: 2, nome: 'Bia', fotoPerfil: 'bia.png' },
  }],
  quantidadePosts: 1,
  quantidadeSeguidores: 1,
  quantidadeSeguindo: 0,
  seguidores: [{ id: 3, nome: 'Caio', fotoPerfil: 'c.png' }],
  seguindo: [],
  seguindoIds: [],
  ...overrides,
});

const renderProfile = (id = 2, auth) =>
  renderWithProviders(<ProfilePage />, { route: `/perfil/${id}`, path: '/perfil/:id', auth });

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.profile.mockResolvedValue(profile());
  });

  it('mostra dados, contadores e posts do usuário', async () => {
    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Bia' })).toBeInTheDocument();
    expect(usersApi.profile).toHaveBeenCalledWith('2');
    expect(screen.getByText('curto rock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguidores 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguindo 0' })).toBeInTheDocument();
    expect(screen.getByText('Posts', { selector: '.seguidores' })).toHaveTextContent('Posts 1');
    expect(screen.getByText('post da bia')).toBeInTheDocument();
  });

  it('permite seguir e recarrega o perfil', async () => {
    usersApi.follow.mockResolvedValue(null);
    renderProfile();
    await screen.findByRole('heading', { name: 'Bia' });

    usersApi.profile.mockResolvedValue(profile({ seguindoIds: [2], quantidadeSeguidores: 2 }));
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));

    expect(usersApi.follow).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguidores 2' })).toBeInTheDocument();
  });

  it('abre a lista de seguidores', async () => {
    renderProfile();
    await userEvent.click(await screen.findByRole('button', { name: 'Seguidores 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Seguidores' });
    expect(within(dialog).getByText('Caio')).toBeInTheDocument();
  });

  it('no próprio perfil mostra "Editar perfil" e salva as mudanças', async () => {
    const updateUser = vi.fn();
    usersApi.profile.mockResolvedValue(profile({ usuario: { id: 1, nome: 'Ana', fotoPerfil: 'a.png', bio: '' } }));
    usersApi.updateMe.mockResolvedValue({ id: 1, nome: 'Ana B', fotoPerfil: 'a.png', bio: '' });
    renderProfile(1, makeAuth({ updateUser }));

    await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
    expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull();

    usersApi.profile.mockResolvedValue(profile({ usuario: { id: 1, nome: 'Ana B', fotoPerfil: 'a.png', bio: '' } }));
    await userEvent.clear(screen.getByLabelText('Nome'));
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana B');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('heading', { name: 'Ana B' })).toBeInTheDocument();
    expect(updateUser).toHaveBeenCalledWith({ nome: 'Ana B' });
    expect(screen.queryByLabelText('Nome')).toBeNull();
  });

  it('mostra erro para perfil inexistente', async () => {
    usersApi.profile.mockRejectedValue(new Error('Usuário não encontrado.'));
    renderProfile(99);
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário não encontrado.');
  });
});
