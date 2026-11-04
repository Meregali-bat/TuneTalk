import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePost } from './CreatePost.jsx';
import { StarRatingInput } from './StarRatingInput.jsx';
import { musicApi, postsApi, usersApi } from '../../api/index.js';

// A biblioteca de corte mede a imagem no navegador; aqui ela devolve um corte fixo na hora.
vi.mock('react-easy-crop', async () => {
  const { useEffect } = await import('react');
  return {
    default: function FakeCropper({ aspect, onMediaLoaded, onCropComplete }) {
      useEffect(() => {
        onMediaLoaded?.({ naturalWidth: 800, naturalHeight: 600 });
        onCropComplete?.({ x: 10, y: 0, width: 80, height: 100 }, { x: 80, y: 0, width: 640, height: 600 });
      }, [aspect]);
      return <div data-testid="cropper" data-aspect={aspect ?? ''} />;
    },
  };
});

vi.mock('../../api/index.js', () => ({
  musicApi: { search: vi.fn(), lyrics: vi.fn() },
  postsApi: { create: vi.fn(), uploadImage: vi.fn() },
  usersApi: { search: vi.fn() },
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
    expect(screen.getByRole('group', { name: 'Nota de 0 a 5 estrelas' })).toBeInTheDocument();
    expect(screen.getByText('3,5/5 · Bom')).toBeInTheDocument();
  });

  it('sem nota explica como funciona', () => {
    render(<StarRatingInput value={null} onChange={() => {}} />);
    expect(screen.getByText('Toque numa estrela: 1 toque deixa meia, 2 enche, 3 esvazia.')).toBeInTheDocument();
  });
});

