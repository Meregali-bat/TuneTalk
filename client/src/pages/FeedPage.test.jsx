import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from './FeedPage.jsx';
import { musicApi, postsApi, usersApi } from '../api/index.js';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthContext } from '../auth/AuthContext.jsx';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  postsApi: { feed: vi.fn(), remove: vi.fn(), like: vi.fn(), unlike: vi.fn(), create: vi.fn() },
  musicApi: { search: vi.fn() },
  usersApi: { sugestoes: vi.fn(), follow: vi.fn(), unfollow: vi.fn(), presente: vi.fn(), abrirPresente: vi.fn() },
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
    // mockReset também descarta respostas "once" que um teste anterior não usou.
    postsApi.feed.mockReset();
    postsApi.feed.mockResolvedValue([post(1), post(2, 1)]);
    usersApi.presente.mockResolvedValue({ pendente: false });
    usersApi.abrirPresente.mockResolvedValue();
  });

  describe('presente dos 100 posts (disco de vinil)', () => {
    it('sem presente pendente, nada de disco', async () => {
      renderWithProviders(<FeedPage feed="foryou" />);
      await screen.findByText('post 1');
      expect(screen.queryByRole('button', { name: 'Abrir presente dos 100 posts' })).toBeNull();
    });

    it('tocar no disco abre os parabéns com o como usar, marca como aberto e o disco some', async () => {
      usersApi.presente.mockResolvedValue({ pendente: true });
      renderWithProviders(<FeedPage feed="foryou" />);
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir presente dos 100 posts' }));

      const dialog = screen.getByRole('dialog', { name: 'Parabéns pelos 100 posts!' });
      expect(dialog).toHaveTextContent('Editar perfil');
      expect(dialog).toHaveTextContent('Efeito do perfil');
      expect(usersApi.abrirPresente).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: 'Abrir presente dos 100 posts' })).toBeNull();
    });

    it('"Personalizar meu perfil" leva ao próprio perfil', async () => {
      usersApi.presente.mockResolvedValue({ pendente: true });
      renderWithProviders(<FeedPage feed="foryou" />);
      await userEvent.click(await screen.findByRole('button', { name: 'Abrir presente dos 100 posts' }));
      await userEvent.click(screen.getByRole('button', { name: 'Personalizar meu perfil' }));
      expect(screen.getByTestId('location')).toHaveTextContent('/perfil/1');
      expect(screen.queryByRole('dialog')).toBeNull();
    });
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

  it('"seguindo" vazio sugere quem seguir; depois de seguir alguém, dá para ver os posts', async () => {
    postsApi.feed.mockResolvedValue([]);
    usersApi.sugestoes.mockResolvedValue([
      { usuario: { id: 5, nome: 'caio', fotoPerfil: 'c.png' }, motivo: 'Notas parecidas com as suas em 3 discos' },
    ]);
    usersApi.follow.mockResolvedValue(null);
    renderWithProviders(<FeedPage feed="seguindo" />);

    const sugestoes = await screen.findByRole('region', { name: 'Quem seguir' });
    expect(within(sugestoes).getByText('Notas parecidas com as suas em 3 discos')).toBeInTheDocument();
    await userEvent.click(within(sugestoes).getByRole('button', { name: 'Seguir' }));
    expect(usersApi.follow).toHaveBeenCalledWith(5);

    postsApi.feed.mockResolvedValue([post(1)]);
    await userEvent.click(screen.getByRole('button', { name: 'Ver posts de quem você seguiu' }));
    expect(await screen.findByText('post 1')).toBeInTheDocument();
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

    // Os posts podem aparecer na tela um instante antes de o React ligar o observador: espera ele.
    const observador = async () => {
      await waitFor(() => expect(observados.length).toBeGreaterThan(0));
      return observados.at(-1);
    };
    const chegarPertoDoFim = async () => {
      const atual = await observador();
      act(() => atual.callback([{ isIntersecting: true }]));
    };
    const pagina = (de, quantos) => Array.from({ length: quantos }, (_, i) => ({
      ...post(de - i), data: new Date(Date.UTC(2024, 0, 1, 0, 0, de - i)).toISOString(),
    }));

    it('perto do fim já carrega a próxima página, a partir do último post', async () => {
      postsApi.feed.mockResolvedValueOnce(pagina(100, 20)).mockResolvedValueOnce(pagina(80, 5));
      renderWithProviders(<FeedPage feed="foryou" />);
      await screen.findByText('post 100');
      // Começa a buscar bem antes de o último post aparecer.
      expect((await observador()).opcoes.rootMargin).toBe('0px 0px 1500px 0px');

      await chegarPertoDoFim();

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

      await chegarPertoDoFim();
      await chegarPertoDoFim();
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

      await chegarPertoDoFim();
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

  describe('voltar de um post', () => {
    function PostDeMentira() {
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => navigate(-1)}>Voltar</button>
          <Link to="/foryou">Ir para o feed</Link>
        </>
      );
    }
    const abrirFeed = () => render(
      <AuthContext.Provider value={makeAuth()}>
        <MemoryRouter initialEntries={['/foryou']}>
          <Routes>
            <Route path="/foryou" element={<FeedPage feed="foryou" />} />
            <Route path="/post/:id" element={<PostDeMentira />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    it('o feed reaparece igual, no mesmo ponto da rolagem, sem buscar de novo', async () => {
      const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      abrirFeed();
      await screen.findByText('post 2');

      window.scrollY = 1234;
      await userEvent.click(screen.getAllByRole('link', { name: 'Comentários: 0' })[1]);
      await userEvent.click(await screen.findByRole('button', { name: 'Voltar' }));

      expect(await screen.findByText('post 2')).toBeInTheDocument();
      expect(postsApi.feed).toHaveBeenCalledTimes(1);
      expect(rolar).toHaveBeenLastCalledWith({ top: 1234, behavior: 'instant' });
      window.scrollY = 0;
    });

    it('entrar no feed por um link (não pelo voltar) busca de novo e começa do topo', async () => {
      const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      abrirFeed();
      await screen.findByText('post 2');
      window.scrollY = 1234;
      await userEvent.click(screen.getAllByRole('link', { name: 'Comentários: 0' })[1]);
      await userEvent.click(await screen.findByRole('link', { name: 'Ir para o feed' }));

      expect(await screen.findByText('post 2')).toBeInTheDocument();
      expect(postsApi.feed).toHaveBeenCalledTimes(2);
      expect(rolar).not.toHaveBeenCalledWith({ top: 1234, behavior: 'instant' });
      window.scrollY = 0;
    });
  });
});
