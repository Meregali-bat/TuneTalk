import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal.jsx';
import { Alert } from './Alert.jsx';
import { PasswordInput } from './PasswordInput.jsx';
import { FollowButton } from './FollowButton.jsx';
import { usersApi } from '../../api/index.js';

vi.mock('../../api/index.js', () => ({ usersApi: { follow: vi.fn(), unfollow: vi.fn() } }));

describe('Modal', () => {
  it('não renderiza quando fechado', () => {
    render(<Modal open={false} title="Seguidores" onClose={vi.fn()}>conteúdo</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('mostra título e conteúdo e fecha pelo botão, pelo fundo e pelo Esc', async () => {
    const onClose = vi.fn();
    render(<Modal open title="Seguidores" onClose={onClose}>conteúdo</Modal>);

    expect(screen.getByRole('dialog', { name: 'Seguidores' })).toHaveTextContent('conteúdo');

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('clicar dentro do conteúdo não fecha', async () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose}><p>dentro</p></Modal>);
    await userEvent.click(screen.getByText('dentro'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Alert', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('some depois de 3 segundos', () => {
    render(<Alert message="Usuário ou senha incorretos." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reaparece quando chega uma nova mensagem', () => {
    const { rerender } = render(<Alert message="erro 1" />);
    act(() => vi.advanceTimersByTime(3000));
    rerender(<Alert message="erro 2" />);
    expect(screen.getByRole('alert')).toHaveTextContent('erro 2');
  });

  it('não renderiza sem mensagem', () => {
    render(<Alert message="" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('PasswordInput', () => {
  it('alterna a visibilidade da senha', async () => {
    render(<PasswordInput id="senha" placeholder="Senha" value="" onChange={() => {}} />);
    const input = screen.getByPlaceholderText('Senha');
    expect(input).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});

describe('FollowButton', () => {
  beforeEach(() => vi.clearAllMocks());

  it('segue quem ainda não é seguido e avisa a mudança', async () => {
    usersApi.follow.mockResolvedValue(null);
    const onChange = vi.fn();
    render(<FollowButton userId={2} following={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));

    expect(usersApi.follow).toHaveBeenCalledWith(2);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('deixa de seguir quem já é seguido', async () => {
    usersApi.unfollow.mockResolvedValue(null);
    const onChange = vi.fn();
    render(<FollowButton userId={2} following onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Seguindo' }));

    expect(usersApi.unfollow).toHaveBeenCalledWith(2);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
