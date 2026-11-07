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

  it('voto na enquete: quem votou, com ícone de enquete, levando ao post', () => {
    renderWithProviders(<NotificationList notifications={[{
      id: 3, tipo: 'voto_enquete', conteudo: 'votou na sua enquete', lida: false, postId: 40, autor: bia,
    }]} />);
    const item = screen.getByRole('link');
    expect(item).toHaveAttribute('href', '/post/40');
    expect(item).toHaveTextContent('bia votou na sua enquete');
    expect(item.querySelector('.notif__icon--voto_enquete .bi-bar-chart-fill')).not.toBeNull();
  });

  it('citação: quem citou, com ícone de aspas, levando à citação', () => {
    renderWithProviders(<NotificationList notifications={[{
      id: 4, tipo: 'citacao', conteudo: 'remixou seu post', lida: false, postId: 41, autor: bia,
    }]} />);
    const item = screen.getByRole('link');
    expect(item).toHaveAttribute('href', '/post/41');
    expect(item).toHaveTextContent('bia remixou seu post');
    expect(item.querySelector('.notif__icon--citacao .bi-shuffle')).not.toBeNull();
  });

  it('se a lista não carregar, diz que falhou (e não que está vazia)', () => {
    renderWithProviders(<NotificationList notifications={{ erro: true }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as notificações');
    expect(screen.queryByText('Nada por aqui ainda')).toBeNull();
  });

  it('100 posts: parabéns do TuneTalk com troféu, levando ao 100º post', () => {
    renderWithProviders(<NotificationList notifications={[{
      id: 4, tipo: 'marco_posts', conteudo: 'Parabéns pelo seu 100º post!', lida: false, postId: 50, autor: ana,
    }]} />);
    const item = screen.getByRole('link');
    expect(item).toHaveAttribute('href', '/post/50');
    expect(item).toHaveTextContent('TuneTalk Parabéns pelo seu 100º post!');
    expect(item.querySelector('.notif__icon--marco_posts .bi-trophy-fill')).not.toBeNull();
  });
});
