import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { NotificationList } from './NotificationList.jsx';
import { renderWithProviders } from '../../test/render.jsx';

const ana = { id: 1, nome: 'ana', fotoPerfil: 'a.png' };
const bia = { id: 2, nome: 'bia', fotoPerfil: 'b.png' };

describe('NotificationList: selo de fundador e marcações', () => {
  it('selo de fundador: mensagem do TuneTalk com a medalha, levando ao próprio perfil', () => {
    renderWithProviders(<NotificationList notifications={[{
      id: 1, tipo: 'selo_fundador', conteudo: 'Você ganhou o selo de fundador!', lida: false, postId: null, autor: ana,
    }]} />);

    const item = screen.getByRole('link');
    expect(item).toHaveAttribute('href', '/perfil/1');
    expect(item).toHaveTextContent('TuneTalk Você ganhou o selo de fundador!');
    expect(item).not.toHaveTextContent(/^ana/);
    expect(item.querySelector('.notif__icon--selo_fundador .bi-award-fill')).not.toBeNull();
  });

  it('marcação: quem marcou e o link para o post', () => {
    renderWithProviders(<NotificationList notifications={[{
      id: 2, tipo: 'mention', conteudo: 'marcou você em um post', lida: true, postId: 30, autor: bia,
    }]} />);
    const item = screen.getByRole('link');
    expect(item).toHaveAttribute('href', '/post/30');
    expect(within(item).getByText('bia')).toBeInTheDocument();
    expect(item.querySelector('.bi-at')).not.toBeNull();
  });
});
