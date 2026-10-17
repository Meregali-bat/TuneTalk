import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from './ProfilePage.jsx';
import { musicApi, usersApi } from '../api/index.js';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  usersApi: { profile: vi.fn(), follow: vi.fn(), unfollow: vi.fn(), updateMe: vi.fn() },
  postsApi: { like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), create: vi.fn() },
  musicApi: { search: vi.fn() },
}));

const bia = { id: 2, nome: 'bia', fotoPerfil: 'bia.png', bio: 'curto rock' };

const post = (id, nota) => ({
  id, texto: `post ${id}`, likes: 1, nota, data: new Date().toISOString(), quantidadeComentarios: 0,
  tipo: 'música', titulo: 'Help!', artista: 'Beatles', capa: 'h.jpg', releaseDate: '100', preview: null,
  curtido: false, autor: { id: 2, nome: 'bia', fotoPerfil: 'bia.png' },
});

const profile = (overrides = {}) => ({
  usuario: bia,
  posts: [post(10, 8), post(11, 7)],
  quantidadePosts: 2,
  quantidadeSeguidores: 1,
  quantidadeSeguindo: 0,
  seguidores: [{ id: 3, nome: 'caio', fotoPerfil: 'c.png', bio: 'baterista' }],
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

  it('mostra um esqueleto enquanto carrega', () => {
    usersApi.profile.mockReturnValue(new Promise(() => {}));
    renderProfile();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando perfil');
  });

  it('mostra foto, nome, bio, números e posts', async () => {
    renderProfile();

    expect(await screen.findByRole('heading', { level: 1, name: 'bia' })).toBeInTheDocument();
    expect(usersApi.profile).toHaveBeenCalledWith('2');
    expect(screen.getByAltText('Foto de perfil de bia')).toHaveAttribute('src', 'bia.png');
    expect(screen.getByText('curto rock')).toBeInTheDocument();

    const stats = screen.getByRole('list', { name: 'Números do perfil' });
    expect(within(stats).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '2Posts', '1Seguidores', '0Seguindo', '7,5Nota média',
    ]);
    expect(screen.getByRole('heading', { level: 2, name: 'Posts' })).toBeInTheDocument();
    expect(screen.getByText('post 10')).toBeInTheDocument();
  });

  it('a nota média ignora posts sem música', async () => {
    const soTexto = { ...post(12, null), titulo: null, tipo: null };
    usersApi.profile.mockResolvedValue(profile({ posts: [post(10, 8), soTexto], quantidadePosts: 2 }));
    renderProfile();
    const stats = await screen.findByRole('list', { name: 'Números do perfil' });
    expect(stats).toHaveTextContent('8,0Nota média');
  });

  it('sem posts com nota não mostra nota média', async () => {
    const soTexto = { ...post(12, null), titulo: null, tipo: null };
    usersApi.profile.mockResolvedValue(profile({ posts: [soTexto], quantidadePosts: 1 }));
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });
    expect(screen.queryByText('Nota média')).toBeNull();
  });

  it('sem posts não mostra nota média', async () => {
    usersApi.profile.mockResolvedValue(profile({ posts: [], quantidadePosts: 0 }));
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });
    expect(screen.queryByText('Nota média')).toBeNull();
  });

  it('permite seguir e atualiza os números', async () => {
    usersApi.follow.mockResolvedValue(null);
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });

    usersApi.profile.mockResolvedValue(profile({ seguindoIds: [2], quantidadeSeguidores: 2 }));
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));

    expect(usersApi.follow).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguidores: 2' })).toBeInTheDocument();
  });

  it('abre a lista de seguidores com nome e bio', async () => {
    renderProfile();
    await userEvent.click(await screen.findByRole('button', { name: 'Seguidores: 1' }));

    const dialog = screen.getByRole('dialog', { name: 'Seguidores' });
    expect(within(dialog).getByText('caio')).toBeInTheDocument();
    expect(within(dialog).getByText('baterista')).toBeInTheDocument();
  });

  it('perfil de outra pessoa sem posts', async () => {
    usersApi.profile.mockResolvedValue(profile({ posts: [], quantidadePosts: 0 }));
    renderProfile();
    expect(await screen.findByText('bia ainda não postou nada.')).toBeInTheDocument();
  });

  describe('próprio perfil', () => {
    const ana = { id: 1, nome: 'ana', fotoPerfil: 'a.png', bio: '' };

    it('mostra "Editar perfil" no lugar de seguir', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana }));
      renderProfile(1);
      expect(await screen.findByRole('button', { name: 'Editar perfil' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull();
    });

    it('sem posts convida a fazer o primeiro', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, posts: [], quantidadePosts: 0 }));
      musicApi.search.mockResolvedValue([]);
      renderProfile(1);

      await userEvent.click(await screen.findByRole('button', { name: 'Fazer o primeiro post' }));

      expect(screen.getByRole('dialog', { name: 'Novo post' })).toBeInTheDocument();
    });

    it('edita o perfil e atualiza a página e a sessão', async () => {
      const updateUser = vi.fn();
      usersApi.profile.mockResolvedValue(profile({ usuario: ana }));
      usersApi.updateMe.mockResolvedValue({ ...ana, nome: 'ana_b' });
      renderProfile(1, makeAuth({ updateUser }));

      await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
      const dialog = screen.getByRole('dialog', { name: 'Editar perfil' });

      usersApi.profile.mockResolvedValue(profile({ usuario: { ...ana, nome: 'ana_b' } }));
      await userEvent.clear(within(dialog).getByLabelText('Nome de usuário'));
      await userEvent.type(within(dialog).getByLabelText('Nome de usuário'), 'ana_b');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('heading', { level: 1, name: 'ana_b' })).toBeInTheDocument();
      expect(updateUser).toHaveBeenCalledWith({ nome: 'ana_b' });
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).toBeNull();
    });
  });

  it('mostra erro para perfil inexistente', async () => {
    usersApi.profile.mockRejectedValue(new Error('Usuário não encontrado.'));
    renderProfile(99);
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário não encontrado.');
  });
});
