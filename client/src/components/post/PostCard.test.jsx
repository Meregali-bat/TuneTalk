import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard.jsx';
import { postsApi } from '../../api/index.js';
import { renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({ postsApi: { like: vi.fn(), unlike: vi.fn(), remove: vi.fn() } }));

const musicPost = {
  id: 10,
  texto: 'que som',
  likes: 3,
  nota: 7,
  data: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  quantidadeComentarios: 2,
  tipo: 'música',
  titulo: 'Help!',
  artista: 'The Beatles',
  capa: 'help.jpg',
  releaseDate: '138',
  preview: 'help.mp3',
  curtido: false,
  autor: { id: 2, nome: 'Bia', fotoPerfil: 'bia.png' },
};

describe('PostCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('é um artigo identificado pelo autor e pela música', () => {
    renderWithProviders(<PostCard post={musicPost} />);
    expect(screen.getByRole('article', { name: 'Post de Bia sobre Help!' })).toBeInTheDocument();
  });

  it('mostra autor, data relativa em português, texto e dados da música', () => {
    renderWithProviders(<PostCard post={musicPost} />);

    expect(screen.getByText('Bia')).toBeInTheDocument();
    const time = screen.getByText('há 2 horas');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', musicPost.data);
    expect(screen.getByText('que som')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Help!' })).toBeInTheDocument();
    expect(screen.getByText('The Beatles • música • 2 min')).toBeInTheDocument();
    expect(screen.getByLabelText('Nota 7 de 10')).toBeInTheDocument();
    expect(screen.getByText('7/10')).toBeInTheDocument();
    expect(screen.getByAltText('Poster da música')).toHaveAttribute('src', 'help.jpg');
    expect(screen.getByRole('button', { name: 'Tocar prévia' })).toBeInTheDocument();
  });

  it('linka para o perfil do autor e para o post', () => {
    renderWithProviders(<PostCard post={musicPost} />);
    expect(screen.getByRole('link', { name: 'Bia' })).toHaveAttribute('href', '/perfil/2');
    expect(screen.getByRole('link', { name: /Comentários: 2/ })).toHaveAttribute('href', '/post/10');
  });

  it('mostra álbum com ano e sem botão de play', () => {
    renderWithProviders(
      <PostCard post={{ ...musicPost, tipo: 'album', titulo: 'Abbey Road', capa: 'abbey.jpg', releaseDate: '1969-09-', preview: null }} />,
    );
    expect(screen.getByRole('heading', { name: 'Abbey Road' })).toBeInTheDocument();
    expect(screen.getByText('The Beatles • álbum • 1969')).toBeInTheDocument();
    expect(screen.getByAltText('Poster do álbum')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tocar prévia' })).toBeNull();
  });

  it('o autor pode apagar o post', async () => {
    postsApi.remove.mockResolvedValue(null);
    const onDeleted = vi.fn();
    renderWithProviders(<PostCard post={{ ...musicPost, autor: { ...musicPost.autor, id: 1 } }} onDeleted={onDeleted} />);

    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Deletar' }));

    expect(postsApi.remove).toHaveBeenCalledWith(10);
    expect(onDeleted).toHaveBeenCalledWith(10);
  });

  it('não mostra parágrafo vazio quando o post não tem texto', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, texto: '' }} />);
    expect(screen.queryByTestId('post-text')).toBeNull();
  });

  it('usa a contagem de comentários informada quando fornecida', () => {
    renderWithProviders(<PostCard post={musicPost} commentCount={5} />);
    expect(screen.getByRole('link', { name: /Comentários: 5/ })).toBeInTheDocument();
  });
});
