import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from './StarRating.jsx';
import { LikeButton } from './LikeButton.jsx';
import { PlayButton } from './PlayButton.jsx';
import { ShareButton } from './ShareButton.jsx';
import { PostMenu } from './PostMenu.jsx';
import { postsApi } from '../../api/index.js';

vi.mock('../../api/index.js', () => ({ postsApi: { like: vi.fn(), unlike: vi.fn() } }));

describe('StarRating', () => {
  it('desenha a nota de 0 a 10 como estrelas, com meia estrela para notas ímpares', () => {
    const { container } = render(<StarRating nota={7} />);
    expect(container.querySelectorAll('.bi-star-fill')).toHaveLength(3);
    expect(container.querySelectorAll('.bi-star-half')).toHaveLength(1);
    expect(container.querySelectorAll('.bi-star')).toHaveLength(1);
    expect(screen.getByLabelText('Nota 7 de 10')).toBeInTheDocument();
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
});

describe('PlayButton', () => {
  let play;
  let pause;

  beforeEach(() => {
    play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  it('toca e pausa a prévia', async () => {
    render(<PlayButton src="https://cdn/preview.mp3" />);

    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia' }));
    expect(play).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button', { name: 'Pausar prévia' }));
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tocar prévia' })).toBeInTheDocument();
  });

  it('volta ao ícone de play quando o áudio termina', async () => {
    const { container } = render(<PlayButton src="x.mp3" />);
    await userEvent.click(screen.getByRole('button', { name: 'Tocar prévia' }));

    container.querySelector('audio').dispatchEvent(new Event('ended'));

    expect(await screen.findByRole('button', { name: 'Tocar prévia' })).toBeInTheDocument();
  });
});

describe('ShareButton', () => {
  it('copia a URL absoluta do post', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<ShareButton postId={9} />);

    await user.click(screen.getByRole('button', { name: 'Copiar link do post' }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/post/9`);
    expect(await screen.findByRole('status')).toHaveTextContent('Link copiado!');
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

  it('mostra "Denunciar" para quem não é o autor', async () => {
    render(<PostMenu isOwner={false} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Opções do post' }));
    expect(screen.getByRole('menuitem', { name: 'Denunciar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Deletar' })).toBeNull();
  });

  it('fica fechado até ser aberto', () => {
    render(<PostMenu isOwner onDelete={vi.fn()} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
