import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueroOuvirPage } from './QueroOuvirPage.jsx';
import { postsApi, queroOuvirApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({
  queroOuvirApi: { list: vi.fn(), add: vi.fn(), remove: vi.fn() },
  postsApi: { create: vi.fn() },
  musicApi: { search: vi.fn(), preview: vi.fn() },
  usersApi: { search: vi.fn() },
}));

const abbey = { id: 1, tipo: 'album', titulo: 'Abbey Road', artista: 'The Beatles', capa: 'a.jpg', releaseDate: '1969-09-26', preview: null };
const help = { id: 2, tipo: 'musica', titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', releaseDate: '138', preview: 'p.mp3' };

describe('QueroOuvirPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queroOuvirApi.list.mockResolvedValue([abbey, help]);
  });

  it('lista os discos guardados, cada um levando à página dele', async () => {
    renderWithProviders(<QueroOuvirPage />);
    const itens = await screen.findAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(screen.getByText('2 discos')).toBeInTheDocument();
    expect(within(itens[0]).getByText('The Beatles • álbum • 1969')).toBeInTheDocument();
    expect(within(itens[0]).getByRole('link')).toHaveAttribute('href', '/album?titulo=Abbey+Road&artista=The+Beatles');
  });

  it('tirar da lista', async () => {
    queroOuvirApi.remove.mockResolvedValue(null);
    renderWithProviders(<QueroOuvirPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Tirar Abbey Road da lista' }));
    expect(queroOuvirApi.remove).toHaveBeenCalledWith(abbey);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('"Avaliar" abre o novo post com o disco; publicar tira da lista', async () => {
    postsApi.create.mockResolvedValue({ id: 9 });
    renderWithProviders(<QueroOuvirPage />);
    const [, segundo] = await screen.findAllByRole('listitem');
    await userEvent.click(within(segundo).getByRole('button', { name: 'Avaliar' }));

    const dialogo = screen.getByRole('dialog', { name: 'Novo post' });
    expect(within(dialogo).getByLabelText('Música escolhida')).toHaveTextContent('Help!');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Estrela 4' }));
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Publicar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(postsApi.create).toHaveBeenCalledWith(expect.objectContaining({ musicName: 'Help!', artistName: 'The Beatles' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Avaliação de Help! publicada.');
  });

  it('lista vazia explica como guardar', async () => {
    queroOuvirApi.list.mockResolvedValue([]);
    renderWithProviders(<QueroOuvirPage />);
    expect(await screen.findByRole('heading', { name: 'Nada para ouvir depois' })).toBeInTheDocument();
  });
});
