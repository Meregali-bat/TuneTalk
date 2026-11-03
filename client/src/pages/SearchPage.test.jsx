import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPage } from './SearchPage.jsx';
import { usersApi } from '../api/index.js';
import { renderWithProviders } from '../test/render.jsx';

vi.mock('../api/index.js', () => ({ usersApi: { search: vi.fn(), follow: vi.fn(), unfollow: vi.fn() } }));

const sweetener = { id: 7, nome: 'sweetener', nomeExibicao: 'Olivia Fã', fotoPerfil: 's.png', bio: 'guts', seguindo: false };
const mateus = { id: 8, nome: 'mateus', nomeExibicao: null, fotoPerfil: 'm.png', seguindo: true };

describe('SearchPage (buscar pessoas)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersApi.search.mockResolvedValue([sweetener, mateus]);
  });

  const buscar = (texto) => userEvent.type(screen.getByLabelText('Buscar pessoas'), texto);

  it('começa com o campo focado e uma dica', () => {
    renderWithProviders(<SearchPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Buscar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar pessoas')).toHaveFocus();
    expect(screen.getByText('Busque pelo nome ou pelo @.')).toBeInTheDocument();
  });

  it('busca enquanto digita e mostra nome, @, selo e o botão de seguir de cada pessoa', async () => {
    renderWithProviders(<SearchPage />);
    await buscar('sw');

    const lista = await screen.findByRole('list', { name: 'Pessoas encontradas' });
    expect(usersApi.search).toHaveBeenCalledWith('sw');
    const [primeira, segunda] = within(lista).getAllByRole('listitem');
    expect(within(primeira).getByRole('link', { name: /Olivia Fã/ })).toHaveAttribute('href', '/perfil/7');
    expect(primeira).toHaveTextContent('@sweetener');
    expect(within(primeira).getByRole('img', { name: 'Verificado' })).toBeInTheDocument();
    expect(within(primeira).getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    expect(within(segunda).getByRole('button', { name: 'Seguindo' })).toBeInTheDocument();
  });

  it('não mostra botão de seguir para a própria pessoa', async () => {
    usersApi.search.mockResolvedValue([{ id: 1, nome: 'ana', fotoPerfil: 'a.png', seguindo: false }]);
    renderWithProviders(<SearchPage />);
    await buscar('ana');
    const lista = await screen.findByRole('list', { name: 'Pessoas encontradas' });
    expect(within(lista).queryByRole('button')).toBeNull();
  });

  it('avisa quando ninguém é encontrado', async () => {
    usersApi.search.mockResolvedValue([]);
    renderWithProviders(<SearchPage />);
    await buscar('xyz');
    expect(await screen.findByText('Ninguém encontrado para “xyz”.')).toBeInTheDocument();
  });

  it('avisa quando a busca falha', async () => {
    usersApi.search.mockRejectedValue(new Error('offline'));
    renderWithProviders(<SearchPage />);
    await buscar('bia');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar agora. Tente de novo.');
  });
});
