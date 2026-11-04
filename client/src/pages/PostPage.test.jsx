import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostPage } from './PostPage.jsx';
import { postsApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  postsApi: { get: vi.fn(), create: vi.fn(), like: vi.fn(), unlike: vi.fn(), remove: vi.fn() },
  musicApi: { search: vi.fn() },
}));

const ana = { id: 1, nome: 'Ana', fotoPerfil: 'a.png' };
const caio = { id: 3, nome: 'Caio', fotoPerfil: 'c.png' };

const base = {
  likes: 0, nota: null, data: new Date().toISOString(), quantidadeComentarios: 0, tipo: null, titulo: null,
  artista: null, capa: null, releaseDate: null, preview: null, curtido: false, parentId: null,
};
const mainPost = {
  ...base, id: 10, texto: 'que som', likes: 2, nota: 5, tipo: 'música', titulo: 'Help!', artista: 'Beatles',
  capa: 'h.jpg', releaseDate: '100', curtido: true, autor: ana,
};
const reply = (id, texto, autor = caio, extra = {}) => ({ ...base, id, texto, parentId: 10, autor, ...extra });

const detail = ({ respostas = [reply(5, 'concordo')], pai = null, post = mainPost } = {}) => ({
  post: { ...post, quantidadeComentarios: respostas.length },
  pai,
  respostas,
});

const renderPost = (id = 10) => renderWithProviders(<PostPage />, { route: `/post/${id}`, path: '/post/:id' });

