import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from './StarRating.jsx';
import { LikeButton } from './LikeButton.jsx';
import { PlayButton } from './PlayButton.jsx';
import { ShareButton } from './ShareButton.jsx';
import { PostMenu } from './PostMenu.jsx';
import { musicApi, postsApi, usersApi } from '../../api/index.js';

vi.mock('../../api/index.js', () => ({
  postsApi: { like: vi.fn(), unlike: vi.fn() },
  musicApi: { preview: vi.fn() },
  usersApi: { silenciar: vi.fn(), bloquear: vi.fn() },
}));

describe('StarRating', () => {
  it('desenha a nota de 0 a 10 como estrelas, com meia estrela para notas ímpares', () => {
    const { container } = render(<StarRating nota={7} />);
    expect(container.querySelectorAll('.bi-star-fill')).toHaveLength(3);
    expect(container.querySelectorAll('.bi-star-half')).toHaveLength(1);
    expect(container.querySelectorAll('.bi-star')).toHaveLength(1);
    expect(screen.getByLabelText('Nota 3,5 de 5')).toBeInTheDocument();
  });

  it('nota 0 é cinco estrelas vazias e 10 é cinco cheias', () => {
    const { container, rerender } = render(<StarRating nota={0} />);
    expect(container.querySelectorAll('.bi-star')).toHaveLength(5);
    rerender(<StarRating nota={10} />);
    expect(container.querySelectorAll('.bi-star-fill')).toHaveLength(5);
  });
});

