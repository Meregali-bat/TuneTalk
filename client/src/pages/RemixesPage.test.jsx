import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { RemixesPage } from './RemixesPage.jsx';
import { postsApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  postsApi: { remixes: vi.fn(), like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), pin: vi.fn(), unpin: vi.fn() },
  musicApi: { preview: vi.fn() },
}));

const bia = { id: 2, nome: 'bia', fotoPerfil: 'b.png' };
const original = {
  id: 10, texto: 'que som', likes: 0, nota: null, data: new Date().toISOString(), quantidadeComentarios: 0, tipo: null,
  titulo: null, artista: null, capa: null, releaseDate: null, preview: null, curtido: false, parentId: null, autor: bia,
};
const remix = (id, texto) => ({ ...original, id, texto, citadoId: 10, citado: original, autor: { id: 3, nome: 'caio', fotoPerfil: 'c.png' } });

const renderRemixes = () => renderWithProviders(<RemixesPage />, { route: '/post/10/remixes', path: '/post/:id/remixes' });

describe('RemixesPage (quem remixou um post)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista os remixes do post, cada um com o post original dentro', async () => {
    postsApi.remixes.mockResolvedValue([remix(21, 'discordo'), remix(20, 'concordo')]);
    renderRemixes();

    expect(await screen.findByText('discordo')).toBeInTheDocument();
    expect(postsApi.remixes).toHaveBeenCalledWith('10');
    expect(screen.getByRole('heading', { level: 1, name: 'Remixes' })).toBeInTheDocument();
    expect(screen.getByText('2 remixes')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Post original de bia' })).toHaveLength(2);
  });

  it('sem remixes, diz que ninguém remixou ainda', async () => {
    postsApi.remixes.mockResolvedValue([]);
    renderRemixes();
    expect(await screen.findByText('Ninguém remixou esse post ainda.')).toBeInTheDocument();
  });
});