describe('PostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postsApi.get.mockResolvedValue(detail());
  });

  it('mostra um esqueleto enquanto carrega', () => {
    postsApi.get.mockReturnValue(new Promise(() => {}));
    renderPost();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando post');
  });

  it('mostra o post em destaque e os comentários como posts', async () => {
    renderPost();

    const principal = await screen.findByRole('article', { name: 'Post de Ana sobre Help!' });
    expect(postsApi.get).toHaveBeenCalledWith('10');
    expect(within(principal).getByText('que som')).toBeInTheDocument();
    expect(within(principal).getByRole('button', { name: 'Descurtir' })).toHaveTextContent('2');
    expect(within(principal).getByRole('link', { name: 'Comentários: 1' })).toBeInTheDocument();

    const comentarios = screen.getByRole('region', { name: 'Comentários' });
    const resposta = within(comentarios).getByRole('article', { name: 'Post de Caio' });
    expect(within(resposta).getByText('concordo')).toBeInTheDocument();
    expect(within(resposta).getByRole('link', { name: 'Caio' })).toHaveAttribute('href', '/perfil/3');
    expect(within(resposta).getByRole('button', { name: 'Curtir' })).toBeInTheDocument();
  });

  it('comentário com música mostra a música e a nota', async () => {
    postsApi.get.mockResolvedValue(detail({
      respostas: [reply(5, 'ouve essa', caio, { tipo: 'música', titulo: 'Yesterday', artista: 'Beatles', capa: 'y.jpg', nota: 8 })],
    }));
    renderPost();
    expect(await screen.findByRole('article', { name: 'Post de Caio sobre Yesterday' })).toBeInTheDocument();
  });

  it('sem comentários convida a começar a conversa', async () => {
    postsApi.get.mockResolvedValue(detail({ respostas: [] }));
    renderPost();
    expect(await screen.findByText('Ninguém comentou ainda. Que tal começar?')).toBeInTheDocument();
  });

  it('comenta pelo compositor (texto, música opcional) e recarrega', async () => {
    postsApi.create.mockResolvedValue({ id: 6 });
    renderPost();
    await userEvent.click(await screen.findByRole('button', { name: 'Comentar' }));

    const dialog = screen.getByRole('dialog', { name: 'Comentar' });
    expect(dialog).toHaveTextContent('Respondendo a Ana');
    expect(within(dialog).getByRole('button', { name: 'Adicionar música ou álbum' })).toBeInTheDocument();
    // Enquete só em post, não em comentário.
    expect(within(dialog).queryByRole('button', { name: /Criar enquete/ })).toBeNull();

    postsApi.get.mockResolvedValue(detail({ respostas: [reply(5, 'concordo'), reply(6, 'demais', ana)] }));
    await userEvent.type(within(dialog).getByLabelText('Seu comentário'), 'demais');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Comentar' }));

    expect(postsApi.create).toHaveBeenCalledWith({ texto: 'demais', parentId: 10 });
    expect(await screen.findByText('demais')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('quando o post é um comentário, linka para o post respondido', async () => {
    const pai = { ...mainPost, id: 1, autor: caio, quantidadeComentarios: 1 };
    postsApi.get.mockResolvedValue(detail({ post: reply(10, 'concordo', ana, { parentId: 1 }), pai, respostas: [] }));
    renderPost();

    const link = await screen.findByRole('link', { name: /Em resposta a Caio/ });
    expect(link).toHaveAttribute('href', '/post/1');
  });

  it('abrir um comentário mostra os dados dele, sem herdar a curtida do post anterior', async () => {
    renderPost();
    const resposta = await screen.findByRole('article', { name: 'Post de Caio' });

    postsApi.get.mockResolvedValue(detail({ post: reply(5, 'concordo', caio, { likes: 0 }), pai: mainPost, respostas: [] }));
    await userEvent.click(within(resposta).getByRole('link', { name: 'Comentários: 0' }));

    const principal = await screen.findByRole('article', { name: 'Post de Caio' });
    expect(postsApi.get).toHaveBeenLastCalledWith('5');
    expect(within(principal).getByRole('button', { name: 'Curtir' })).toHaveTextContent('0');
  });

  describe('conversa dentro dos comentários (como no Twitter)', () => {
    const respostaDaResposta = reply(20, 'boa pergunta', ana, { parentId: 5 });

    it('mostra a primeira resposta de cada comentário logo abaixo dele', async () => {
      postsApi.get.mockResolvedValue(detail({
        respostas: [{ ...reply(5, 'concordo', caio, { quantidadeComentarios: 1 }), primeiraResposta: respostaDaResposta }],
      }));
      renderPost();

      const conversa = await screen.findByRole('group', { name: 'Conversa do comentário de Caio' });
      expect(within(conversa).getByText('concordo')).toBeInTheDocument();
      expect(within(conversa).getByText('boa pergunta')).toBeInTheDocument();
      // Mesma coluna, como no Twitter: o comentário se liga à resposta pela linha; a última não tem linha.
      const [comentario, resposta] = within(conversa).getAllByRole('article');
      expect(comentario).toHaveClass('post-card--continua');
      expect(resposta).not.toHaveClass('post-card--continua');
      expect(within(conversa).queryByRole('button', { name: /Mostrar respostas/ })).toBeNull();
    });

    it('"Mostrar respostas" traz as outras respostas daquele comentário ali mesmo', async () => {
      postsApi.get.mockResolvedValueOnce(detail({
        respostas: [{ ...reply(5, 'concordo', caio, { quantidadeComentarios: 3 }), primeiraResposta: respostaDaResposta }],
      }));
      renderPost();
      const conversa = await screen.findByRole('group', { name: 'Conversa do comentário de Caio' });

      postsApi.get.mockResolvedValueOnce(detail({
        post: reply(5, 'concordo', caio),
        respostas: [respostaDaResposta, reply(21, 'eu também', caio, { parentId: 5 }), reply(22, 'e eu', ana, { parentId: 5 })],
      }));
      await userEvent.click(within(conversa).getByRole('button', { name: 'Mostrar respostas' }));

      expect(postsApi.get).toHaveBeenLastCalledWith(5);
      expect(await within(conversa).findByText('e eu')).toBeInTheDocument();
      expect(within(conversa).getByText('eu também')).toBeInTheDocument();
      expect(within(conversa).getAllByText('boa pergunta')).toHaveLength(1);
      expect(within(conversa).getAllByRole('article').map((a) => a.classList.contains('post-card--continua')))
        .toEqual([true, true, true, false]);
      expect(within(conversa).queryByRole('button', { name: /Mostrar respostas/ })).toBeNull();
    });
  });

  it('a resposta tem respostas próprias: "Mostrar respostas" aparece e continua a conversa na mesma coluna', async () => {
    const resposta = reply(20, 'nem fudendo q da pra postar foto', ana, { parentId: 5, quantidadeComentarios: 1 });
    postsApi.get.mockResolvedValueOnce(detail({
      respostas: [{ ...reply(5, 'olha isso', caio, { quantidadeComentarios: 1 }), primeiraResposta: resposta }],
    }));
    renderPost();
    const conversa = await screen.findByRole('group', { name: 'Conversa do comentário de Caio' });

    postsApi.get
      .mockResolvedValueOnce(detail({ post: reply(5, 'olha isso', caio), respostas: [resposta] }))
      .mockResolvedValueOnce(detail({ post: resposta, respostas: [reply(30, 'dá sim kkk', caio, { parentId: 20 })] }));
    await userEvent.click(within(conversa).getByRole('button', { name: 'Mostrar respostas' }));

    expect(await within(conversa).findByText('dá sim kkk')).toBeInTheDocument();
    expect(postsApi.get).toHaveBeenCalledWith(20);
    expect(within(conversa).getAllByRole('article').map((a) => a.textContent.includes('dá sim kkk'))).toEqual([false, false, true]);
    expect(within(conversa).queryByRole('button', { name: 'Mostrar respostas' })).toBeNull();
  });

  it('apagar um comentário tira ele da lista', async () => {
    postsApi.get.mockResolvedValue(detail({ respostas: [reply(5, 'meu comentário', ana)] }));
    postsApi.remove.mockResolvedValue(null);
    renderPost();

    const resposta = await screen.findByRole('article', { name: 'Post de Ana' });
    await userEvent.click(within(resposta).getByRole('button', { name: 'Opções do post' }));
    await userEvent.click(within(resposta).getByRole('menuitem', { name: 'Deletar' }));

    expect(postsApi.remove).toHaveBeenCalledWith(5);
    await waitFor(() => expect(screen.queryByText('meu comentário')).toBeNull());
    expect(screen.getByRole('link', { name: 'Comentários: 0' })).toBeInTheDocument();
  });

  it('apagar o post volta para o feed', async () => {
    postsApi.remove.mockResolvedValue(null);
    renderPost();
    const principal = await screen.findByRole('article', { name: 'Post de Ana sobre Help!' });

    await userEvent.click(within(principal).getByRole('button', { name: 'Opções do post' }));
    await userEvent.click(within(principal).getByRole('menuitem', { name: 'Deletar' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/foryou'));
  });

  it('mostra erro para post inexistente', async () => {
    postsApi.get.mockRejectedValue(new Error('Post não encontrado.'));
    renderPost();
    expect(await screen.findByRole('alert')).toHaveTextContent('Post não encontrado.');
  });
});
