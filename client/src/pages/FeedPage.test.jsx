import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from './FeedPage.jsx';
import { musicApi, postsApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  postsApi: { feed: vi.fn(), remove: vi.fn(), like: vi.fn(), unlike: vi.fn(), create: vi.fn() },
  musicApi: { search: vi.fn() },
}));

const post = (id, autorId = 2) => ({
  id,
  texto: `post ${id}`,
  likes: 0,
  nota: 3,
  data: new Date().toISOString(),
  quantidadeComentarios: 0,
  tipo: 'música',
  titulo: `Música ${id}`,
  artista: 'Artista',
  capa: 'c.jpg',
  releaseDate: '120',
  preview: null,
  curtido: false,
  autor: { id: autorId, nome: 'Bia', fotoPerfil: 'b.png' },
});

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postsApi.feed.mockResolvedValue([post(1), post(2, 1)]);
  });

  it('carrega o feed "foryou" e destaca a aba', async () => {
    renderWithProviders(<FeedPage feed="foryou" />);

    expect(await screen.findByText('post 1')).toBeInTheDocument();
    expect(postsApi.feed).toHaveBeenCalledWith('foryou');
    expect(screen.getByRole('link', { name: 'Foryou' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Seguindo' })).toHaveAttribute('href', '/seguindo');
  });

  it('carrega o feed "seguindo"', async () => {
    renderWithProviders(<FeedPage feed="seguindo" />);
    await screen.findByText('post 1');
    expect(postsApi.feed).toHaveBeenCalledWith('seguindo');
    expect(screen.getByRole('link', { name: 'Seguindo' })).toHaveAttribute('aria-current', 'page');
  });

  it('mostra mensagem quando o feed está vazio', async () => {
    postsApi.feed.mockResolvedValue([]);
    renderWithProviders(<FeedPage feed="seguindo" />);
    expect(await screen.findByText('Nenhum post por aqui ainda.')).toBeInTheDocument();
  });

  it('mostra erro quando o feed falha', async () => {
    postsApi.feed.mockRejectedValue(new Error('Erro interno do servidor.'));
    renderWithProviders(<FeedPage feed="foryou" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.');
  });

  it('remove da lista o post apagado', async () => {
    postsApi.remove.mockResolvedValue(null);
    renderWithProviders(<FeedPage feed="foryou" />);
    await screen.findByText('post 2');

    const [, ownMenu] = screen.getAllByRole('button', { name: 'Opções do post' });
    await userEvent.click(ownMenu);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Deletar' }));

    await waitFor(() => expect(screen.queryByText('post 2')).toBeNull());
    expect(screen.getByText('post 1')).toBeInTheDocument();
  });

  it('recarrega o feed depois de criar um post', async () => {
    musicApi.search.mockResolvedValue([{ id: 9, titulo: 'Help!', artista: 'Beatles', capa: 'h.jpg', duracao: 100, preview: 'p' }]);
    postsApi.create.mockResolvedValue({ id: 3 });
    renderWithProviders(<FeedPage feed="foryou" />);
    await screen.findByText('post 1');

    await userEvent.click(screen.getByRole('button', { name: 'Criar post' }));
    await userEvent.type(screen.getByPlaceholderText('Digite a música'), 'help');
    await userEvent.click(await screen.findByRole('button', { name: 'Help! by Beatles (Track)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    await waitFor(() => expect(postsApi.feed).toHaveBeenCalledTimes(2));
  });
});
