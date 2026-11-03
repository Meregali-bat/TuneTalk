import { describe, it, expect } from 'vitest';
import { capaDoDeezer, lerFavoritos, validarFavoritos } from '../../../shared/favorites.js';

const capa = 'https://cdn-images.dzcdn.net/images/cover/abc/250x250-000000-80-0-0.jpg';
const musica = (id, extra) => ({ id, titulo: `Música ${id}`, artista: 'Artista', capa, ...extra });

describe('capaDoDeezer', () => {
  it('aceita só imagens https do Deezer', () => {
    expect(capaDoDeezer(capa)).toBe(true);
    expect(capaDoDeezer('https://e-cdns-images.dzcdn.net/images/artist/x/250x250.jpg')).toBe(true);
    expect(capaDoDeezer('http://cdn-images.dzcdn.net/x.jpg')).toBe(false);
    expect(capaDoDeezer('https://dzcdn.net.evil.com/x.jpg')).toBe(false);
    expect(capaDoDeezer('javascript:alert(1)')).toBe(false);
    expect(capaDoDeezer(null)).toBe(false);
    expect(capaDoDeezer(`https://cdn-images.dzcdn.net/${'a'.repeat(500)}.jpg`)).toBe(false);
  });
});

describe('validarFavoritos', () => {
  it('limpa, tira repetidos e guarda até 5 de cada tipo', () => {
    const { favoritos } = validarFavoritos({
      musicas: [musica(1, { titulo: '  Help!  ' }), musica(1), musica(2)],
      albuns: [{ id: 9, titulo: 'Abbey Road', artista: 'The Beatles', capa, extra: 'x' }],
      artistas: [{ id: 3, titulo: 'Olivia Rodrigo', artista: 'ignorado', capa }],
    });
    expect(favoritos).toEqual({
      musicas: [{ id: '1', titulo: 'Help!', artista: 'Artista', capa }, { id: '2', titulo: 'Música 2', artista: 'Artista', capa }],
      albuns: [{ id: '9', titulo: 'Abbey Road', artista: 'The Beatles', capa }],
      artistas: [{ id: '3', titulo: 'Olivia Rodrigo', capa }],
    });
  });

  it('tipos que faltam ficam vazios', () => {
    expect(validarFavoritos({}).favoritos).toEqual({ musicas: [], albuns: [], artistas: [] });
  });

  it('recusa mais de 5, formato errado, item sem título ou com imagem de fora', () => {
    expect(validarFavoritos({ musicas: [1, 2, 3, 4, 5, 6].map((i) => musica(i)) }).erro)
      .toBe('Escolha no máximo 5 favoritos de cada tipo.');
    expect(validarFavoritos(null).erro).toBe('Favoritos inválidos.');
    expect(validarFavoritos([]).erro).toBe('Favoritos inválidos.');
    expect(validarFavoritos({ musicas: 'x' }).erro).toBe('Favoritos inválidos.');
    expect(validarFavoritos({ musicas: [musica(1, { titulo: ' ' })] }).erro).toBe('Favorito inválido. Escolha de novo pela busca.');
    expect(validarFavoritos({ musicas: [musica(1, { capa: 'https://site.com/x.jpg' })] }).erro).toBeDefined();
    expect(validarFavoritos({ musicas: [musica(1, { id: { a: 1 } })] }).erro).toBeDefined();
    expect(validarFavoritos({ musicas: [null] }).erro).toBeDefined();
  });

  it('a demo pode aceitar outras capas', () => {
    const svg = 'data:image/svg+xml,x';
    expect(validarFavoritos({ musicas: [musica(1, { capa: svg })] }, { capaValida: () => true }).favoritos.musicas).toHaveLength(1);
  });
});

describe('lerFavoritos', () => {
  it('lê o guardado ignorando o que estiver estranho', () => {
    expect(lerFavoritos(null)).toEqual({ musicas: [], albuns: [], artistas: [] });
    expect(lerFavoritos({})).toEqual({ musicas: [], albuns: [], artistas: [] });
    expect(lerFavoritos({ musicas: [musica(1), 'lixo', { id: 2 }], albuns: 'x' }).musicas).toEqual([{ id: '1', titulo: 'Música 1', artista: 'Artista', capa }]);
    expect(lerFavoritos({ musicas: [1, 2, 3, 4, 5, 6, 7].map((i) => musica(i)) }).musicas).toHaveLength(5);
  });
});
