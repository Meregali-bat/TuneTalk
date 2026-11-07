import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ReplaysPage } from './ReplaysPage.jsx';
import { postsApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  postsApi: { replays: vi.fn(), like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), pin: vi.fn(), unpin: vi.fn() },
  musicApi: { preview: vi.fn() },
}));

const bia = { id: 2, nome: 'bia', fotoPerfil: 'b.png' };
const original = {
  id: 10, texto: 'que som', likes: 0, nota: null, data: new Date().toISOString(), quantidadeComentarios: 0, tipo: null,
  titulo: null, artista: null, capa: null, releaseDate: null, preview: null, curtido: false, parentId: null, autor: bia,
};
const replay = (id, texto) => ({ ...original, id, texto, citadoId: 10, citado: original, autor: { id: 3, nome: 'caio', fotoPerfil: 'c.png' } });

const renderReplays = () => renderWithProviders(<ReplaysPage />, { route: '/post/10/replays', path: '/post/:id/replays' });

describe('ReplaysPage (quem deu replay um post)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista os replays do post, cada um com o post original dentro', async () => {
    postsApi.replays.mockResolvedValue([replay(21, 'discordo'), replay(20, 'concordo')]);
    renderReplays();

    expect(await screen.findByText('discordo')).toBeInTheDocument();
    expect(postsApi.replays).toHaveBeenCalledWith('10');
    expect(screen.getByRole('heading', { level: 1, name: 'Replays' })).toBeInTheDocument();
    expect(screen.getByText('2 replays')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Post original de bia' })).toHaveLength(2);
  });

  it('sem replays, diz que ninguém deu replay ainda', async () => {
    postsApi.replays.mockResolvedValue([]);
    renderReplays();
    expect(await screen.findByText('Ninguém deu replay nesse post ainda.')).toBeInTheDocument();
  });
});
