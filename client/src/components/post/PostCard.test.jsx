import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard.jsx';
import { postsApi, queroOuvirApi } from '../../api/index.js';
import { renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({
  postsApi: { like: vi.fn(), unlike: vi.fn(), remove: vi.fn(), pin: vi.fn(), unpin: vi.fn(), create: vi.fn() },
  usersApi: { search: vi.fn() },
  musicApi: { search: vi.fn() },
  gifsApi: { search: vi.fn() },
  queroOuvirApi: { add: vi.fn(), remove: vi.fn() },
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
    const time = screen.getByText('2 h');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', musicPost.data);
    expect(time).toHaveAttribute('title', 'há 2 horas');
    expect(screen.getByText('que som')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Help!' })).toBeInTheDocument();
    expect(screen.getByText('The Beatles • música • 2 min')).toBeInTheDocument();
    expect(screen.getByLabelText('Nota 3,5 de 5')).toBeInTheDocument();
    expect(screen.getByText('3,5/5')).toBeInTheDocument();
    expect(screen.getByAltText('Poster da música')).toHaveAttribute('src', 'help.jpg');
    expect(screen.getByRole('button', { name: 'Tocar prévia' })).toBeInTheDocument();
  });

  it('tocar na música abre a página do álbum/música; com linkObra=false, abre o post', () => {
    const { unmount } = renderWithProviders(<PostCard post={musicPost} />);
    expect(screen.getByAltText('Poster da música').closest('a'))
      .toHaveAttribute('href', '/musica?titulo=Help%21&artista=The+Beatles');
    unmount();

    renderWithProviders(<PostCard post={{ ...musicPost, tipo: 'album', titulo: 'AC/DC Live', artista: 'AC/DC' }} />);
    expect(screen.getByAltText('Poster do álbum').closest('a'))
      .toHaveAttribute('href', '/album?titulo=AC%2FDC+Live&artista=AC%2FDC');
  });

  it('"Quero ouvir": guarda o disco do post de outra pessoa e mostra quando já está na lista', async () => {
    queroOuvirApi.add.mockResolvedValue({ id: 1 });
    renderWithProviders(<PostCard post={{ ...musicPost, queroOuvir: false }} />);
    const botao = screen.getByRole('button', { name: 'Guardar no Quero ouvir' });
    await userEvent.click(botao);
    expect(queroOuvirApi.add).toHaveBeenCalledWith({
      tipo: 'musica', titulo: 'Help!', artista: 'The Beatles', capa: 'help.jpg', releaseDate: '138', preview: 'help.mp3',
    });
    expect(screen.getByRole('button', { name: 'Tirar do Quero ouvir' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('"Quero ouvir" volta atrás se falhar e não aparece no próprio post', async () => {
    queroOuvirApi.add.mockRejectedValue(new Error('sem rede'));
    const { unmount } = renderWithProviders(<PostCard post={{ ...musicPost, queroOuvir: false }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar no Quero ouvir' }));
    expect(await screen.findByRole('button', { name: 'Guardar no Quero ouvir' })).toHaveAttribute('aria-pressed', 'false');
    unmount();

    renderWithProviders(<PostCard post={{ ...musicPost, queroOuvir: false, autor: { ...musicPost.autor, id: 1 } }} />);
    expect(screen.queryByRole('button', { name: /Quero ouvir/ })).toBeNull();
  });

  it('dentro da página do disco, a música do post leva ao post', () => {
    renderWithProviders(<PostCard post={musicPost} linkObra={false} />);
    expect(screen.getByAltText('Poster da música').closest('a')).toHaveAttribute('href', '/post/10');
  });

  it('topo: nome de exibição em cima; @usuario e o tempo embaixo', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, autor: { ...musicPost.autor, nome: 'carol', nomeExibicao: 'Twit da Carol' } }} />);
    const topo = screen.getByRole('link', { name: 'Twit da Carol' }).closest('.post-card__who');
    expect(topo.querySelector('.post-card__author-line')).toHaveTextContent('Twit da Carol');
    expect(topo.querySelector('.post-card__meta')).toHaveTextContent('@carol·2 h');
    expect(screen.getByRole('link', { name: 'Twit da Carol' })).toHaveAttribute('href', '/perfil/2');
    expect(screen.getByRole('article')).toHaveAccessibleName('Post de Twit da Carol sobre Help!');
  });

  it('mostra o trecho da letra com a música creditada', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, trechoLetra: ['Primeiro verso', 'Segundo verso'] }} />);
    const trecho = screen.getByLabelText('Trecho da letra de Help!');
    expect(trecho.querySelectorAll('p')).toHaveLength(2);
    expect(trecho).toHaveTextContent('Primeiro versoSegundo verso');
    expect(screen.getByText('Help! · The Beatles')).toBeInTheDocument();
  });

  it('sem trecho (ou com dado estranho) não mostra o bloco nem quebra', () => {
    for (const trechoLetra of [null, undefined, [], 'texto', [null, '  ']]) {
      const { unmount } = renderWithProviders(<PostCard post={{ ...musicPost, trechoLetra }} />);
      expect(screen.queryByLabelText(/Trecho da letra/)).toBeNull();
      expect(screen.getByRole('article', { name: 'Post de Bia sobre Help!' })).toBeInTheDocument();
      unmount();
    }
  });

  it('linka para o perfil do autor e para o post', () => {
    renderWithProviders(<PostCard post={musicPost} />);
    expect(screen.getByRole('link', { name: 'Bia' })).toHaveAttribute('href', '/perfil/2');
    expect(screen.getByRole('link', { name: /Comentários: 2/ })).toHaveAttribute('href', '/post/10');
  });

  it('marcações viram link para o perfil; tocar no resto do texto abre o post', async () => {
    renderWithProviders(<PostCard post={{ ...musicPost, texto: 'olha @bia.souza, que som' }} />);
    expect(screen.getByRole('link', { name: '@bia.souza' })).toHaveAttribute('href', '/perfil/@bia.souza');

    await userEvent.click(screen.getByText(/que som/));
    expect(screen.getByTestId('location')).toHaveTextContent('/post/10');
  });

  it('hashtags ficam destacadas e levam à página da hashtag', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, texto: 'ouvindo #GUTS e #músicaboa' }} />);
    expect(screen.getByRole('link', { name: '#GUTS' })).toHaveAttribute('href', '/tag/GUTS');
    expect(screen.getByRole('link', { name: '#músicaboa' })).toHaveAttribute('href', `/tag/${encodeURIComponent('músicaboa')}`);
    expect(screen.getByRole('link', { name: '#GUTS' })).toHaveClass('hashtag');
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

  it('imagem nova (cortada) ocupa a caixa na proporção escolhida, que limita o tamanho', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, imagem: 'https://res.cloudinary.com/t/gato.gif', imagemProporcao: 0.8 }} />);
    const caixa = screen.getByAltText('Imagem do post de Bia').closest('a');
    expect(caixa).toHaveClass('post-card__image--ajustada');
    expect(caixa.style.getPropertyValue('--proporcao')).toBe('0.8');
  });

  it('imagem antiga (sem proporção) continua como era', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, imagem: 'https://res.cloudinary.com/t/velha.gif' }} />);
    expect(screen.getByAltText('Imagem do post de Bia').closest('a')).not.toHaveClass('post-card__image--ajustada');
  });

  it('autor verificado tem o selo ao lado do nome', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, autor: { id: 5, nome: 'sweetener', fotoPerfil: 's.png' } }} />);
    expect(screen.getByRole('link', { name: 'sweetener' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Verificado' })).toHaveClass('verified-badge--olivia');
  });

  it('numa conversa, threadLine liga este post ao de baixo (linha entre as fotos)', () => {
    const { unmount } = renderWithProviders(<PostCard post={musicPost} variant="reply" threadLine />);
    expect(screen.getByRole('article')).toHaveClass('post-card--continua');
    unmount();
    renderWithProviders(<PostCard post={musicPost} variant="reply" />);
    expect(screen.getByRole('article')).not.toHaveClass('post-card--continua');
  });

  it('autor fundador tem o selo de fundador ao lado do nome', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, autor: { ...musicPost.autor, fundador: true } }} />);
    expect(screen.getByRole('img', { name: 'No TuneTalk desde o início' })).toBeInTheDocument();
  });

  it('mostra a imagem (ou GIF) do post', () => {
    renderWithProviders(<PostCard post={{ ...musicPost, imagem: 'https://res.cloudinary.com/t/gato.gif' }} />);
    expect(screen.getByAltText('Imagem do post de Bia')).toHaveAttribute('src', 'https://res.cloudinary.com/t/gato.gif');
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

  it('se a versão reduzida da imagem falhar (GIF longo no Cloudinary), mostra o arquivo original', () => {
    const imagem = 'https://res.cloudinary.com/t/image/upload/c_limit,w_1600/v1700/tunetalk/posts/longo.gif';
    renderWithProviders(<PostCard post={{ ...musicPost, imagem }} />);
    const img = screen.getByAltText('Imagem do post de Bia');
    expect(img).toHaveAttribute('src', imagem);
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', 'https://res.cloudinary.com/t/image/upload/v1700/tunetalk/posts/longo.gif');
    // Se o original também falhar, não fica tentando para sempre.
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', 'https://res.cloudinary.com/t/image/upload/v1700/tunetalk/posts/longo.gif');
  });

  describe('citar (repostar com comentário)', () => {
    const citacao = { ...musicPost, id: 20, texto: 'discordo dessa nota', titulo: null, tipo: null, autor: { id: 3, nome: 'Caio', fotoPerfil: 'c.png' }, citado: musicPost };

    it('mostra o post citado dentro do post, com link para ele', () => {
      renderWithProviders(<PostCard post={citacao} />);
      const citado = screen.getByRole('link', { name: 'Post citado de Bia' });
      expect(citado).toHaveAttribute('href', '/post/10');
      expect(citado).toHaveTextContent('que som');
      expect(citado).toHaveTextContent('Help!');
    });

    it('citado apagado ou oculto aparece como indisponível', () => {
      renderWithProviders(<PostCard post={{ ...citacao, citado: { indisponivel: true } }} />);
      expect(screen.getByText('Este post não está disponível.')).toBeInTheDocument();
    });

    it('"Citar post" abre o compositor com o post e, ao publicar, vai para a citação', async () => {
      postsApi.create.mockResolvedValue({ id: 77 });
      renderWithProviders(<PostCard post={musicPost} />);
      await userEvent.click(screen.getByRole('button', { name: 'Citar post' }));

      const dialogo = screen.getByRole('dialog', { name: 'Citar post' });
      expect(dialogo).toContainElement(screen.getByRole('group', { name: 'Post citado de Bia' }));
      await userEvent.type(screen.getByLabelText('O que você acha desse post?'), 'discordo');
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

      expect(postsApi.create).toHaveBeenCalledWith({ texto: 'discordo', citadoId: 10 });
      expect(await screen.findByTestId('location')).toHaveTextContent('/post/77');
    });

    it('comentário não tem o botão de citar', () => {
      renderWithProviders(<PostCard post={{ ...musicPost, parentId: 5 }} />);
      expect(screen.queryByRole('button', { name: 'Citar post' })).toBeNull();
    });
  });
});

