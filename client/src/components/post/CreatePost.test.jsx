import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePost } from './CreatePost.jsx';
import { StarRatingInput } from './StarRatingInput.jsx';
import { musicApi, postsApi } from '../../api/index.js';

vi.mock('../../api/index.js', () => ({
  musicApi: { search: vi.fn() },
  postsApi: { create: vi.fn() },
}));

const help = { id: 1, titulo: 'Help!', artista: 'The Beatles', capa: 'help.jpg', duracao: 138, preview: 'help.mp3' };
const yesterday = { id: 2, titulo: 'Yesterday', artista: 'The Beatles', capa: 'y.jpg', duracao: 125, preview: null };

describe('StarRatingInput (nota de 0 a 10)', () => {
  const tap = async (onChange, value, estrela) => {
    const { unmount } = render(<StarRatingInput value={value} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: `Estrela ${estrela}` }));
    unmount();
    return onChange.mock.calls.at(-1)[0];
  };

  it('1 toque deixa meia estrela, 2 enche, 3 esvazia', async () => {
    const onChange = vi.fn();
    expect(await tap(onChange, null, 1)).toBe(1);
    expect(await tap(onChange, 1, 1)).toBe(2);
    expect(await tap(onChange, 2, 1)).toBe(0);
    expect(await tap(onChange, 0, 1)).toBe(1);
  });

  it('as estrelas anteriores ficam cheias e o ciclo vale para a estrela tocada', async () => {
    const onChange = vi.fn();
    expect(await tap(onChange, null, 4)).toBe(7);
    expect(await tap(onChange, 7, 4)).toBe(8);
    expect(await tap(onChange, 8, 4)).toBe(6);
    expect(await tap(onChange, 7, 2)).toBe(3);
    expect(await tap(onChange, 3, 5)).toBe(9);
  });

  it('não tem botão de zero', () => {
    render(<StarRatingInput value={null} onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('mostra número e descrição da nota atual', () => {
    render(<StarRatingInput value={7} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Nota de 0 a 10' })).toBeInTheDocument();
    expect(screen.getByText('7/10 · Bom')).toBeInTheDocument();
  });

  it('sem nota explica como funciona', () => {
    render(<StarRatingInput value={null} onChange={() => {}} />);
    expect(screen.getByText('Toque numa estrela: 1 toque deixa meia, 2 enche, 3 esvazia.')).toBeInTheDocument();
  });
});

describe('CreatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    musicApi.search.mockResolvedValue([help, yesterday]);
    postsApi.create.mockResolvedValue({ id: 42 });
  });

  const open = () => userEvent.click(screen.getByRole('button', { name: 'Criar post' }));
  const search = (term) => userEvent.type(screen.getByLabelText('Buscar música'), term);
  const chooseHelp = async () => {
    await open();
    await search('help');
    await userEvent.click(await screen.findByRole('button', { name: /Help!/ }));
  };

  it('fica fechado até clicar no botão', () => {
    render(<CreatePost onCreated={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('abre o diálogo "Novo post" com a busca focada e uma dica', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await open();

    expect(screen.getByRole('dialog', { name: 'Novo post' })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar música')).toHaveFocus();
    expect(screen.getByText('Digite o nome de uma música ou artista.')).toBeInTheDocument();
  });

  it('busca com debounce e lista as faixas com artista e duração', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await search('help');

    const results = await screen.findByRole('list', { name: 'Resultados' });
    const items = within(results).getAllByRole('button');
    expect(items.map((item) => item.textContent)).toEqual(['Help!The Beatles · 2:18', 'YesterdayThe Beatles · 2:05']);
    expect(musicApi.search).toHaveBeenCalledTimes(1);
    expect(musicApi.search).toHaveBeenCalledWith('help');
  });

  it('mostra que está buscando', async () => {
    musicApi.search.mockReturnValue(new Promise(() => {}));
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await search('help');
    expect(await screen.findByRole('status')).toHaveTextContent('Buscando…');
  });

  it('avisa quando nada é encontrado', async () => {
    musicApi.search.mockResolvedValue([]);
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await search('xyz');
    expect(await screen.findByText('Nada encontrado para “xyz”.')).toBeInTheDocument();
  });

  it('avisa quando a busca falha', async () => {
    musicApi.search.mockRejectedValue(new Error('offline'));
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await search('help');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar agora. Tente de novo.');
  });

  it('escolher a faixa leva à avaliação; publicar só depois de dar a nota', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();

    const escolhida = screen.getByRole('group', { name: 'Música escolhida' });
    expect(escolhida).toHaveTextContent('Help!');
    expect(escolhida).toHaveTextContent('The Beatles · 2:18');
    const publicar = screen.getByRole('button', { name: 'Publicar' });
    expect(publicar).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Estrela 4' }));
    expect(screen.getByText('7/10 · Bom')).toBeInTheDocument();
    expect(publicar).toBeEnabled();
  });

  it('conta os caracteres do texto', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();
    await userEvent.type(screen.getByLabelText('O que você achou?'), 'clássico');
    expect(screen.getByText('8/500')).toBeInTheDocument();
    expect(screen.getByLabelText('O que você achou?')).toHaveAttribute('maxLength', '500');
  });

  it('"Trocar música" volta para a busca com os resultados de antes', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();

    await userEvent.click(screen.getByRole('button', { name: 'Trocar música' }));

    expect(screen.getByLabelText('Buscar música')).toHaveValue('help');
    expect(screen.getByRole('button', { name: /Yesterday/ })).toBeInTheDocument();
  });

  it('publica com a nota de 0 a 10, fecha e avisa o feed', async () => {
    const onCreated = vi.fn();
    render(<CreatePost onCreated={onCreated} />);
    await chooseHelp();

    await userEvent.type(screen.getByLabelText('O que você achou?'), '  clássico  ');
    await userEvent.click(screen.getByRole('button', { name: 'Estrela 5' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(postsApi.create).toHaveBeenCalledWith({
      texto: 'clássico',
      musicName: 'Help!',
      artistName: 'The Beatles',
      posterMusica: 'help.jpg',
      postType: 'música',
      releaseDate: '138',
      musicPreview: 'help.mp3',
      nota: 9,
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mostra o erro do servidor e mantém o que foi preenchido', async () => {
    postsApi.create.mockRejectedValue(new Error('A nota deve ser um número inteiro de 0 a 10.'));
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();
    await userEvent.type(screen.getByLabelText('O que você achou?'), 'ótima');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Estrela 3' }));
    expect(screen.getByText('6/10 · Bom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A nota deve ser um número inteiro de 0 a 10.');
    expect(screen.getByLabelText('O que você achou?')).toHaveValue('ótima');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled();
  });

  it('fechar descarta o rascunho', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await open();
    expect(screen.getByLabelText('Buscar música')).toHaveValue('');
  });
});
