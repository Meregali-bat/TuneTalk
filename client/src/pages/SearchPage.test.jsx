import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPage } from './SearchPage.jsx';
import { hashtagsApi, usersApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  usersApi: { search: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
  hashtagsApi: { trending: vi.fn(), search: vi.fn() },
}));

const sweetener = { id: 7, nome: 'sweetener', nomeExibicao: 'Olivia Fã', fotoPerfil: 's.png', bio: 'guts', seguindo: false };
const mateus = { id: 8, nome: 'mateus', nomeExibicao: null, fotoPerfil: 'm.png', seguindo: true };

describe('SearchPage (buscar)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.search.mockResolvedValue([sweetener, mateus]);
    hashtagsApi.trending.mockResolvedValue([{ tag: 'GUTS', posts: 12 }, { tag: 'mpb', posts: 1 }]);
    hashtagsApi.search.mockResolvedValue([{ tag: 'guts', posts: 12 }]);
  });

  const campo = () => screen.getByRole('searchbox');
  const abaPessoas = () => userEvent.click(screen.getByRole('tab', { name: 'Pessoas' }));

  describe('aba Hashtags (abre primeiro)', () => {
    it('com o campo vazio mostra as hashtags em alta, com quantos posts, levando à página de cada uma', async () => {
      renderWithProviders(<SearchPage />);

      expect(screen.getByRole('heading', { level: 1, name: 'Buscar' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Hashtags' })).toHaveAttribute('aria-selected', 'true');
      expect(campo()).toHaveAccessibleName('Buscar hashtags');
      expect(campo()).toHaveFocus();

      const emAlta = await screen.findByRole('list', { name: 'Em alta agora' });
      const [primeira, segunda] = within(emAlta).getAllByRole('link');
      expect(primeira).toHaveAttribute('href', '/tag/GUTS');
      expect(primeira).toHaveTextContent('1#GUTS12 posts');
      expect(segunda).toHaveTextContent('2#mpb1 post');
    });

    it('sem hashtags ainda, convida a usar #', async () => {
      hashtagsApi.trending.mockResolvedValue([]);
      renderWithProviders(<SearchPage />);
      expect(await screen.findByText('Nenhuma hashtag ainda. Use # nos seus posts!')).toBeInTheDocument();
    });

    it('digitando, busca hashtags (com ou sem #)', async () => {
      renderWithProviders(<SearchPage />);
      await userEvent.type(campo(), '#gu');

      const achadas = await screen.findByRole('list', { name: 'Hashtags encontradas' });
      expect(hashtagsApi.search).toHaveBeenCalledWith('#gu');
      expect(within(achadas).getByRole('link')).toHaveAttribute('href', '/tag/guts');
      expect(screen.queryByRole('list', { name: 'Em alta agora' })).toBeNull();
    });

    it('avisa quando nenhuma hashtag é encontrada', async () => {
      hashtagsApi.search.mockResolvedValue([]);
      renderWithProviders(<SearchPage />);
      await userEvent.type(campo(), 'xyz');
      expect(await screen.findByText('Nenhuma hashtag com “xyz”.')).toBeInTheDocument();
    });

    it('digitar @ vai para a aba Pessoas', async () => {
      renderWithProviders(<SearchPage />);
      await userEvent.type(campo(), '@sw');
      expect(screen.getByRole('tab', { name: 'Pessoas' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByRole('list', { name: 'Pessoas encontradas' })).toBeInTheDocument();
      expect(usersApi.search).toHaveBeenCalledWith('@sw');
    });
  });

  describe('aba Pessoas', () => {
    it('busca enquanto digita e mostra nome, @, selo e o botão de seguir de cada pessoa', async () => {
      renderWithProviders(<SearchPage />);
      await abaPessoas();
      expect(campo()).toHaveAccessibleName('Buscar pessoas');
      expect(screen.getByText('Busque pelo nome ou pelo @.')).toBeInTheDocument();
      await userEvent.type(campo(), 'sw');

      const lista = await screen.findByRole('list', { name: 'Pessoas encontradas' });
      expect(usersApi.search).toHaveBeenCalledWith('sw');
      const [primeira, segunda] = within(lista).getAllByRole('listitem');
      expect(within(primeira).getByRole('link', { name: /Olivia Fã/ })).toHaveAttribute('href', '/perfil/7');
      expect(primeira).toHaveTextContent('@sweetener');
      expect(within(primeira).getByRole('img', { name: 'Verificado' })).toBeInTheDocument();
      expect(within(primeira).getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
      expect(within(segunda).getByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
    });

    it('não mostra botão de seguir para a própria pessoa', async () => {
      usersApi.search.mockResolvedValue([{ id: 1, nome: 'ana', fotoPerfil: 'a.png', seguindo: false }]);
      renderWithProviders(<SearchPage />);
      await abaPessoas();
      await userEvent.type(campo(), 'ana');
      const lista = await screen.findByRole('list', { name: 'Pessoas encontradas' });
      expect(within(lista).queryByRole('button')).toBeNull();
    });

    it('avisa quando ninguém é encontrado ou a busca falha', async () => {
      usersApi.search.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline'));
      renderWithProviders(<SearchPage />);
      await abaPessoas();
      await userEvent.type(campo(), 'xyz');
      expect(await screen.findByText('Ninguém encontrado para “xyz”.')).toBeInTheDocument();
      await userEvent.type(campo(), 'w');
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar agora. Tente de novo.');
    });

    it('digitar # vai para a aba Hashtags', async () => {
      renderWithProviders(<SearchPage />);
      await abaPessoas();
      await userEvent.type(campo(), '#g');
      expect(screen.getByRole('tab', { name: 'Hashtags' })).toHaveAttribute('aria-selected', 'true');
    });
  });
});
