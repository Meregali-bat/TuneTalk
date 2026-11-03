import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditProfileModal } from './EditProfileModal.jsx';
import { UserListModal } from './UserListModal.jsx';
import { usersApi } from '../../api/index.js';
import { renderWithProviders } from '../../test/render.jsx';

vi.mock('../../api/index.js', () => ({
  usersApi: { updateMe: vi.fn(), uploadPhoto: vi.fn(), uploadBanner: vi.fn(), follow: vi.fn(), unfollow: vi.fn() },
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

  it('mostra a prévia, envia a foto (GIF incluso) direto para o Cloudinary e salva o link', async () => {
    usersApi.uploadPhoto.mockResolvedValue('https://res.cloudinary.com/t/eu.gif');
    usersApi.updateMe.mockResolvedValue({ ...ana, nome: 'ana_b' });
    const onSaved = vi.fn();
    renderModal({ onSaved });

    const gif = new File(['gif'], 'eu.gif', { type: 'image/gif' });
    await userEvent.upload(screen.getByLabelText('Trocar foto'), gif);
    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', 'blob:preview');

    await userEvent.clear(screen.getByLabelText('Nome de usuário'));
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana_b');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(usersApi.uploadPhoto).toHaveBeenCalledWith(gif);
    expect(usersApi.updateMe).toHaveBeenCalledWith({ nome: 'ana_b', nomeExibicao: '', bio: 'oi', fotoPerfil: 'https://res.cloudinary.com/t/eu.gif' });
    expect(onSaved).toHaveBeenCalledWith({ ...ana, nome: 'ana_b' });
  });

  it('mostra "Enviando foto…" enquanto a foto sobe', async () => {
    usersApi.uploadPhoto.mockReturnValue(new Promise(() => {}));
    renderModal();
    await userEvent.upload(screen.getByLabelText('Trocar foto'), new File(['gif'], 'eu.gif', { type: 'image/gif' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('button', { name: 'Enviando foto…' })).toBeDisabled();
  });

  it('recusa na hora foto acima de 10 MB, sem tentar enviar', async () => {
    renderModal();
    const enorme = new File(['x'], 'enorme.gif', { type: 'image/gif' });
    Object.defineProperty(enorme, 'size', { value: 10 * 1024 * 1024 + 1 });
    await userEvent.upload(screen.getByLabelText('Trocar foto'), enorme);

    expect(screen.getByRole('alert')).toHaveTextContent('A foto pode ter no máximo 10 MB.');
    expect(screen.getByAltText('Foto de perfil')).toHaveAttribute('src', 'ana.png');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(usersApi.uploadPhoto).not.toHaveBeenCalled();
  });

  it('Salvar só liga com alguma mudança; sem foto nova, não envia foto', async () => {
    usersApi.updateMe.mockResolvedValue(ana);
    renderModal();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Bio'), '!');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(usersApi.uploadPhoto).not.toHaveBeenCalled();
    expect(usersApi.updateMe).toHaveBeenCalledWith({ nome: 'Ana', nomeExibicao: '', bio: 'oi!' });
  });

  it('avisa as regras quando o nome novo não serve e não deixa salvar', async () => {
    renderModal();
    await userEvent.clear(screen.getByLabelText('Nome de usuário'));
    await userEvent.type(screen.getByLabelText('Nome de usuário'), 'ana b');

    expect(screen.getByText('Use só letras sem acento, números, ponto e underline.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('edita o nome de exibição (até 50) e troca a capa', async () => {
    usersApi.uploadBanner.mockResolvedValue('https://res.cloudinary.com/t/capa.jpg');
    usersApi.updateMe.mockResolvedValue(ana);
    renderModal({ usuario: { ...ana, nomeExibicao: 'Ana', bannerUrl: 'velha.jpg' } });

    expect(screen.getByAltText('Capa do perfil')).toHaveAttribute('src', 'velha.jpg');
    expect(screen.getByLabelText('Nome')).toHaveAttribute('maxLength', '50');
    await userEvent.clear(screen.getByLabelText('Nome'));
    await userEvent.type(screen.getByLabelText('Nome'), 'Ana Souza ✨');
    const capa = new File(['img'], 'capa.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Escolher capa'), capa);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(usersApi.uploadBanner).toHaveBeenCalledWith(capa);
    expect(usersApi.updateMe).toHaveBeenCalledWith({
      nome: 'Ana', nomeExibicao: 'Ana Souza ✨', bio: 'oi', bannerUrl: 'https://res.cloudinary.com/t/capa.jpg',
    });
  });

  it('fundador escolhe se a medalha aparece; quem não é fundador não vê a opção', async () => {
    usersApi.updateMe.mockResolvedValue(ana);
    const { unmount } = renderModal({ usuario: { ...ana, fundadorDesde: '2026-11-03T12:00:00.000Z', mostrarSeloFundador: true } });
    const opcao = screen.getByRole('checkbox', { name: 'Mostrar selo de fundador no meu perfil' });
    expect(opcao).toBeChecked();
    await userEvent.click(opcao);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(usersApi.updateMe.mock.calls[0][0]).toMatchObject({ mostrarSeloFundador: false });
    unmount();

    renderModal();
    expect(screen.queryByRole('checkbox', { name: /selo de fundador/ })).toBeNull();
  });

  it('limita a bio a 255 caracteres', () => {
    renderModal();
    expect(screen.getByLabelText('Bio')).toHaveAttribute('maxLength', '255');
  });

  it('mostra o erro do servidor', async () => {
    usersApi.updateMe.mockRejectedValue(new Error('Esse nome de usuário já está em uso.'));
    renderModal();
    await userEvent.type(screen.getByLabelText('Bio'), '!');
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

  it('mostra o nome de exibição e o @ de cada pessoa', () => {
    renderWithProviders(
      <UserListModal open title="Seguidores" users={[{ id: 2, nome: 'bia', nomeExibicao: 'Bia Souza', fotoPerfil: 'b.png' }]} seguindoIds={[]} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Bia Souza')).toBeInTheDocument();
    expect(screen.getByText('@bia')).toBeInTheDocument();
  });

  it('mostra o selo de fundador nas listas', () => {
    renderWithProviders(
      <UserListModal open title="Seguidores" users={[{ id: 2, nome: 'bia', fotoPerfil: 'b.png', fundadorDesde: '2026-11-03T12:00:00.000Z' }]} seguindoIds={[]} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('img', { name: 'No TuneTalk desde o início' })).toBeInTheDocument();
  });

  it('mostra o selo de quem é verificado', () => {
    renderWithProviders(
      <UserListModal open title="Seguidores" users={[{ id: 11, nome: 'meregali.bat', fotoPerfil: 'm.png' }]} seguindoIds={[]} onClose={vi.fn()} />,
    );
    expect(screen.getByRole('img', { name: 'Verificado' })).toHaveClass('verified-badge--tunetalk');
  });

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
