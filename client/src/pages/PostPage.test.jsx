import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostPage } from './PostPage.jsx';
import { postsApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  postsApi: { get: vi.fn(), comment: vi.fn(), like: vi.fn(), unlike: vi.fn(), remove: vi.fn() },
}));

const detail = (comentarios = [{ id: 5, texto: 'concordo', autor: { id: 3, nome: 'Caio', fotoPerfil: 'c.png' } }]) => ({
  post: {
    id: 10, texto: 'que som', likes: 2, nota: 5, data: new Date().toISOString(), quantidadeComentarios: comentarios.length,
    tipo: 'música', titulo: 'Help!', artista: 'Beatles', capa: 'h.jpg', releaseDate: '100', preview: null,
    curtido: true, autor: { id: 1, nome: 'Ana', fotoPerfil: 'a.png' },
  },
  comentarios,
});

const renderPost = () => renderWithProviders(<PostPage />, { route: '/post/10', path: '/post/:id' });

describe('PostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postsApi.get.mockResolvedValue(detail());
  });

  it('mostra o post e os comentários', async () => {
    renderPost();
    expect(await screen.findByText('que som')).toBeInTheDocument();
    expect(postsApi.get).toHaveBeenCalledWith('10');
    expect(screen.getByText('concordo')).toBeInTheDocument();
    expect(screen.getByText('Caio').closest('.comment').querySelector('a')).toHaveAttribute('href', '/perfil/3');
    expect(screen.getByRole('button', { name: 'Descurtir' })).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Comentários: 1' })).toBeInTheDocument();
  });

  it('comenta e recarrega a lista', async () => {
    postsApi.comment.mockResolvedValue({ id: 6 });
    renderPost();
    await screen.findByText('que som');

    postsApi.get.mockResolvedValue(detail([
      { id: 6, texto: 'novo comentário', autor: { id: 1, nome: 'Ana', fotoPerfil: 'a.png' } },
      ...detail().comentarios,
    ]));
    await userEvent.type(screen.getByPlaceholderText('Poste sua resposta'), 'novo comentário');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar comentário' }));

    expect(postsApi.comment).toHaveBeenCalledWith(10, 'novo comentário');
    expect(await screen.findByText('novo comentário', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Poste sua resposta')).toHaveValue('');
  });

  it('não envia comentário vazio', async () => {
    renderPost();
    await screen.findByText('que som');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar comentário' }));
    expect(postsApi.comment).not.toHaveBeenCalled();
  });

  it('apagar o post volta para o feed', async () => {
    postsApi.remove.mockResolvedValue(null);
    renderPost();
    await screen.findByText('que som');

    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Deletar' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/foryou'));
  });

  it('mostra erro para post inexistente', async () => {
    postsApi.get.mockRejectedValue(new Error('Post não encontrado.'));
    renderPost();
    expect(await screen.findByRole('alert')).toHaveTextContent('Post não encontrado.');
  });
});
