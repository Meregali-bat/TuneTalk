import { describe, it, expect, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresenteDeNatal, EVENTO_TOCA } from './PresenteDeNatal.jsx';
import { usersApi } from '../../api/index.js';
import { renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({ usersApi: { profile: vi.fn() } }));

describe('PresenteDeNatal', () => {
  it('ao ganhar a toca, comemora com a foto da pessoa já de toca', async () => {
    usersApi.profile.mockResolvedValue({ usuario: { fotoPerfil: 'ana.png' } });
    renderWithProviders(<PresenteDeNatal />);
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => { window.dispatchEvent(new Event(EVENTO_TOCA)); });
    const dialogo = await screen.findByRole('dialog', { name: 'Presente de Natal!' });
    expect(dialogo).toHaveTextContent('toca de Natal');
    expect(await screen.findByAltText('Sua foto de perfil com a toca de Natal')).toHaveAttribute('src', 'ana.png');
    expect(dialogo.querySelector('.toca-natal')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Ver meu perfil' })).toHaveAttribute('href', '/perfil/1');

    await userEvent.click(screen.getByRole('button', { name: 'Valeu!' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
