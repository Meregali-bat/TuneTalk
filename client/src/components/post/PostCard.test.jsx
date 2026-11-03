import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard.jsx';
import { postsApi } from '../../api/index.js';
import { renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({
  postsApi: { like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), pin: vi.fn(), unpin: vi.fn() },
}));

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
    expect(screen.getByLabelText('Nota 3,5 de 5')).toBeInTheDocument();
    expect(screen.getByText('3,5/5')).toBeInTheDocument();
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

  describe('sem música', () => {
    const textPost = { ...musicPost, tipo: null, titulo: null, artista: null, capa: null, nota: null, preview: null };

    it('é identificado só pelo autor e não mostra bloco de música nem nota', () => {
      renderWithProviders(<PostCard post={textPost} />);
      expect(screen.getByRole('article', { name: 'Post de Bia' })).toBeInTheDocument();
      expect(screen.getByText('que som')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /Poster/ })).toBeNull();
      expect(screen.queryByText(/\/5/)).toBeNull();
    });
  });

  it('no destaque (página do post) o texto não é link', () => {
    renderWithProviders(<PostCard post={musicPost} variant="detail" />);
    expect(screen.getByText('que som').closest('a')).toBeNull();
    expect(screen.getByRole('article')).toHaveClass('post-card--detail');
  });

  describe('fixar no perfil', () => {
    const meu = { ...musicPost, autor: { id: 1, nome: 'Ana', fotoPerfil: 'a.png' }, fixado: false };
    const abrirMenu = () => userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));

    it('o autor fixa pelo menu e avisa quem mostra o card', async () => {
      postsApi.pin.mockResolvedValue(null);
      const onPinChange = vi.fn();
      renderWithProviders(<PostCard post={meu} onPinChange={onPinChange} />);

      await abrirMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Fixar no perfil' }));

      expect(postsApi.pin).toHaveBeenCalledWith(10);
      expect(onPinChange).toHaveBeenCalledWith(10, true);
      await abrirMenu();
      expect(screen.getByRole('menuitem', { name: 'Desafixar do perfil' })).toBeInTheDocument();
    });

    it('desafixa o post fixado', async () => {
      postsApi.unpin.mockResolvedValue(null);
      renderWithProviders(<PostCard post={{ ...meu, fixado: true }} />);
      await abrirMenu();
      await userEvent.click(screen.getByRole('menuitem', { name: 'Desafixar do perfil' }));
      expect(postsApi.unpin).toHaveBeenCalledWith(10);
    });

    it('comentário não pode ser fixado', async () => {
      renderWithProviders(<PostCard post={{ ...meu, parentId: 3 }} />);
      await abrirMenu();
      expect(screen.queryByRole('menuitem', { name: /fixar/i })).toBeNull();
    });

    it('no perfil (showPinned), o post fixado tem a etiqueta "Fixado"; no feed, não', () => {
      const { unmount } = renderWithProviders(<PostCard post={{ ...meu, fixado: true }} showPinned />);
      expect(screen.getByText('Fixado')).toBeInTheDocument();
      unmount();
      renderWithProviders(<PostCard post={{ ...meu, fixado: true }} />);
      expect(screen.queryByText('Fixado')).toBeNull();
    });
  });

  it('usa a contagem de comentários informada quando fornecida', () => {
    renderWithProviders(<PostCard post={musicPost} commentCount={5} />);
    expect(screen.getByRole('link', { name: /Comentários: 5/ })).toBeInTheDocument();
  });
});