describe('LikeButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('curte: chama a API, mostra o novo total e o coração cheio', async () => {
    postsApi.like.mockResolvedValue(4);
    render(<LikeButton postId={7} likes={3} curtido={false} />);

    const button = screen.getByRole('button', { name: 'Curtir' });
    expect(button).toHaveTextContent('3');
    await userEvent.click(button);

    expect(postsApi.like).toHaveBeenCalledWith(7);
    const unlike = await screen.findByRole('button', { name: 'Descurtir' });
    expect(unlike).toHaveTextContent('4');
    expect(unlike.querySelector('.bi-heart-fill')).not.toBeNull();
  });

  it('descurte quando já curtido', async () => {
    postsApi.unlike.mockResolvedValue(2);
    render(<LikeButton postId={7} likes={3} curtido />);

    await userEvent.click(screen.getByRole('button', { name: 'Descurtir' }));

    expect(postsApi.unlike).toHaveBeenCalledWith(7);
    expect(await screen.findByRole('button', { name: 'Curtir' })).toHaveTextContent('2');
  });

  it('mantém o estado se a API falhar', async () => {
    postsApi.like.mockRejectedValue(new Error('offline'));
    render(<LikeButton postId={7} likes={3} curtido={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Curtir' }));
    expect(screen.getByRole('button', { name: 'Curtir' })).toHaveTextContent('3');
  });

  it('post de Natal (#xmas): curtir solta os enfeites; descurtir não', async () => {
    postsApi.like.mockResolvedValue(4);
    postsApi.unlike.mockResolvedValue(3);
    render(<LikeButton postId={7} likes={3} curtido={false} tema="natal" />);
    const button = screen.getByRole('button', { name: 'Curtir' });
    expect(button).toHaveClass('like-button--natal');
    expect(screen.queryByTestId('like-festa')).toBeNull();

    await userEvent.click(button);
    expect(screen.getByTestId('like-festa')).toHaveTextContent('🎄');
    await screen.findByRole('button', { name: 'Descurtir' });

    await userEvent.click(screen.getByRole('button', { name: 'Descurtir' }));
    await screen.findByRole('button', { name: 'Curtir' });
    // A festa da curtida anterior não se repete ao descurtir.
    expect(screen.getAllByTestId('like-festa')).toHaveLength(1);
  });

  it('post comum: curtir não tem enfeites', async () => {
    postsApi.like.mockResolvedValue(4);
    render(<LikeButton postId={7} likes={3} curtido={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Curtir' }));
    expect(screen.queryByTestId('like-festa')).toBeNull();
  });
});

describe('PlayButton', () => {
  let play;
  let pause;

  beforeEach(() => {
    play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  it('link antigo/vencido: busca um link novo da mesma música antes de tocar', async () => {
    musicApi.preview.mockResolvedValue('https://cdnt-preview.dzcdn.net/novo.mp3');
    render(<PlayButton src="https://cdns-preview-6.dzcdn.net/stream/c-velho-3.mp3" titulo="Help!" artista="The Beatles" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia' }));

    expect(musicApi.preview).toHaveBeenCalledWith('Help!', 'The Beatles');
    expect(document.querySelector('audio').getAttribute('src')).toBe('https://cdnt-preview.dzcdn.net/novo.mp3');
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pausar prévia' })).toBeInTheDocument();
  });

  it('se tocar falhar (link expirou), busca de novo e tenta mais uma vez', async () => {
    play.mockRejectedValueOnce(new Error('403')).mockResolvedValueOnce();
    musicApi.preview.mockResolvedValue('https://cdnt-preview.dzcdn.net/novo.mp3');
    render(<PlayButton src="https://cdn/preview.mp3" titulo="Help!" artista="The Beatles" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia' }));

    expect(musicApi.preview).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Pausar prévia' })).toBeInTheDocument();
  });

  it('se não houver prévia nenhuma, volta para o ícone de play', async () => {
    play.mockRejectedValue(new Error('403'));
    musicApi.preview.mockRejectedValue(new Error('Prévia não encontrada.'));
    render(<PlayButton src="https://cdn/preview.mp3" titulo="x" artista="y" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia' }));

    expect(await screen.findByRole('button', { name: 'Tocar prévia' })).toBeInTheDocument();
  });

  it('toca e pausa a prévia', async () => {
    render(<PlayButton src="https://cdn/preview.mp3" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia' }));
    expect(play).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Pausar prévia' }));
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tocar prévia' })).toBeInTheDocument();
  });

  it('só uma prévia toca por vez: começar outra pausa a que estava tocando', async () => {
    const pausados = [];
    pause.mockImplementation(function pausar() { pausados.push(this); });
    vi.spyOn(window.HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
    const { container } = render(
      <>
        <PlayButton src="a.mp3" rotulo="A" />
        <PlayButton src="b.mp3" rotulo="B" />
      </>,
    );
    const [audioA] = container.querySelectorAll('audio');
    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia de A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia de B' }));
    expect(pausados).toContain(audioA);
  });

  it('volta ao ícone de play quando o áudio termina', async () => {
    const { container } = render(<PlayButton src="x.mp3" />);
    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia' }));

    container.querySelector('audio').dispatchEvent(new Event('ended'));

    expect(await screen.findByRole('button', { name: 'Tocar prévia' })).toBeInTheDocument();
  });
});

describe('ShareButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete navigator.canShare;
    delete navigator.share;
  });

  it('copia a URL absoluta do post', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('png')));
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<ShareButton postId={9} />);

    await user.click(screen.getByRole('button', { name: 'Compartilhar post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copiar link' }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/post/9`);
    expect(await screen.findByRole('status')).toHaveTextContent('Link copiado!');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('manda a imagem do Stories para o menu de compartilhar do celular', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response('png', { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetchMock);
    navigator.canShare = vi.fn(() => true);
    navigator.share = vi.fn().mockResolvedValue();
    render(<ShareButton postId={9} />);

    await user.click(screen.getByRole('button', { name: 'Compartilhar post' }));
    // A imagem começa a ser gerada assim que o menu abre.
    expect(fetchMock).toHaveBeenCalledWith('/api/og/post/9/stories.png');
    await user.click(screen.getByRole('menuitem', { name: 'Compartilhar no Stories' }));

    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    const [arquivo] = navigator.share.mock.calls[0][0].files;
    expect(arquivo.name).toBe('tunetalk-post-9.png');
    expect(arquivo.type).toBe('image/png');
  });

  it('sem menu de compartilhar (computador), baixa a imagem', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('png')));
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ShareButton postId={9} />);

    await user.click(screen.getByRole('button', { name: 'Compartilhar post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Compartilhar no Stories' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Imagem salva!');
    expect(clique).toHaveBeenCalled();
    clique.mockRestore();
  });

  it('avisa se não der para gerar a imagem', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('erro', { status: 500 })));
    render(<ShareButton postId={9} />);

    await user.click(screen.getByRole('button', { name: 'Compartilhar post' }));
    await user.click(screen.getByRole('menuitem', { name: 'Compartilhar no Stories' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Não deu para gerar a imagem.');
  });
});

describe('PostMenu', () => {
  it('mostra "Deletar" para o autor e chama onDelete', async () => {
    const onDelete = vi.fn();
    render(<PostMenu isOwner onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Deletar' }));

    expect(onDelete).toHaveBeenCalled();
  });

  describe('silenciar e bloquear quem postou', () => {
    const autor = { id: 5, nome: 'caio' };

    it('aparecem só no post de outra pessoa', async () => {
      render(<PostMenu isOwner={false} autor={autor} onDelete={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
      expect(screen.getAllByRole('menuitem').map((i) => i.textContent.trim()))
        .toEqual(['Silenciar @caio', 'Bloquear @caio', 'Denunciar']);
    });

    it('silenciar avisa a lista para sumir com os posts da pessoa', async () => {
      usersApi.silenciar.mockResolvedValue(null);
      const onAutorOculto = vi.fn();
      render(<PostMenu isOwner={false} autor={autor} onAutorOculto={onAutorOculto} />);
      await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Silenciar @caio' }));
      expect(usersApi.silenciar).toHaveBeenCalledWith(5);
      expect(onAutorOculto).toHaveBeenCalledWith(5);
    });

    it('bloquear pergunta antes; cancelar não bloqueia', async () => {
      usersApi.bloquear.mockResolvedValue(null);
      const onAutorOculto = vi.fn();
      render(<PostMenu isOwner={false} autor={autor} onAutorOculto={onAutorOculto} />);

      await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Bloquear @caio' }));
      expect(screen.getByRole('dialog', { name: 'Bloquear @caio?' })).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(usersApi.bloquear).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Bloquear @caio' }));
      await userEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
      expect(usersApi.bloquear).toHaveBeenCalledWith(5);
      expect(onAutorOculto).toHaveBeenCalledWith(5);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('se o bloqueio falhar, a confirmação mostra o erro', async () => {
      usersApi.bloquear.mockRejectedValue(new Error('Sem conexão.'));
      render(<PostMenu isOwner={false} autor={autor} onAutorOculto={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Bloquear @caio' }));
      await userEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.');
    });
  });

  it('mostra "Denunciar" para quem não é o autor', async () => {
    render(<PostMenu isOwner={false} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    expect(screen.getByRole('menuitem', { name: 'Denunciar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Deletar' })).toBeNull();
  });

  it('com fixar disponível, o autor vê "Fixar no perfil" ou "Desafixar do perfil" antes de deletar', async () => {
    const onTogglePin = vi.fn();
    const { rerender } = render(<PostMenu isOwner pinned={false} onTogglePin={onTogglePin} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent.trim())).toEqual(['Fixar no perfil', 'Deletar']);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Fixar no perfil' }));
    expect(onTogglePin).toHaveBeenCalled();

    rerender(<PostMenu isOwner pinned onTogglePin={onTogglePin} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    expect(screen.getByRole('menuitem', { name: 'Desafixar do perfil' })).toBeInTheDocument();
  });

  it('sem fixar disponível (ex.: comentário), não mostra a opção', async () => {
    render(<PostMenu isOwner onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    expect(screen.queryByRole('menuitem', { name: /fixar/i })).toBeNull();
  });

  it('fica fechado até ser aberto', () => {
    render(<PostMenu isOwner onDelete={vi.fn()} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
