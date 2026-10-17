import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditProfileModal } from './EditProfileModal.jsx';
import { UserListModal } from './UserListModal.jsx';
import { usersApi } from '../../api/index.js';
import { renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({
  usersApi: { updateMe: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
}));

const ana = { id: 1, nome: 'Ana', fotoPerfil: 'ana.png', bio: 'oi' };

describe('EditProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('vem preenchido com os dados atuais', () => {
    renderWithProviders(<EditProfileModal open usuario={ana} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Nome')).toHaveValue('Ana');
    expect(screen.getByLabelText('Bio')).toHaveValue('oi');
    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', 'ana.png');
  });

  it('mostra a prévia da foto escolhida e salva com FormData', async () => {
    usersApi.updateMe.mockResolvedValue({ ...ana, nome: 'Ana B' });
    const onSaved = vi.fn();
    renderWithProviders(<EditProfileModal open usuario={ana} onClose={vi.fn()} onSaved={onSaved} />);

    const file = new File(['img'], 'nova.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Escolher foto'), file);
    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', 'blob:preview');

    await userEvent.clear(screen.getByLabelText('Nome'));
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana B');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const form = usersApi.updateMe.mock.calls[0][0];
    expect(form.get('nome')).toBe('Ana B');
    expect(form.get('bio')).toBe('oi');
    expect(form.get('foto')).toBe(file);
    expect(onSaved).toHaveBeenCalledWith({ ...ana, nome: 'Ana B' });
  });

  it('não envia foto quando nenhuma foi escolhida', async () => {
    usersApi.updateMe.mockResolvedValue(ana);
    renderWithProviders(<EditProfileModal open usuario={ana} onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(usersApi.updateMe.mock.calls[0][0].has('foto')).toBe(false);
  });

  it('mostra o erro do servidor', async () => {
    usersApi.updateMe.mockRejectedValue(new Error('Erro ao fazer o upload da imagem'));
    renderWithProviders(<EditProfileModal open usuario={ana} onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao fazer o upload da imagem');
  });

  it('fecha pelo X', async () => {
    const onClose = vi.fn();
    renderWithProviders(<EditProfileModal open usuario={ana} onClose={onClose} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar edição' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('UserListModal', () => {
  const users = [
    { id: 1, nome: 'Ana', fotoPerfil: 'ana.png' },
    { id: 2, nome: 'Bia', fotoPerfil: 'bia.png' },
    { id: 3, nome: 'Caio', fotoPerfil: 'caio.png' },
  ];

  it('lista usuários com link e botão de seguir conforme quem eu sigo (exceto eu mesmo)', () => {
    renderWithProviders(
      <UserListModal open title="Seguidores" users={users} seguindoIds={[2]} onClose={vi.fn()} onFollowChange={vi.fn()} />,
    );

    expect(screen.getByText('Bia').closest('a')).toHaveAttribute('href', '/perfil/2');
    const buttons = screen.getAllByRole('button', { name: /Seguir|Seguindo/ });
    expect(buttons.map((b) => b.textContent)).toEqual(['Seguindo', 'Seguir']);
  });

  it('avisa quando alguém é seguido', async () => {
    usersApi.follow.mockResolvedValue(null);
    const onFollowChange = vi.fn();
    renderWithProviders(
      <UserListModal open title="Seguidores" users={users} seguindoIds={[]} onClose={vi.fn()} onFollowChange={onFollowChange} />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Seguir' })[0]);
    expect(usersApi.follow).toHaveBeenCalledWith(2);
    expect(onFollowChange).toHaveBeenCalled();
  });

  it('mostra mensagem para lista vazia', () => {
    renderWithProviders(<UserListModal open title="Seguindo" users={[]} seguindoIds={[]} onClose={vi.fn()} />);
    expect(screen.getByText('Ninguém por aqui ainda.')).toBeInTheDocument();
  });
});
