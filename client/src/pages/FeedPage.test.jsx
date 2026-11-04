import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByRole('link', { name: 'Para você' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Seguindo' })).toHaveAttribute('href', '/seguindo');
  });

  it('carrega o feed "seguindo"', async () => {
    renderWithProviders(<FeedPage feed="seguindo" />);
    await screen.findByText('post 1');
    expect(postsApi.feed).toHaveBeenCalledWith('seguindo');
    expect(screen.getByRole('link', { name: 'Seguindo' })).toHaveAttribute('aria-current', 'page');
  });

  it('mostra posts de exemplo carregando enquanto busca', async () => {
    let resolve;
    postsApi.feed.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderWithProviders(<FeedPage feed="foryou" />);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando posts');
    resolve([post(1)]);
    expect(await screen.findByText('post 1')).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('feed "para você" vazio convida a postar', async () => {
    postsApi.feed.mockResolvedValue([]);
    renderWithProviders(<FeedPage feed="foryou" />);
    expect(await screen.findByRole('heading', { name: 'Ainda não há posts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fazer o primeiro post' })).toBeInTheDocument();
  });

  it('feed "seguindo" vazio sugere ver os posts para você', async () => {
    postsApi.feed.mockResolvedValue([]);
    renderWithProviders(<FeedPage feed="seguindo" />);
    expect(await screen.findByRole('heading', { name: 'Nada de quem você segue ainda' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver posts para você' })).toHaveAttribute('href', '/foryou');
  });

  it('mostra erro quando o feed falha e permite tentar de novo', async () => {
    postsApi.feed.mockRejectedValueOnce(new Error('Erro interno do servidor.')).mockResolvedValueOnce([post(1)]);
    renderWithProviders(<FeedPage feed="foryou" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno do servidor.');

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('post 1')).toBeInTheDocument();
  });

  it('o botão do estado vazio abre a criação de post', async () => {
    postsApi.feed.mockResolvedValue([]);
    renderWithProviders(<FeedPage feed="foryou" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Fazer o primeiro post' }));
    expect(screen.getByRole('dialog', { name: 'Novo post' })).toBeInTheDocument();
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

  it('no celular, arrastar para baixo no topo recarrega o feed', async () => {
    window.scrollY = 0;
    renderWithProviders(<FeedPage feed="foryou" />);
    await screen.findByText('post 1');

    fireEvent.touchStart(window, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(window, { touches: [{ clientY: 320 }] });
    fireEvent.touchEnd(window, { touches: [] });

    await waitFor(() => expect(postsApi.feed).toHaveBeenCalledTimes(2));
  });

  it('recarrega o feed depois de criar um post', async () => {
    musicApi.search.mockResolvedValue([{ id: 9, titulo: 'Help!', artista: 'Beatles', capa: 'h.jpg', duracao: 100, preview: 'p' }]);
    postsApi.create.mockResolvedValue({ id: 3 });
    renderWithProviders(<FeedPage feed="foryou" />);
    await screen.findByText('post 1');

    await userEvent.click(screen.getByRole('button', { name: 'Criar post' }));
    await userEvent.type(screen.getByLabelText('O que você quer dizer?'), 'bom dia');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(postsApi.feed).toHaveBeenCalledTimes(2));
  });

  describe('rolagem infinita', () => {
    // Simula o fim da lista chegando perto da tela.
    let observados;
    beforeEach(() => {
      observados = [];
      vi.stubGlobal('IntersectionObserver', class {
        constructor(callback, opcoes) {
          this.callback = callback;
          this.opcoes = opcoes;
        }
        observe(el) { observados.push(this); this.el = el; }
        disconnect() { observados = observados.filter((o) => o !== this); }
      });
    });
    afterEach(() => vi.unstubAllGlobals());

    const chegarPertoDoFim = () => act(() => {
      observados.at(-1).callback([{ isIntersecting: true }]);
    });
    const pagina = (de, quantos) => Array.from({ length: quantos }, (_, i) => ({
      ...post(de - i), data: new Date(Date.UTC(2024, 0, 1, 0, 0, de - i)).toISOString(),
    }));

    it('perto do fim já carrega a próxima página, a partir do último post', async () => {
      postsApi.feed.mockResolvedValueOnce(pagina(100, 20)).mockResolvedValueOnce(pagina(80, 5));
      renderWithProviders(<FeedPage feed="foryou" />);
      await screen.findByText('post 100');
      // Começa a buscar bem antes de o último post aparecer.
      expect(observados.at(-1).opcoes.rootMargin).toBe('0px 0px 1500px 0px');

      chegarPertoDoFim();

      expect(await screen.findByText('post 76')).toBeInTheDocument();
      expect(postsApi.feed).toHaveBeenLastCalledWith('foryou', { data: pagina(81, 1)[0].data, id: 81 });
      expect(screen.getAllByRole('article')).toHaveLength(25);
      // Página menor que 20: acabou, e não pede mais nada.
      expect(screen.getByText('Você chegou ao fim.')).toBeInTheDocument();
      expect(observados).toHaveLength(0);
    });

    it('não pede a mesma página duas vezes enquanto ela carrega', async () => {
      let terminar;
      postsApi.feed.mockResolvedValueOnce(pagina(100, 20)).mockReturnValueOnce(new Promise((r) => { terminar = r; }));
      renderWithProviders(<FeedPage feed="foryou" />);
      await screen.findByText('post 100');

      chegarPertoDoFim();
      chegarPertoDoFim();
      expect(screen.getByRole('status')).toHaveTextContent('Carregando mais posts');
      expect(postsApi.feed).toHaveBeenCalledTimes(2);

      await act(async () => terminar([]));
      expect(screen.getByText('Você chegou ao fim.')).toBeInTheDocument();
    });

    it('se a página seguinte falhar, deixa tentar de novo', async () => {
      postsApi.feed
        .mockResolvedValueOnce(pagina(100, 20))
        .mockRejectedValueOnce(new Error('sem rede'))
        .mockResolvedValueOnce(pagina(80, 3));
      renderWithProviders(<FeedPage feed="foryou" />);
      await screen.findByText('post 100');

      chegarPertoDoFim();
      await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));

      expect(await screen.findByText('post 78')).toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(23);
    });

    it('feed com menos de uma página já mostra que acabou', async () => {
      renderWithProviders(<FeedPage feed="foryou" />);
      await screen.findByText('post 1');
      expect(screen.getByText('Você chegou ao fim.')).toBeInTheDocument();
      expect(postsApi.feed).toHaveBeenCalledTimes(1);
    });
  });
});
