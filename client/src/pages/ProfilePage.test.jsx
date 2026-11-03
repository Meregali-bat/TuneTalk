import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from './ProfilePage.jsx';
import { musicApi, postsApi, usersApi } from '../api/index.js';
import { makeAuth, renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  usersApi: { profile: vi.fn(), comments: vi.fn(), updateFavorites: vi.fn(), follow: vi.fn(), unfollow: vi.fn(), updateMe: vi.fn(), changePassword: vi.fn() },
  postsApi: { like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), create: vi.fn(), pin: vi.fn(), unpin: vi.fn() },
  musicApi: { search: vi.fn() },
}));

const bia = { id: 2, nome: 'bia', fotoPerfil: 'bia.png', bio: 'curto rock' };

const post = (id, nota) => ({
  id, texto: `post ${id}`, likes: 1, nota, data: new Date().toISOString(), quantidadeComentarios: 0,
  tipo: 'música', titulo: 'Help!', artista: 'Beatles', capa: 'h.jpg', releaseDate: '100', preview: null,
  curtido: false, autor: { id: 2, nome: 'bia', fotoPerfil: 'bia.png' },
});

const profile = (overrides = {}) => ({
  usuario: bia,
  posts: [post(10, 8), post(11, 7)],
  quantidadePosts: 2,
  quantidadeSeguidores: 1,
  quantidadeSeguindo: 0,
  seguidores: [{ id: 3, nome: 'caio', fotoPerfil: 'c.png', bio: 'baterista' }],
  seguindo: [],
  seguindoIds: [],
  ...overrides,
});

// No editor de favoritos: toca na capa (abre a barra de ações) e depois em "Tirar".
const tirarFavorito = async (titulo, onde = screen) => {
  await userEvent.click(onde.getByRole('button', { name: new RegExp(`º: ${titulo.replace(/[!?.]/g, '\\$&')}$`) }));
  await userEvent.click(onde.getByRole('button', { name: `Tirar ${titulo}` }));
};

