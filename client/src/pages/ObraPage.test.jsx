import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ObraPage } from './ObraPage.jsx';
import { obrasApi } from '../api/index.js';
import { ApiError } from '../api/http.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  obrasApi: { get: vi.fn() },
  postsApi: { like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), pin: vi.fn(), unpin: vi.fn(), create: vi.fn() },
  musicApi: { preview: vi.fn(), search: vi.fn() },
}));

const post = (id, nota) => ({
  id, texto: `post ${id}`, likes: 0, nota, data: new Date().toISOString(), quantidadeComentarios: 0,
  tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: 'abbey.jpg', releaseDate: '1969-09-26',
  preview: null, curtido: false, parentId: null, autor: { id: 2, nome: 'bia', fotoPerfil: 'b.png' },
});

const resumo = {
  obra: { tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: 'abbey.jpg', releaseDate: '1969-09-26', preview: null },
  media: 8.5,
  avaliacoes: 2,
  distribuicao: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  posts: [post(1, 10), post(2, 7)],
};

const abrir = (rota = '/album?titulo=abbey%20road&artista=the%20beatles') =>
  renderWithProviders(<ObraPage tipo="album" />, { route: rota, path: '/album' });

describe('ObraPage (página do álbum ou música)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obrasApi.get.mockResolvedValue(resumo);
  });

  it('mostra o disco, a média de todo mundo e os posts sobre ele', async () => {
    abrir();
    const cabecalho = await screen.findByRole('region', { name: 'Abbey Road, de The Beatles' });
    expect(screen.getByRole('heading', { level: 1, name: 'Álbum' })).toBeInTheDocument();
    expect(obrasApi.get).toHaveBeenCalledWith('album', 'abbey road', 'the beatles', undefined);
    expect(within(cabecalho).getByRole('heading', { level: 2, name: 'Abbey Road' })).toBeInTheDocument();
    expect(within(cabecalho).getByText('Álbum • 1969')).toBeInTheDocument();
    expect(within(cabecalho).getByText('4,3')).toBeInTheDocument();
    expect(within(cabecalho).getByText('média de 2 pessoas')).toBeInTheDocument();
    expect(within(cabecalho).getByLabelText('Nota 4,5 de 5')).toBeInTheDocument();
    expect(cabecalho.querySelectorAll('.obra-dist__barra')).toHaveLength(10);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    // Aqui a música do post leva ao post, não de volta para esta página.
    expect(screen.getAllByAltText('Poster do álbum')[0].closest('a')).toHaveAttribute('href', '/post/1');
  });

  it('"Avaliar" abre o novo post com o álbum já escolhido', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: 'Avaliar este álbum' }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo post' });
    expect(within(dialogo).getByLabelText('Álbum escolhido')).toHaveTextContent('Abbey Road');
  });

  it('disco sem posts mostra o aviso do servidor', async () => {
    obrasApi.get.mockRejectedValue(new ApiError(404, 'Ninguém postou sobre isso ainda.'));
    abrir();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ninguém postou sobre isso ainda.');
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
  });
});
