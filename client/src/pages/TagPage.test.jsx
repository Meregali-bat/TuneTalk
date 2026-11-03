import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { TagPage } from './TagPage.jsx';
import { postsApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  postsApi: { byHashtag: vi.fn(), like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), pin: vi.fn(), unpin: vi.fn() },
  musicApi: { preview: vi.fn() },
}));

const post = (id, texto) => ({
  id, texto, likes: 0, nota: null, data: new Date().toISOString(), quantidadeComentarios: 0, tipo: null, titulo: null,
  artista: null, capa: null, releaseDate: null, preview: null, curtido: false, parentId: null,
  autor: { id: 2, nome: 'bia', fotoPerfil: 'b.png' },
});

const renderTag = (tag) => renderWithProviders(<TagPage />, { route: `/tag/${encodeURIComponent(tag)}`, path: '/tag/:tag' });

describe('TagPage (posts de uma hashtag)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mostra a hashtag no título e os posts com ela', async () => {
    postsApi.byHashtag.mockResolvedValue([post(1, 'ouvindo #GUTS'), post(2, 'de novo #guts')]);
    renderTag('GUTS');

    expect(await screen.findByText('ouvindo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '#GUTS' })).toBeInTheDocument();
    expect(postsApi.byHashtag).toHaveBeenCalledWith('GUTS');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('2 posts')).toBeInTheDocument();
  });

  it('aceita hashtag com acento', async () => {
    postsApi.byHashtag.mockResolvedValue([]);
    renderTag('músicaboa');
    expect(await screen.findByText('Ninguém usou #músicaboa ainda.')).toBeInTheDocument();
    expect(postsApi.byHashtag).toHaveBeenCalledWith('músicaboa');
  });
});
