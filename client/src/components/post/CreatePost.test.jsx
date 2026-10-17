import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePost } from './CreatePost.jsx';
import { StarRatingInput } from './StarRatingInput.jsx';
import { musicApi, postsApi } from '../../api/index.js';

vi.mock('../../api/index.js', () => ({
  musicApi: { search: vi.fn() },
  postsApi: { create: vi.fn() },
}));

const help = { id: 1, titulo: 'Help!', artista: 'The Beatles', capa: 'help.jpg', duracao: 138, preview: 'help.mp3' };

describe('StarRatingInput', () => {
  it('seleciona a nota', async () => {
    const onChange = vi.fn();
    render(<StarRatingInput value={null} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('4 estrelas'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('marca a nota atual', () => {
    render(<StarRatingInput value={2} onChange={() => {}} />);
    expect(screen.getByLabelText('2 estrelas')).toBeChecked();
  });
});

describe('CreatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    musicApi.search.mockResolvedValue([help]);
    postsApi.create.mockResolvedValue({ id: 42 });
  });

  const openAndSearch = async (term = 'help') => {
    await userEvent.click(screen.getByRole('button', { name: 'Criar post' }));
    await userEvent.type(screen.getByPlaceholderText('Digite a música'), term);
  };

  it('fica fechado até clicar no botão', () => {
    render(<CreatePost onCreated={vi.fn()} />);
    expect(screen.queryByPlaceholderText('Digite a música')).toBeNull();
  });

  it('busca músicas enquanto digita (com debounce) e lista os resultados', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await openAndSearch('help');

    expect(await screen.findByRole('button', { name: 'Help! by The Beatles (Track)' })).toBeInTheDocument();
    expect(musicApi.search).toHaveBeenCalledTimes(1);
    expect(musicApi.search).toHaveBeenCalledWith('help');
  });

  it('escolher uma música abre o formulário e postar envia os dados', async () => {
    const onCreated = vi.fn();
    render(<CreatePost onCreated={onCreated} />);
    await openAndSearch();
    await userEvent.click(await screen.findByRole('button', { name: 'Help! by The Beatles (Track)' }));

    expect(screen.getByRole('heading', { name: 'Help! by The Beatles' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Texto do post'), 'clássico');
    await userEvent.click(screen.getByLabelText('5 estrelas'));
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    expect(postsApi.create).toHaveBeenCalledWith({
      texto: 'clássico',
      musicName: 'Help!',
      artistName: 'The Beatles',
      posterMusica: 'help.jpg',
      postType: 'música',
      releaseDate: '138',
      musicPreview: 'help.mp3',
      nota: 5,
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(screen.queryByLabelText('Texto do post')).toBeNull();
  });

  it('mostra erro se a postagem falhar e mantém o formulário', async () => {
    postsApi.create.mockRejectedValue(new Error('Escolha uma música ou álbum.'));
    render(<CreatePost onCreated={vi.fn()} />);
    await openAndSearch();
    await userEvent.click(await screen.findByRole('button', { name: 'Help! by The Beatles (Track)' }));
    await userEvent.click(screen.getByRole('button', { name: 'Postar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha uma música ou álbum.');
    expect(screen.getByLabelText('Texto do post')).toBeInTheDocument();
  });

  it('clicar no fundo fecha e limpa a busca', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await openAndSearch();
    await screen.findByRole('button', { name: 'Help! by The Beatles (Track)' });

    await userEvent.click(screen.getByTestId('create-post-overlay'));
    expect(screen.queryByPlaceholderText('Digite a música')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Criar post' }));
    expect(screen.getByPlaceholderText('Digite a música')).toHaveValue('');
  });

  it('não busca com o campo vazio', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await openAndSearch('a');
    await userEvent.clear(screen.getByPlaceholderText('Digite a música'));
    await new Promise((r) => setTimeout(r, 400));
    expect(musicApi.search).not.toHaveBeenCalledWith('');
  });
});