const renderProfile = (id = 2, auth) =>
  renderWithProviders(<ProfilePage />, { route: `/perfil/${id}`, path: '/perfil/:id', auth });

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.profile.mockResolvedValue(profile());
  });

  it('mostra um esqueleto enquanto carrega', () => {
    usersApi.profile.mockReturnValue(new Promise(() => {}));
    renderProfile();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando perfil');
  });

  it('mostra foto, nome, bio, números e posts', async () => {
    renderProfile();

    expect(await screen.findByRole('heading', { level: 1, name: 'bia' })).toBeInTheDocument();
    expect(usersApi.profile).toHaveBeenCalledWith('2');
    expect(screen.getByAltText('Foto de perfil de bia')).toHaveAttribute('src', 'bia.png');
    expect(screen.getByText('curto rock')).toBeInTheDocument();

    const stats = screen.getByRole('list', { name: 'Números do perfil' });
    expect(within(stats).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '2Posts', '1Seguidores', '0Seguindo',
    ]);
    expect(screen.getByText(/de média em 2 notas/)).toHaveTextContent('3,8/5 de média em 2 notas');
    expect(screen.getByRole('tab', { name: 'Posts' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('post 10')).toBeInTheDocument();
  });

  it('a nota média ignora posts sem música', async () => {
    const soTexto = { ...post(12, null), titulo: null, tipo: null };
    usersApi.profile.mockResolvedValue(profile({ posts: [post(10, 8), soTexto], quantidadePosts: 2 }));
    renderProfile();
    expect(await screen.findByText(/de média em 1 nota/)).toHaveTextContent('4,0/5 de média em 1 nota');
  });

  it('sem posts com nota não mostra nota média', async () => {
    const soTexto = { ...post(12, null), titulo: null, tipo: null };
    usersApi.profile.mockResolvedValue(profile({ posts: [soTexto], quantidadePosts: 1 }));
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });
    expect(screen.queryByText(/de média em/)).toBeNull();
  });

  describe('cabeçalho no estilo do Twitter', () => {
    it('mostra o nome de exibição, o @ do nome de usuário e a capa', async () => {
      usersApi.profile.mockResolvedValue(profile({
        usuario: { ...bia, nomeExibicao: 'Bia Souza', bannerUrl: 'capa.jpg' },
      }));
      renderProfile();

      expect(await screen.findByRole('heading', { level: 1, name: 'Bia Souza' })).toBeInTheDocument();
      expect(document.querySelector('.profile-header__handle')).toHaveTextContent('@bia');
      expect(screen.getByAltText('Capa do perfil de Bia Souza')).toHaveAttribute('src', 'capa.jpg');
      expect(screen.getByAltText('Foto de perfil de Bia Souza')).toBeInTheDocument();
    });

    it('sem nome de exibição nem capa: mostra o nome de usuário e uma capa padrão', async () => {
      renderProfile();
      expect(await screen.findByRole('heading', { level: 1, name: 'bia' })).toBeInTheDocument();
      expect(document.querySelector('.profile-header__handle')).toHaveTextContent('@bia');
      expect(screen.queryByAltText(/Capa do perfil/)).toBeNull();
      expect(screen.getByTestId('capa-padrao')).toBeInTheDocument();
    });
  });

  it('sem posts não mostra nota média', async () => {
    usersApi.profile.mockResolvedValue(profile({ posts: [], quantidadePosts: 0 }));
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });
    expect(screen.queryByText(/de média em/)).toBeNull();
  });

  it('permite seguir e atualiza os números', async () => {
    usersApi.follow.mockResolvedValue(null);
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });

    usersApi.profile.mockResolvedValue(profile({ seguindoIds: [2], quantidadeSeguidores: 2 }));
    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));

    expect(usersApi.follow).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seguidores: 2' })).toBeInTheDocument();
  });

  it('abre a lista de seguidores com nome e bio', async () => {
    renderProfile();
    await userEvent.click(await screen.findByRole('button', { name: 'Seguidores: 1' }));

    const dialog = screen.getByRole('dialog', { name: 'Seguidores' });
    expect(within(dialog).getByText('caio')).toBeInTheDocument();
    expect(within(dialog).getByText('baterista')).toBeInTheDocument();
  });

  it('perfil de outra pessoa sem posts', async () => {
    usersApi.profile.mockResolvedValue(profile({ posts: [], quantidadePosts: 0 }));
    renderProfile();
    expect(await screen.findByText('bia ainda não postou nada.')).toBeInTheDocument();
  });

  describe('próprio perfil', () => {
    const ana = { id: 1, nome: 'ana', fotoPerfil: 'a.png', bio: '' };

    it('mostra "Editar perfil" no lugar de seguir', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana }));
      renderProfile(1);
      expect(await screen.findByRole('button', { name: 'Editar perfil' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull();
    });

    it('fixar um post recarrega o perfil (ele vai para o topo, com a etiqueta)', async () => {
      const meuPost = (id, extra) => ({ ...post(id, 8), autor: { id: 1, nome: 'ana', fotoPerfil: 'a.png' }, fixado: false, ...extra });
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, posts: [meuPost(10), meuPost(11)] }));
      postsApi.pin.mockResolvedValue(null);
      renderProfile(1);

      await screen.findByText('post 11');
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, posts: [meuPost(11, { fixado: true }), meuPost(10)] }));
      const cards = screen.getAllByRole('article');
      await userEvent.click(within(cards[1]).getByRole('button', { name: 'Opções do post' }));
      await userEvent.click(within(cards[1]).getByRole('menuitem', { name: 'Fixar no perfil' }));

      expect(postsApi.pin).toHaveBeenCalledWith(11);
      await waitFor(() => expect(usersApi.profile).toHaveBeenCalledTimes(2));
      const primeiro = (await screen.findAllByRole('article'))[0];
      expect(within(primeiro).getByText('Fixado')).toBeInTheDocument();
      expect(within(primeiro).getByText('post 11')).toBeInTheDocument();
    });

    it('"Editar perfil" com mudanças pergunta antes de fechar ou ir trocar a senha', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana }));
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderProfile(1);
      await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
      const dialog = screen.getByRole('dialog', { name: 'Editar perfil' });
      await userEvent.type(within(dialog).getByLabelText('Bio'), 'nova bio');

      await userEvent.click(within(dialog).getByRole('button', { name: 'Trocar senha' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
      expect(confirmar).toHaveBeenCalledTimes(2);
      expect(confirmar).toHaveBeenCalledWith('Descartar as mudanças no perfil?');
      expect(screen.getByRole('dialog', { name: 'Editar perfil' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog', { name: 'Trocar senha' })).toBeNull();
      confirmar.mockRestore();
    });

    it('troca a senha pela seção Conta de "Editar perfil" e confirma na tela', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana }));
      usersApi.changePassword.mockResolvedValue(null);
      renderProfile(1);

      expect(await screen.findByRole('button', { name: 'Editar perfil' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Trocar senha' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
      await userEvent.click(within(screen.getByRole('dialog', { name: 'Editar perfil' })).getByRole('button', { name: 'Trocar senha' }));
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).toBeNull();
      const dialog = screen.getByRole('dialog', { name: 'Trocar senha' });
      await userEvent.type(within(dialog).getByLabelText('Senha atual'), 'Atual!1');
      await userEvent.type(within(dialog).getByLabelText('Nova senha'), 'Nova!123');
      await userEvent.type(within(dialog).getByLabelText('Repita a nova senha'), 'Nova!123');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar nova senha' }));

      expect(await screen.findByRole('status')).toHaveTextContent('Senha alterada. Os outros aparelhos conectados precisam entrar de novo.');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('perfil de outra pessoa não tem "Trocar senha"', async () => {
      renderProfile();
      await screen.findByRole('heading', { level: 1, name: 'bia' });
      expect(screen.queryByRole('button', { name: 'Trocar senha' })).toBeNull();
    });

    it('sem posts convida a fazer o primeiro', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, posts: [], quantidadePosts: 0 }));
      musicApi.search.mockResolvedValue([]);
      renderProfile(1);

      await userEvent.click(await screen.findByRole('button', { name: 'Fazer o primeiro post' }));

      expect(screen.getByRole('dialog', { name: 'Novo post' })).toBeInTheDocument();
    });

    it('edita o perfil e atualiza a página e a sessão', async () => {
      const updateUser = vi.fn();
      usersApi.profile.mockResolvedValue(profile({ usuario: ana }));
      usersApi.updateMe.mockResolvedValue({ ...ana, nome: 'ana_b' });
      renderProfile(1, makeAuth({ updateUser }));

      await userEvent.click(await screen.findByRole('button', { name: 'Editar perfil' }));
      const dialog = screen.getByRole('dialog', { name: 'Editar perfil' });

      usersApi.profile.mockResolvedValue(profile({ usuario: { ...ana, nome: 'ana_b' } }));
      await userEvent.clear(within(dialog).getByLabelText('Nome de usuário'));
      await userEvent.type(within(dialog).getByLabelText('Nome de usuário'), 'ana_b');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(await screen.findByRole('heading', { level: 1, name: 'ana_b' })).toBeInTheDocument();
      expect(updateUser).toHaveBeenCalledWith({ nome: 'ana_b' });
      expect(screen.queryByRole('dialog', { name: 'Editar perfil' })).toBeNull();
    });
  });

  it('no perfil da sweetener caem pétalas; nos outros, não', async () => {
    usersApi.profile.mockResolvedValue(profile({ usuario: { ...bia, nome: 'sweetener' } }));
    const { unmount } = renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'sweetener' });
    expect(screen.getByTestId('petalas')).toBeInTheDocument();
    unmount();

    usersApi.profile.mockResolvedValue(profile());
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });
    expect(screen.queryByTestId('petalas')).toBeNull();
  });

  it('perfil verificado mostra o selo ao lado do nome', async () => {
    usersApi.profile.mockResolvedValue(profile({ usuario: { ...bia, nome: 'meregali.bat', nomeExibicao: 'Lucas' } }));
    renderProfile();
    const nome = await screen.findByRole('heading', { level: 1, name: 'Lucas' });
    expect(nome.parentElement).toContainElement(screen.getByRole('img', { name: 'Verificado' }));
  });

  it('quem está desde o início mostra o selo de fundador ao lado do nome', async () => {
    usersApi.profile.mockResolvedValue(profile({ usuario: { ...bia, fundadorDesde: '2026-11-03T12:00:00.000Z' } }));
    renderProfile();
    const nome = await screen.findByRole('heading', { level: 1, name: 'bia' });
    expect(nome.parentElement).toContainElement(screen.getByRole('img', { name: 'No TuneTalk desde o início' }));
  });

  it('quem escondeu a medalha de fundador não mostra o selo', async () => {
    usersApi.profile.mockResolvedValue(profile({
      usuario: { ...bia, fundadorDesde: '2026-11-03T12:00:00.000Z', mostrarSeloFundador: false },
    }));
    renderProfile();
    await screen.findByRole('heading', { level: 1, name: 'bia' });
    expect(screen.queryByRole('img', { name: 'No TuneTalk desde o início' })).toBeNull();
  });

  it('abre pelo @ (link de marcação)', async () => {
    renderProfile('@bia');
    expect(await screen.findByRole('heading', { level: 1, name: 'bia' })).toBeInTheDocument();
    expect(usersApi.profile).toHaveBeenCalledWith('@bia');
  });

  describe('abas Posts e Comentários', () => {
    const comentario = {
      ...post(30, null), texto: 'concordo demais', titulo: null, tipo: null, parentId: 7,
      respondendoA: { postId: 7, nome: 'caio', titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', trecho: null },
    };

    it('"Comentários" carrega (só ao abrir) os comentários da pessoa, com a quem ela respondeu', async () => {
      usersApi.comments.mockResolvedValue([comentario]);
      renderProfile();
      await screen.findByText('post 10');
      expect(usersApi.comments).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('tab', { name: 'Comentários' }));

      expect(screen.getByRole('tab', { name: 'Comentários' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByText('concordo demais')).toBeInTheDocument();
      expect(usersApi.comments).toHaveBeenCalledWith(2);
      // Mostra sobre qual música é a conversa, sem precisar abrir.
      expect(screen.getByRole('link', { name: /^Respondendo a @caio\s*Help! · The Beatles$/ })).toHaveAttribute('href', '/post/7');
      expect(screen.getByText('post 10')).not.toBeVisible();

      await userEvent.click(screen.getByRole('tab', { name: 'Posts' }));
      expect(screen.getByText('post 10')).toBeVisible();
      expect(screen.getByText('concordo demais')).not.toBeVisible();
      expect(usersApi.comments).toHaveBeenCalledTimes(1);
    });

    it('sem comentários avisa', async () => {
      usersApi.comments.mockResolvedValue([]);
      renderProfile();
      await userEvent.click(await screen.findByRole('tab', { name: 'Comentários' }));
      expect(await screen.findByText('bia ainda não comentou nada.')).toBeInTheDocument();
    });
  });

  it('mostra erro para perfil inexistente', async () => {
    usersApi.profile.mockRejectedValue(Object.assign(new Error('Usuário não encontrado.'), { status: 404 }));
    renderProfile(99);
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse perfil não existe ou mudou de @.');
  });

  it('tocar em "Posts" nos números abre a aba de posts', async () => {
    usersApi.comments.mockResolvedValue([]);
    renderProfile();
    await userEvent.click(await screen.findByRole('tab', { name: 'Comentários' }));
    await userEvent.click(screen.getByRole('button', { name: 'Posts: 2' }));
    expect(screen.getByRole('tab', { name: 'Posts' })).toHaveAttribute('aria-selected', 'true');
  });

  it('setas do teclado trocam entre Posts e Comentários', async () => {
    usersApi.comments.mockResolvedValue([]);
    renderProfile();
    const posts = await screen.findByRole('tab', { name: 'Posts' });
    posts.focus();
    await userEvent.keyboard('{ArrowRight}');
    const comentarios = screen.getByRole('tab', { name: 'Comentários' });
    expect(comentarios).toHaveAttribute('aria-selected', 'true');
    expect(comentarios).toHaveFocus();
    expect(posts).toHaveAttribute('tabindex', '-1');
  });

  it('tirar um favorito leva o foco para a capa vizinha; lista cheia avisa', async () => {
    const ana = { id: 1, nome: 'ana', fotoPerfil: 'a.png', bio: '' };
    const capa = (n) => `https://cdn-images.dzcdn.net/${n}.jpg`;
    const cinco = [1, 2, 3, 4, 5].map((i) => ({ id: String(i), titulo: `Música ${i}`, artista: 'X', capa: capa(i) }));
    usersApi.profile.mockResolvedValue(profile({ usuario: ana, favoritos: { musicas: cinco, albuns: [], artistas: [] } }));
    renderProfile(1);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar favoritos' }));
    expect(screen.getByText('Lista cheia. Toque numa capa para trocar de lugar ou tirar.')).toBeInTheDocument();

    await tirarFavorito('Música 3');
    await waitFor(() => expect(screen.getByRole('button', { name: '3º: Música 4' })).toHaveFocus());
    expect(screen.getByText('Toque numa capa para mudar a ordem ou tirar.')).toBeInTheDocument();
  });

  it('falha de conexão explica e deixa tentar de novo', async () => {
    usersApi.profile.mockRejectedValueOnce(new Error('Failed to fetch'));
    renderProfile();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para carregar o perfil.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'bia' })).toBeInTheDocument();
  });

  it('números grandes aparecem compactos', async () => {
    usersApi.profile.mockResolvedValue(profile({ quantidadeSeguidores: 12345 }));
    renderProfile();
    expect(await screen.findByRole('button', { name: /^Seguidores: 12,3\smil$/ })).toBeInTheDocument();
  });

  describe('favoritos (como no Letterboxd)', () => {
    const ana = { id: 1, nome: 'ana', fotoPerfil: 'a.png', bio: '' };
    const capa = (n) => `https://cdn-images.dzcdn.net/${n}.jpg`;
    const help = { id: '1', titulo: 'Help!', artista: 'The Beatles', capa: capa('help') };
    const abbey = { id: '9', titulo: 'Abbey Road', artista: 'The Beatles', capa: capa('abbey') };
    const olivia = { id: '5', titulo: 'Olivia Rodrigo', capa: capa('olivia') };
    const vazios = { musicas: [], albuns: [], artistas: [] };

    it('mostra as fileiras que a pessoa preencheu, com título e artista', async () => {
      usersApi.profile.mockResolvedValue(profile({ favoritos: { musicas: [help], albuns: [], artistas: [olivia] } }));
      renderProfile();

      const secao = await screen.findByRole('region', { name: 'Favoritos' });
      const musicas = within(secao).getByRole('list', { name: 'Músicas favoritas' });
      expect(within(musicas).getByText('Help!')).toBeInTheDocument();
      expect(within(musicas).getByText('The Beatles')).toBeInTheDocument();
      const link = within(musicas).getByRole('link', { name: 'Help! · The Beatles (abre no Deezer)' });
      expect(link).toHaveAttribute('href', 'https://www.deezer.com/track/1');
      expect(within(secao).queryByRole('button', { name: 'Editar favoritos' })).toBeNull();
      // Uma fileira por vez: o seletor só oferece os tipos preenchidos.
      expect(within(secao).queryByRole('button', { name: 'Álbuns' })).toBeNull();
      await userEvent.click(within(secao).getByRole('button', { name: 'Artistas' }));
      expect(within(secao).getByRole('list', { name: 'Artistas favoritos' })).toHaveTextContent('Olivia Rodrigo');
      expect(within(secao).queryByRole('list', { name: 'Músicas favoritas' })).toBeNull();
      expect(within(secao).getByRole('link', { name: /Olivia Rodrigo/ })).toHaveAttribute('href', 'https://www.deezer.com/artist/5');
    });

    it('fechar com mudanças não salvas pergunta antes', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, favoritos: { ...vazios, musicas: [help] } }));
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
      renderProfile(1);
      await userEvent.click(await screen.findByRole('button', { name: 'Editar favoritos' }));
      await tirarFavorito('Help!');

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(confirmar).toHaveBeenCalledWith('Descartar as mudanças nos favoritos?');
      expect(screen.getByRole('dialog', { name: 'Favoritos' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      confirmar.mockRestore();
    });

    it('perfil de outra pessoa sem favoritos não mostra a seção; dado estranho não quebra', async () => {
      usersApi.profile.mockResolvedValue(profile({ favoritos: { musicas: 'x', albuns: [null] } }));
      renderProfile();
      await screen.findByRole('heading', { level: 1, name: 'bia' });
      expect(screen.queryByRole('region', { name: 'Favoritos' })).toBeNull();
    });

    it('no próprio perfil vazio, convida a escolher', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, favoritos: vazios }));
      renderProfile(1);
      expect(await screen.findByText(/Mostre seu gosto/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Escolher favoritos' }));
      expect(screen.getByRole('dialog', { name: 'Favoritos' })).toBeInTheDocument();
    });

    it('edita: busca, adiciona, reordena, tira e salva', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, favoritos: { ...vazios, musicas: [help] } }));
      musicApi.search.mockImplementation(async (q, tipo) => (tipo === 'album'
        ? [{ id: 9, tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: capa('abbey'), faixas: 17 }]
        : [{ id: 2, tipo: 'musica', titulo: 'Yesterday', artista: 'The Beatles', capa: capa('y'), duracao: 125 },
          { id: 1, tipo: 'musica', titulo: 'Help!', artista: 'The Beatles', capa: capa('help'), duracao: 138 }]));
      usersApi.updateFavorites.mockImplementation(async (f) => f);
      renderProfile(1);

      await userEvent.click(await screen.findByRole('button', { name: 'Editar favoritos' }));
      const dialog = screen.getByRole('dialog', { name: 'Favoritos' });
      expect(within(dialog).getByRole('tab', { name: 'Músicas: 1 de 5' })).toBeInTheDocument();

      await userEvent.type(within(dialog).getByLabelText('Buscar músicas'), 'beatles');
      // Quem já está na lista aparece desligado.
      expect(await within(dialog).findByRole('button', { name: 'Já adicionado: Help!, The Beatles' })).toBeDisabled();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Adicionar: Yesterday, The Beatles' }));
      expect(within(dialog).getByRole('tab', { name: 'Músicas: 2 de 5' })).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: '1º: Help!' }));
      expect(within(dialog).getByRole('button', { name: 'Mover Help! para antes' })).toBeDisabled();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Mover Help! para depois' }));
      expect(within(dialog).getByRole('button', { name: 'Mover Help! para depois' })).toBeDisabled();

      await userEvent.click(within(dialog).getByRole('tab', { name: /^Álbuns/ }));
      await userEvent.type(within(dialog).getByLabelText('Buscar álbuns'), 'abbey');
      await userEvent.click(await within(dialog).findByRole('button', { name: /^Adicionar: Abbey Road/ }));
      expect(musicApi.search).toHaveBeenLastCalledWith('abbey', 'album');

      await userEvent.click(within(dialog).getByRole('tab', { name: /^Músicas/ }));
      await tirarFavorito('Help!', within(dialog));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(usersApi.updateFavorites).toHaveBeenCalledWith({
        musicas: [{ id: '2', titulo: 'Yesterday', artista: 'The Beatles', capa: capa('y') }],
        albuns: [abbey],
        artistas: [],
      });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(screen.getByRole('status')).toHaveTextContent('Favoritos salvos.');
      const secao = screen.getByRole('region', { name: 'Favoritos' });
      expect(within(secao).getByRole('list', { name: 'Músicas favoritas' })).toHaveTextContent('Yesterday');
      await userEvent.click(within(secao).getByRole('button', { name: 'Álbuns' }));
      expect(within(secao).getByRole('list', { name: 'Álbuns favoritos' })).toHaveTextContent('Abbey Road');
    });

    it('as abas mostram quantos já foram escolhidos e Salvar só liga com mudança', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, favoritos: { ...vazios, musicas: [help] } }));
      renderProfile(1);
      await userEvent.click(await screen.findByRole('button', { name: 'Editar favoritos' }));
      expect(screen.getByRole('tab', { name: 'Músicas: 1 de 5' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Álbuns: 0 de 5' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
      await tirarFavorito('Help!');
      expect(screen.getByRole('tab', { name: 'Músicas: 0 de 5' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
    });

    it('com 5 na lista, a busca trava até tirar um', async () => {
      const cinco = [1, 2, 3, 4, 5].map((i) => ({ ...help, id: String(i), titulo: `Música ${i}` }));
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, favoritos: { ...vazios, musicas: cinco } }));
      renderProfile(1);
      await userEvent.click(await screen.findByRole('button', { name: 'Editar favoritos' }));
      const busca = screen.getByLabelText('Buscar músicas');
      expect(busca).toBeDisabled();
      await tirarFavorito('Música 3');
      expect(busca).toBeEnabled();
    });

    it('erro ao salvar aparece e mantém a edição aberta', async () => {
      usersApi.profile.mockResolvedValue(profile({ usuario: ana, favoritos: { ...vazios, musicas: [help] } }));
      usersApi.updateFavorites.mockRejectedValue(new Error('Favorito inválido. Escolha de novo pela busca.'));
      renderProfile(1);
      await userEvent.click(await screen.findByRole('button', { name: 'Editar favoritos' }));
      await tirarFavorito('Help!');
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Favorito inválido.');
      expect(screen.getByRole('dialog', { name: 'Favoritos' })).toBeInTheDocument();
    });
  });
});