describe('CreatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
    musicApi.search.mockResolvedValue([help, yesterday]);
    postsApi.create.mockResolvedValue({ id: 42 });
  });

  const open = () => userEvent.click(screen.getByRole('button', { name: 'Criar post' }));
  const texto = () => screen.getByLabelText('O que você quer dizer?');
  const addMusic = () => userEvent.click(screen.getByRole('button', { name: 'Adicionar música ou álbum' }));
  const search = (term) => userEvent.type(screen.getByLabelText('Buscar música'), term);
  const chooseHelp = async () => {
    await open();
    await addMusic();
    await search('help');
    await userEvent.click(await screen.findByRole('button', { name: /^Help!/ }));
  };

  it('fica fechado até clicar no botão', () => {
    render(<CreatePost onCreated={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('abre o diálogo "Novo post" com o texto focado e "Publicar" desligado enquanto vazio', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await open();

    expect(screen.getByRole('dialog', { name: 'Novo post' })).toBeInTheDocument();
    expect(texto()).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
  });

  it('publica só texto, sem música, fecha e avisa o feed', async () => {
    const onCreated = vi.fn();
    render(<CreatePost onCreated={onCreated} />);
    await open();

    await userEvent.type(texto(), '  alguém vai no show sábado?  ');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(postsApi.create).toHaveBeenCalledWith({ texto: 'alguém vai no show sábado?' });
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('conta os caracteres do texto', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await userEvent.type(texto(), 'clássico');
    expect(screen.getByText('8/500')).toBeInTheDocument();
    expect(texto()).toHaveAttribute('maxLength', '500');
  });

  it('"Adicionar música" abre a busca focada; "Voltar" volta sem perder o texto', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await userEvent.type(texto(), 'rascunho');
    await addMusic();

    expect(screen.getByLabelText('Buscar música')).toHaveFocus();
    expect(screen.getByText('Digite o nome de uma música ou artista.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(texto()).toHaveValue('rascunho');
  });

  it('busca com debounce e lista as faixas com artista e duração', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await addMusic();
    await search('help');

    const results = await screen.findByRole('list', { name: 'Resultados' });
    const items = within(results).getAllByRole('button', { name: /^(?!Tocar)/ });
    expect(items.map((item) => item.textContent)).toEqual(['Help!The Beatles · 2:18', 'YesterdayThe Beatles · 2:05']);
    // Ouvir antes de escolher: só quem tem prévia ganha o botão.
    expect(within(results).getByRole('button', { name: 'Tocar prévia de Help!' })).toBeInTheDocument();
    expect(within(results).queryByRole('button', { name: 'Tocar prévia de Yesterday' })).toBeNull();
    expect(musicApi.search).toHaveBeenCalledTimes(1);
    expect(musicApi.search).toHaveBeenCalledWith('help');
  });

  it('mostra que está buscando', async () => {
    musicApi.search.mockReturnValue(new Promise(() => {}));
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await addMusic();
    await search('help');
    expect(await screen.findByRole('status')).toHaveTextContent('Buscando…');
  });

  it('avisa quando nada é encontrado', async () => {
    musicApi.search.mockResolvedValue([]);
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await addMusic();
    await search('xyz');
    expect(await screen.findByText('Nada encontrado para “xyz”.')).toBeInTheDocument();
  });

  it('avisa quando a busca falha', async () => {
    musicApi.search.mockRejectedValue(new Error('offline'));
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await addMusic();
    await search('help');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar agora. Tente de novo.');
  });

  it('com música escolhida, publicar só depois de dar a nota', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();

    const escolhida = screen.getByRole('group', { name: 'Música escolhida' });
    expect(escolhida).toHaveTextContent('Help!');
    expect(escolhida).toHaveTextContent('The Beatles · 2:18');
    const publicar = screen.getByRole('button', { name: 'Publicar' });
    expect(publicar).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Estrela 4' }));
    expect(screen.getByText('3,5/5 · Bom')).toBeInTheDocument();
    expect(publicar).toBeEnabled();
  });

  describe('álbum', () => {
    const abbey = { id: 9, tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: 'abbey.jpg', faixas: 17 };

    const chooseAbbey = async () => {
      musicApi.search.mockResolvedValue([abbey]);
      await open();
      await addMusic();
      await userEvent.click(screen.getByRole('tab', { name: 'Álbuns' }));
      await userEvent.type(screen.getByLabelText('Buscar álbum'), 'abbey');
      await userEvent.click(await screen.findByRole('button', { name: /Abbey Road/ }));
    };

    it('a busca tem abas Músicas e Álbuns; em Álbuns procura álbuns', async () => {
      musicApi.search.mockResolvedValue([abbey]);
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await addMusic();

      expect(screen.getByRole('tab', { name: 'Músicas' })).toHaveAttribute('aria-selected', 'true');
      await userEvent.click(screen.getByRole('tab', { name: 'Álbuns' }));
      await userEvent.type(screen.getByLabelText('Buscar álbum'), 'abbey');

      const item = await screen.findByRole('button', { name: /Abbey Road/ });
      expect(item).toHaveTextContent('The Beatles · 17 faixas');
      expect(musicApi.search).toHaveBeenLastCalledWith('abbey', 'album');
    });

    it('publica o álbum com a nota', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await chooseAbbey();

      expect(screen.getByRole('group', { name: 'Álbum escolhido' })).toHaveTextContent('Abbey Road');
      await userEvent.click(screen.getByRole('button', { name: 'Estrela 5' }));
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

      expect(postsApi.create).toHaveBeenCalledWith({
        texto: '',
        albumName: 'Abbey Road',
        artistName: 'The Beatles',
        posterAlbum: 'abbey.jpg',
        postType: 'album',
        nota: 9,
      });
    });
  });

  it('"Trocar música" volta para a busca com os resultados de antes', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();

    await userEvent.click(screen.getByRole('button', { name: 'Trocar música' }));

    expect(screen.getByLabelText('Buscar música')).toHaveValue('help');
    expect(screen.getByRole('button', { name: /^Yesterday/ })).toBeInTheDocument();
  });

  it('a música escolhida também tem o botão de ouvir a prévia', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();
    const escolhida = screen.getByRole('group', { name: 'Música escolhida' });
    expect(within(escolhida).getByRole('button', { name: 'Tocar prévia de Help!' })).toBeInTheDocument();
  });

  it('"Remover música" tira a música e a nota', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();
    await userEvent.click(screen.getByRole('button', { name: 'Estrela 4' }));

    await userEvent.click(screen.getByRole('button', { name: 'Remover música' }));

    expect(screen.queryByRole('group', { name: 'Música escolhida' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Nota de 0 a 5 estrelas' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Adicionar música ou álbum' })).toBeInTheDocument();
  });

  it('publica com a música e a nota de 0 a 10', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();

    await userEvent.type(texto(), '  clássico  ');
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
  });

  it('mostra o erro do servidor e mantém o que foi preenchido', async () => {
    postsApi.create.mockRejectedValue(new Error('Dê uma nota de 0 a 5 estrelas.'));
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();
    await userEvent.type(texto(), 'ótima');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Estrela 3' }));
    expect(screen.getByText('3/5 · Bom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dê uma nota de 0 a 5 estrelas.');
    expect(texto()).toHaveValue('ótima');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled();
  });

  describe('barra de ícones e enquete', () => {
    it('a enquete é mais um botão de anexo, como música e imagem', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      expect(screen.getByRole('button', { name: /Criar enquete/ })).toBeInTheDocument();
      expect(screen.queryByRole('toolbar')).toBeNull();
      // Com música avaliada, não dá para criar enquete.
      await addMusic();
      await search('help');
      await userEvent.click(await screen.findByRole('button', { name: /^Help!/ }));
      expect(screen.queryByRole('button', { name: /Criar enquete/ })).toBeNull();
    });

    it('cria uma enquete com 2 músicas, escolhe a duração e publica', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await userEvent.type(texto(), 'qual?');
      await userEvent.click(screen.getByRole('button', { name: /Criar enquete/ }));
      await search('help');
      await userEvent.click(await screen.findByRole('button', { name: /^Help!/ }));

      const enquete = screen.getByRole('group', { name: 'Enquete' });
      expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
      await userEvent.click(within(enquete).getByRole('button', { name: 'Adicionar opção à enquete' }));
      await userEvent.click(await screen.findByRole('button', { name: /^Yesterday/ }));
      await userEvent.click(within(screen.getByRole('group', { name: 'Enquete' })).getByRole('radio', { name: '3 dias' }));

      // Com enquete, dá para pôr imagem, mas não música avaliada.
      expect(screen.getByRole('button', { name: /Adicionar imagem/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Adicionar música ou álbum/ })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
      expect(postsApi.create).toHaveBeenCalledWith({
        texto: 'qual?',
        enquete: {
          duracaoDias: 3,
          opcoes: [
            { titulo: 'Help!', artista: 'The Beatles', capa: 'help.jpg', preview: 'help.mp3' },
            { titulo: 'Yesterday', artista: 'The Beatles', capa: 'y.jpg', preview: null },
          ],
        },
      });
    });

    it('dá para pôr álbuns na enquete (sem prévia), misturados com músicas', async () => {
      const abbey = { id: 1, tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: 'abbey.jpg', faixas: 17 };
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await userEvent.click(screen.getByRole('button', { name: /Criar enquete/ }));
      await search('help');
      await userEvent.click(await screen.findByRole('button', { name: /^Help!/ }));

      musicApi.search.mockResolvedValue([abbey]);
      await userEvent.click(within(screen.getByRole('group', { name: 'Enquete' })).getByRole('button', { name: 'Adicionar opção à enquete' }));
      await userEvent.click(screen.getByRole('tab', { name: 'Álbuns' }));
      await userEvent.type(screen.getByLabelText('Buscar álbum'), 'abbey');
      // Mesmo id da música Help! (1), mas é um álbum: entra normalmente.
      await userEvent.click(await screen.findByRole('button', { name: /^Abbey Road/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

      expect(postsApi.create.mock.calls[0][0].enquete.opcoes).toEqual([
        { titulo: 'Help!', artista: 'The Beatles', capa: 'help.jpg', preview: 'help.mp3' },
        { titulo: 'Abbey Road', artista: 'The Beatles', capa: 'abbey.jpg', preview: null },
      ]);
    });

    it('dá para pôr artistas na enquete (só nela; o post normal não tem a aba Artistas)', async () => {
      const olivia = { id: 7, tipo: 'artista', titulo: 'Olivia Rodrigo', capa: 'olivia.jpg', fas: 1200 };
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await addMusic();
      expect(screen.queryByRole('tab', { name: 'Artistas' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

      await userEvent.click(screen.getByRole('button', { name: /Criar enquete/ }));
      musicApi.search.mockResolvedValue([olivia]);
      await userEvent.click(screen.getByRole('tab', { name: 'Artistas' }));
      await userEvent.type(screen.getByLabelText('Buscar artista'), 'olivia');
      expect(await screen.findByRole('button', { name: /^Olivia Rodrigo/ })).toHaveTextContent('1.200 fãs');
      expect(musicApi.search).toHaveBeenLastCalledWith('olivia', 'artista');
      await userEvent.click(screen.getByRole('button', { name: /^Olivia Rodrigo/ }));

      musicApi.search.mockResolvedValue([help]);
      await userEvent.click(screen.getByRole('button', { name: 'Adicionar opção à enquete' }));
      await userEvent.click(screen.getByRole('tab', { name: 'Músicas' }));
      await userEvent.type(screen.getByLabelText('Buscar música'), 'help');
      await userEvent.click(await screen.findByRole('button', { name: /^Help!/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

      expect(postsApi.create.mock.calls[0][0].enquete.opcoes[0]).toEqual({ titulo: 'Olivia Rodrigo', artista: null, capa: 'olivia.jpg', preview: null });
    });

    it('tirar uma música e remover a enquete', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await userEvent.click(screen.getByRole('button', { name: /Criar enquete/ }));
      await search('help');
      await userEvent.click(await screen.findByRole('button', { name: /^Help!/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Tirar Help! da enquete' }));
      expect(within(screen.getByRole('group', { name: 'Enquete' })).queryByText('Help!')).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Remover enquete' }));
      expect(screen.queryByRole('group', { name: 'Enquete' })).toBeNull();
      expect(screen.getByRole('button', { name: /Criar enquete/ })).toBeInTheDocument();
    });
  });

  describe('trecho da letra', () => {
    const versos = ['Primeiro verso', 'Segundo verso', 'Terceiro verso', 'Quarto verso', 'Quinto verso', 'Sexto verso'];
    const verso = (nome) => screen.getByRole('button', { name: nome });
    const abrirLetra = () => userEvent.click(screen.getByRole('button', { name: 'Adicionar trecho da letra' }));

    it('só aparece com uma música escolhida (álbum não tem)', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      expect(screen.queryByRole('button', { name: 'Adicionar trecho da letra' })).toBeNull();
      await addMusic();
      await search('help');
      await userEvent.click(await screen.findByRole('button', { name: /^Help!/ }));
      expect(screen.getByRole('button', { name: 'Adicionar trecho da letra' })).toBeInTheDocument();
    });

    it('escolhe versos seguidos (até 4) e publica junto com a música', async () => {
      musicApi.lyrics.mockResolvedValue(versos);
      render(<CreatePost onCreated={vi.fn()} />);
      await chooseHelp();
      await abrirLetra();

      expect(musicApi.lyrics).toHaveBeenCalledWith('Help!', 'The Beatles', 138);
      expect(await screen.findByRole('list', { name: 'Versos da letra' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Usar trecho' })).toBeDisabled();

      await userEvent.click(verso('Segundo verso'));
      await userEvent.click(verso('Terceiro verso'));
      expect(verso('Segundo verso')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('2 de 4')).toBeInTheDocument();
      await userEvent.click(verso('Quarto verso'));
      await userEvent.click(verso('Quinto verso'));
      await userEvent.click(verso('Sexto verso'));
      expect(screen.getByText('Dá pra escolher até 4 versos.')).toBeInTheDocument();
      expect(verso('Sexto verso')).toHaveAttribute('aria-pressed', 'false');

      await userEvent.click(screen.getByRole('button', { name: 'Usar trecho' }));
      const trecho = screen.getByLabelText('Trecho da letra de Help!');
      expect(trecho).toHaveTextContent('Segundo versoTerceiro versoQuarto versoQuinto verso');

      await userEvent.click(screen.getByRole('button', { name: 'Estrela 4' }));
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
      expect(postsApi.create).toHaveBeenCalledWith(expect.objectContaining({
        musicName: 'Help!',
        trechoLetra: ['Segundo verso', 'Terceiro verso', 'Quarto verso', 'Quinto verso'],
      }));
    });

    it('"Trocar trecho" reabre com os versos marcados; remover tira o trecho', async () => {
      musicApi.lyrics.mockResolvedValue(versos);
      render(<CreatePost onCreated={vi.fn()} />);
      await chooseHelp();
      await abrirLetra();
      await userEvent.click(await screen.findByRole('button', { name: 'Terceiro verso' }));
      await userEvent.click(screen.getByRole('button', { name: 'Usar trecho' }));

      await userEvent.click(screen.getByRole('button', { name: 'Trocar trecho' }));
      expect(await screen.findByRole('button', { name: 'Terceiro verso' })).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      await userEvent.click(screen.getByRole('button', { name: 'Remover trecho da letra' }));
      expect(screen.queryByLabelText('Trecho da letra de Help!')).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Estrela 4' }));
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
      expect(postsApi.create.mock.calls[0][0]).not.toHaveProperty('trechoLetra');
    });

    it('trocar de música apaga o trecho da música anterior', async () => {
      musicApi.lyrics.mockResolvedValue(versos);
      render(<CreatePost onCreated={vi.fn()} />);
      await chooseHelp();
      await abrirLetra();
      await userEvent.click(await screen.findByRole('button', { name: 'Primeiro verso' }));
      await userEvent.click(screen.getByRole('button', { name: 'Usar trecho' }));

      await userEvent.click(screen.getByRole('button', { name: 'Trocar música' }));
      await userEvent.click(screen.getByRole('button', { name: /^Yesterday/ }));
      expect(screen.queryByLabelText(/Trecho da letra/)).toBeNull();
    });

    it('se a base de letras falhar, avisa e deixa postar sem o trecho', async () => {
      musicApi.lyrics.mockRejectedValue(new Error('Não foi possível carregar a letra agora.'));
      render(<CreatePost onCreated={vi.fn()} />);
      await chooseHelp();
      await userEvent.type(texto(), 'ótima');
      await abrirLetra();

      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a letra agora. Você pode postar sem o trecho');
      expect(screen.queryByRole('button', { name: 'Usar trecho' })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

      expect(texto()).toHaveValue('ótima');
      await userEvent.click(screen.getByRole('button', { name: 'Estrela 4' }));
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
      expect(postsApi.create).toHaveBeenCalledWith(expect.objectContaining({ texto: 'ótima', musicName: 'Help!' }));
    });

    it('sem letra encontrada, avisa', async () => {
      musicApi.lyrics.mockResolvedValue([]);
      render(<CreatePost onCreated={vi.fn()} />);
      await chooseHelp();
      await abrirLetra();
      expect(await screen.findByText('Não encontramos a letra dessa música. Você pode postar sem o trecho.')).toBeInTheDocument();
    });
  });

  describe('imagem ou GIF', () => {
    const secureUrl = 'https://res.cloudinary.com/t/image/upload/v1/tunetalk/posts/gato.gif';
    const gif = () => new File(['GIF89a'], 'gato.gif', { type: 'image/gif' });
    const escolher = (file) => userEvent.upload(screen.getByLabelText('Escolher imagem'), file);
    const usar = () => userEvent.click(screen.getByRole('button', { name: 'Usar imagem' }));

    it('abre o ajuste com os formatos; "Original" vem marcado', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      expect(screen.getByRole('button', { name: 'Adicionar imagem' })).toBeInTheDocument();
      await escolher(gif());

      const ajuste = screen.getByRole('group', { name: 'Formato da imagem' });
      const formatos = within(ajuste).getAllByRole('button');
      expect(formatos.map((b) => b.textContent)).toEqual(['Original', 'Quadrado', 'Retrato', 'Paisagem']);
      expect(within(ajuste).getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByLabelText('Zoom')).toBeInTheDocument();
    });

    it('"Original": publica a imagem inteira, só limitando o tamanho, com a proporção dela', async () => {
      postsApi.uploadImage.mockResolvedValue(secureUrl);
      const onCreated = vi.fn();
      render(<CreatePost onCreated={onCreated} />);
      await open();
      const file = gif();
      await escolher(file);
      await usar();

      expect(screen.getByAltText('Imagem escolhida')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

      expect(postsApi.uploadImage).toHaveBeenCalledWith(file);
      expect(postsApi.create).toHaveBeenCalledWith({
        texto: '',
        imagemUrl: 'https://res.cloudinary.com/t/image/upload/c_limit,w_1600/v1/tunetalk/posts/gato.gif',
        imagemProporcao: 800 / 600,
      });
      await waitFor(() => expect(onCreated).toHaveBeenCalled());
    });

    it('com um formato escolhido, publica o pedaço que a pessoa enquadrou', async () => {
      postsApi.uploadImage.mockResolvedValue(secureUrl);
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await escolher(gif());
      await userEvent.click(screen.getByRole('button', { name: 'Quadrado' }));
      expect(screen.getByTestId('cropper')).toHaveAttribute('data-aspect', '1');
      await usar();
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));

      expect(postsApi.create).toHaveBeenCalledWith({
        texto: '',
        imagemUrl: 'https://res.cloudinary.com/t/image/upload/c_crop,x_80,y_0,w_640,h_600/c_limit,w_1600/v1/tunetalk/posts/gato.gif',
        imagemProporcao: 1,
      });
    });

    it('"Ajustar imagem" reabre o corte da imagem escolhida', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await escolher(gif());
      await usar();
      await userEvent.click(screen.getByRole('button', { name: 'Ajustar imagem' }));
      expect(screen.getByRole('group', { name: 'Formato da imagem' })).toBeInTheDocument();
      await usar();
      expect(screen.getByAltText('Imagem escolhida')).toBeInTheDocument();
    });

    it('"Cancelar" no ajuste desiste da imagem escolhida', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await escolher(gif());
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByAltText('Imagem escolhida')).toBeNull();
      expect(screen.getByRole('button', { name: 'Adicionar imagem' })).toBeInTheDocument();
    });

    it('mostra "Enviando imagem…" enquanto sobe', async () => {
      postsApi.uploadImage.mockReturnValue(new Promise(() => {}));
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await escolher(gif());
      await usar();
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
      expect(screen.getByRole('button', { name: 'Enviando imagem…' })).toBeDisabled();
    });

    it('"Remover imagem" tira a prévia', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await escolher(gif());
      await usar();
      await userEvent.click(screen.getByRole('button', { name: 'Remover imagem' }));
      expect(screen.queryByAltText('Imagem escolhida')).toBeNull();
      expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled();
    });

    it('colar uma imagem/GIF no texto funciona como anexar', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      const colado = gif();
      fireEvent.paste(texto(), { clipboardData: { files: [colado], getData: () => '' } });

      expect(screen.getByRole('group', { name: 'Formato da imagem' })).toBeInTheDocument();
      await usar();
      expect(screen.getByAltText('Imagem escolhida')).toBeInTheDocument();
    });

    it('colar texto continua colando texto', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      fireEvent.paste(texto(), { clipboardData: { files: [], getData: () => 'oi' } });
      expect(screen.queryByRole('group', { name: 'Formato da imagem' })).toBeNull();
    });

    it('recusa na hora imagem acima de 10 MB', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      const enorme = gif();
      Object.defineProperty(enorme, 'size', { value: 10 * 1024 * 1024 + 1 });
      await escolher(enorme);
      expect(screen.getByRole('alert')).toHaveTextContent('A imagem pode ter no máximo 10 MB.');
      expect(screen.queryByRole('group', { name: 'Formato da imagem' })).toBeNull();
    });
  });

  describe('marcar pessoas (@)', () => {
    const bia = { id: 2, nome: 'bia.souza', nomeExibicao: 'Bia Souza', fotoPerfil: 'b.png' };

    it('digitando @ aparecem sugestões; tocar completa o @usuario', async () => {
      usersApi.search.mockResolvedValue([bia]);
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await userEvent.type(texto(), 'ouve isso @bi');

      const sugestoes = await screen.findByRole('listbox', { name: 'Sugestões de marcação' });
      expect(usersApi.search).toHaveBeenLastCalledWith('bi');
      await userEvent.click(within(sugestoes).getByRole('option', { name: /Bia Souza/ }));

      expect(texto()).toHaveValue('ouve isso @bia.souza ');
      expect(screen.queryByRole('listbox')).toBeNull();
      await userEvent.type(texto(), 'demais');
      await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
      expect(postsApi.create).toHaveBeenCalledWith({ texto: 'ouve isso @bia.souza demais' });
    });

    it('teclado: setas escolhem, Enter completa, Esc fecha', async () => {
      usersApi.search.mockResolvedValue([bia, { id: 3, nome: 'bianca', fotoPerfil: 'c.png' }]);
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await userEvent.type(texto(), '@bi');
      await screen.findByRole('listbox', { name: 'Sugestões de marcação' });

      await userEvent.keyboard('{ArrowDown}{Enter}');
      expect(texto()).toHaveValue('@bianca ');

      await userEvent.type(texto(), '@bi');
      await screen.findByRole('listbox');
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('sem @ no fim do que está sendo digitado, não busca', async () => {
      render(<CreatePost onCreated={vi.fn()} />);
      await open();
      await userEvent.type(texto(), 'email ana@x.com ');
      expect(usersApi.search).not.toHaveBeenCalled();
    });
  });

  it('fechar sem querer não perde o que foi escrito: texto, música e nota voltam', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await chooseHelp();
    await userEvent.click(screen.getByRole('button', { name: 'Estrela 4' }));
    await userEvent.type(texto(), 'rascunho');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await open();
    expect(texto()).toHaveValue('rascunho');
    expect(screen.getByRole('group', { name: 'Música escolhida' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Rascunho recuperado.');
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled();
  });

  it('"Descartar" limpa o rascunho', async () => {
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await userEvent.type(texto(), 'rascunho');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(texto()).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await open();
    expect(texto()).toHaveValue('');
    expect(screen.queryByText('Rascunho recuperado.')).toBeNull();
  });

  it('publicar apaga o rascunho', async () => {
    postsApi.create.mockResolvedValue({ id: 1 });
    render(<CreatePost onCreated={vi.fn()} />);
    await open();
    await userEvent.type(texto(), 'bom dia');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await open();
    expect(texto()).toHaveValue('');
  });
});
