import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal.jsx';
import { PasswordInput } from './PasswordInput.jsx';
import { FollowButton } from './FollowButton.jsx';
import { usersApi } from '../../api/index.js';

vi.mock('../../api/index.js', () => ({ usersApi: { follow: vi.fn(), unfollow: vi.fn() } }));

describe('Modal', () => {
  it('ao abrir, o foco entra na janela, o Tab fica preso nela e, ao fechar, volta para quem abriu', async () => {
    function Teste() {
      const [aberto, setAberto] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setAberto(true)}>Abrir</button>
          <button type="button">Atrás</button>
          <Modal open={aberto} title="Janela" onClose={() => setAberto(false)}>
            <button type="button">Dentro</button>
          </Modal>
        </>
      );
    }
    render(<Teste />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(abrir);
    expect(screen.getByRole('dialog', { name: 'Janela' })).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Dentro' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(abrir).toHaveFocus();
  });

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

  it('trava a rolagem da página de trás enquanto está aberto', () => {
    const { rerender } = render(<Modal open title="T" onClose={vi.fn()}>x</Modal>);
    expect(document.body).toHaveClass('modal-open');
    rerender(<Modal open={false} title="T" onClose={vi.fn()}>x</Modal>);
    expect(document.body).not.toHaveClass('modal-open');
  });

  it('a variante "sheet" acompanha a área visível acima do teclado', () => {
    window.visualViewport = { height: 400, offsetTop: 0, addEventListener() {}, removeEventListener() {} };
    render(<Modal open title="T" onClose={vi.fn()} variant="sheet">x</Modal>);
    expect(document.documentElement.style.getPropertyValue('--vvh')).toBe('400px');
    delete window.visualViewport;
  });

  it('clicar dentro do conteúdo não fecha', async () => {
    const onClose = vi.fn();
    render(<Modal open title="T" onClose={onClose}><p>dentro</p></Modal>);
    await userEvent.click(screen.getByText('dentro'));
    expect(onClose).not.toHaveBeenCalled();
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

    // Primeiro toque só pede confirmação; o segundo deixa de seguir.
    await userEvent.click(screen.getByRole('button', { name: 'Seguindo' }));
    expect(usersApi.unfollow).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Deixar de seguir?' }));

    expect(usersApi.unfollow).toHaveBeenCalledWith(2);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('a confirmação de deixar de seguir some se a pessoa não tocar de novo', async () => {
    render(<FollowButton userId={2} following />);
    const botao = screen.getByRole('button', { name: 'Seguindo' });
    await userEvent.click(botao);
    expect(botao).toHaveTextContent('Deixar de seguir?');
    expect(screen.getByRole('status')).toHaveTextContent('Toque de novo para deixar de seguir.');
    await act(() => { botao.blur(); });
    expect(botao).toHaveTextContent('Seguindo');
    expect(usersApi.unfollow).not.toHaveBeenCalled();
  });

  it('se falhar, avisa e deixa tentar de novo', async () => {
    usersApi.follow.mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(null);
    const onChange = vi.fn();
    render(<FollowButton userId={2} following={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para seguir. Tente de novo.');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
