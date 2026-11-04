import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PollBlock, tempoRestante } from './PollBlock.jsx';
import { postsApi } from '../../api/index.js';
import { makeAuth, renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({ postsApi: { votar: vi.fn() }, musicApi: { preview: vi.fn() } }));

const daqui = (horas) => new Date(Date.now() + horas * 3600000).toISOString();
const enquete = (extra = {}) => ({
  fim: daqui(48), encerrada: false, total: 3, meuVoto: null,
  opcoes: [
    { id: 1, titulo: 'Help!', artista: 'The Beatles', capa: 'h.jpg', preview: 'https://p/h.mp3', votos: 1 },
    { id: 2, titulo: 'Yesterday', artista: 'The Beatles', capa: 'y.jpg', preview: null, votos: 2 },
  ],
  ...extra,
});
const post = (extra = {}) => ({ id: 9, autor: { id: 5, nome: 'carla' }, enquete: enquete(), ...extra });

describe('PollBlock (enquete de músicas)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('antes de votar: cada música é um botão, sem porcentagem; com prévia ganha o play', () => {
    renderWithProviders(<PollBlock post={post()} />);
    const grupo = screen.getByRole('group', { name: 'Enquete' });
    expect(within(grupo).getByRole('button', { name: 'Votar em Help!, The Beatles' })).toBeInTheDocument();
    expect(within(grupo).getByRole('button', { name: 'Tocar prévia de Help!' })).toBeInTheDocument();
    expect(within(grupo).queryByText('67%')).toBeNull();
    expect(grupo).toHaveTextContent('3 votos · termina em 2 dias');
  });

  it('votar mostra o resultado com o voto marcado', async () => {
    postsApi.votar.mockResolvedValue(enquete({ total: 4, meuVoto: 1, opcoes: enquete().opcoes.map((o) => (o.id === 1 ? { ...o, votos: 2 } : o)) }));
    renderWithProviders(<PollBlock post={post()} />);
    await userEvent.click(screen.getByRole('button', { name: /^Votar em Help!/ }));

    expect(postsApi.votar).toHaveBeenCalledWith(9, 1);
    expect(screen.getByLabelText('Help!: 50%, seu voto')).toBeInTheDocument();
    expect(screen.getByLabelText('Yesterday: 50%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Votar/ })).toBeNull();
  });

  it('quem postou e enquete encerrada já mostram o resultado', () => {
    const { unmount } = renderWithProviders(<PollBlock post={post()} />, { auth: makeAuth({ user: { id: 5, nome: 'carla' } }) });
    expect(screen.getByLabelText('Yesterday: 67%')).toBeInTheDocument();
    unmount();
    renderWithProviders(<PollBlock post={post({ enquete: enquete({ fim: daqui(-1), encerrada: true }) })} />);
    expect(screen.getByText(/Enquete encerrada/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Votar/ })).toBeNull();
  });

  it('erro ao votar aparece e deixa tentar de novo', async () => {
    postsApi.votar.mockRejectedValue(new Error('Essa enquete já terminou.'));
    renderWithProviders(<PollBlock post={post()} />);
    await userEvent.click(screen.getByRole('button', { name: /^Votar em Yesterday/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Essa enquete já terminou.');
  });

  it('tempoRestante fala em min, h e dias', () => {
    const agora = Date.now();
    expect(tempoRestante(new Date(agora + 5 * 60000), agora)).toBe('5 min');
    expect(tempoRestante(new Date(agora + 5 * 3600000), agora)).toBe('5 h');
    expect(tempoRestante(new Date(agora + 24 * 3600000), agora)).toBe('1 dia');
    expect(tempoRestante(new Date(agora - 1000), agora)).toBeNull();
  });
});
