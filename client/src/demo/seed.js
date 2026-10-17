// Dados fictícios da demonstração. Nada aqui vem do banco real.
import md5 from 'md5';
import { avatar, coverArt } from './art.js';

export const DEMO_LOGIN = { email: 'ana@demo.com', senha: 'Demo!123' };

// Catálogo usado pela busca de músicas da demo (no app real, a busca vai ao Deezer).
export const CATALOG = [
  ['Help!', 'The Beatles', 138], ['Here Comes the Sun', 'The Beatles', 185], ['Come Together', 'The Beatles', 259],
  ['Bohemian Rhapsody', 'Queen', 354], ['Garota de Ipanema', 'João Gilberto', 315], ['Construção', 'Chico Buarque', 384],
  ['Velha Infância', 'Tribalistas', 250], ['Blinding Lights', 'The Weeknd', 200], ['Águas de Março', 'Elis Regina', 213],
  ['Clube da Esquina nº 2', 'Milton Nascimento', 222], ['Smells Like Teen Spirit', 'Nirvana', 301], ['Tempo Perdido', 'Legião Urbana', 301],
].map(([titulo, artista, duracao], i) => ({ id: i + 1, titulo, artista, capa: coverArt(titulo, artista), duracao, preview: null }));

const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000).toISOString();

const user = (id, nome, email, bio) => ({ id, nome, email, senha: md5('Demo!123'), fotoPerfil: avatar(nome), bio });

const track = (titulo) => CATALOG.find((t) => t.titulo === titulo);

const musicPost = (id, autorId, titulo, texto, nota, minutes) => {
  const t = track(titulo);
  return {
    id, autorId, texto, nota, createdAt: minutesAgo(minutes), postType: 'música',
    musicName: t.titulo, artistName: t.artista, posterMusica: t.capa, releaseDate: String(t.duracao), musicPreview: null,
    albumName: null, posterAlbum: null,
  };
};

const albumPost = (id, autorId, albumName, artistName, releaseDate, texto, nota, minutes) => ({
  id, autorId, texto, nota, createdAt: minutesAgo(minutes), postType: 'album',
  albumName, artistName, posterAlbum: coverArt(albumName, artistName), releaseDate,
  musicName: null, posterMusica: null, musicPreview: null,
});

const reply = (id, parentId, autorId, texto, minutes) => ({
  id, parentId, autorId, texto, nota: null, createdAt: minutesAgo(minutes), postType: null,
  musicName: null, artistName: null, posterMusica: null, releaseDate: null, musicPreview: null, albumName: null, posterAlbum: null,
});

export function createSeed() {
  return {
    seq: { usuarios: 4, posts: 14, notificacoes: 3 },
    session: null,
    usuarios: [
      user(1, 'ana.souza', DEMO_LOGIN.email, 'MPB de manhã, rock à noite'),
      user(2, 'bruno.lima', 'bruno@demo.com', 'Colecionador de vinil'),
      user(3, 'carla.mendes', 'carla@demo.com', 'Toco baixo numa banda de garagem'),
      user(4, 'diego.rocha', 'diego@demo.com', null),
    ],
    posts: [
      musicPost(1, 2, 'Help!', 'Até hoje não entendo como fizeram isso em 1965.', 10, 35),
      albumPost(2, 3, 'Clube da Esquina', 'Milton Nascimento & Lô Borges', '1972-03-01', 'Disco perfeito do começo ao fim.', 10, 180),
      musicPost(3, 4, 'Blinding Lights', 'Viciado nesse synth.', 8, 300),
      musicPost(4, 1, 'Águas de Março', 'Trilha sonora oficial de dia de chuva.', 9, 600),
      musicPost(5, 3, 'Bohemian Rhapsody', 'Quem nunca cantou junto?', 9, 1500),
      albumPost(6, 2, 'Abbey Road', 'The Beatles', '1969-09-26', 'O lado B é uma obra-prima.', 10, 2900),
      musicPost(7, 4, 'Tempo Perdido', 'Clássico absoluto do rock nacional.', 7, 4300),
      musicPost(8, 1, 'Velha Infância', 'Música que abraça.', 7, 8000),
      // Comentários são posts com pai; podem ter música ou não.
      reply(9, 1, 1, 'Concordo demais!', 30),
      reply(10, 1, 3, 'A versão ao vivo também é ótima.', 29),
      { ...musicPost(11, 4, 'Come Together', 'Se curtiu essa, ouve essa também.', 9, 28), parentId: 1 },
      reply(12, 4, 2, 'Elis e Tom juntos, não tem como errar.', 25),
      reply(13, 2, 4, 'Preciso ouvir esse inteiro.', 170),
      reply(14, 10, 1, 'Qual versão? A do Shea Stadium?', 20),
    ],
    curtidas: [
      { postId: 1, usuarioId: 1 }, { postId: 1, usuarioId: 3 }, { postId: 2, usuarioId: 2 }, { postId: 4, usuarioId: 2 },
      { postId: 4, usuarioId: 3 }, { postId: 5, usuarioId: 1 }, { postId: 6, usuarioId: 4 }, { postId: 8, usuarioId: 2 },
    ],
    seguimentos: [
      { seguidorId: 1, seguidoId: 2 }, { seguidorId: 1, seguidoId: 3 }, { seguidorId: 2, seguidoId: 1 },
      { seguidorId: 3, seguidoId: 1 }, { seguidorId: 4, seguidoId: 1 }, { seguidorId: 2, seguidoId: 3 },
    ],
    notificacoes: [
      { id: 1, destinatarioId: 1, autorId: 4, tipo: 'new_follower', conteudo: 'seguiu você', lida: true, postId: null, createdAt: minutesAgo(3000) },
      { id: 2, destinatarioId: 1, autorId: 2, tipo: 'like', conteudo: 'curtiu seu post', lida: false, postId: 4, createdAt: minutesAgo(90) },
      { id: 3, destinatarioId: 1, autorId: 2, tipo: 'comment', conteudo: 'comentou no seu post', lida: false, postId: 4, createdAt: minutesAgo(25) },
    ],
  };
}
