import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
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

  const renderModal = (props = {}) =>
    renderWithProviders(<EditProfileModal open usuario={ana} onClose={vi.fn()} onSaved={vi.fn()} {...props} />);

  it('abre como diálogo preenchido com os dados atuais', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Editar perfil' });
    expect(within(dialog).getByLabelText('Nome de usuário')).toHaveValue('Ana');
    expect(within(dialog).getByLabelText('Bio')).toHaveValue('oi');
    expect(within(dialog).getByAltText('Foto de perfil')).toHaveAttribute('src', 'ana.png');
    expect(within(dialog).getByText('2/255')).toBeInTheDocument();
  });

  it('mostra a prévia da foto escolhida e salva com FormData', async () => {
    usersApi.updateMe.mockResolvedValue({ ...ana, nome: 'ana_b' });
    const onSaved = vi.fn();
    renderModal({ onSaved });

    const file = new File(['img'], 'nova.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Trocar foto'), file);
    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', 'blob:preview');

    await userEvent.clear(screen.getByLabelText('Nome de usuário'));
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana_b');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const form = usersApi.updateMe.mock.calls[0][0];
    expect(form.get('nome')).toBe('ana_b');
    expect(form.get('bio')).toBe('oi');
    expect(form.get('foto')).toBe(file);
    expect(onSaved).toHaveBeenCalledWith({ ...ana, nome: 'ana_b' });
  });

  it('não envia foto quando nenhuma foi escolhida', async () => {
    usersApi.updateMe.mockResolvedValue(ana);
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(usersApi.updateMe.mock.calls[0][0].has('foto')).toBe(false);
  });

  it('avisa as regras quando o nome novo não serve e não deixa salvar', async () => {
    renderModal();
    await userEvent.clear(screen.getByLabelText('Nome de usuário'));
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana b');

    expect(screen.getByText('Use só letras sem acento, números, ponto e underline.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('limita a bio a 255 caracteres', () => {
    renderModal();
    expect(screen.getByLabelText('Bio')).toHaveAttribute('maxLength', '255');
  });

  it('mostra o erro do servidor', async () => {
    usersApi.updateMe.mockRejectedValue(new Error('Esse nome de usuário já está em uso.'));
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esse nome de usuário já está em uso.');
  });

  it('fecha pelo X ou por "Cancelar"', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
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
