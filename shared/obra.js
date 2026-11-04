// Um álbum ou música é identificado por tipo + título + artista, sem diferenciar maiúsculas
// (os posts não guardam o id do Deezer). Posts usam o tipo 'música'; a API usa 'musica'.
export const tipoDaObra = (tipo) => (tipo === 'album' ? 'album' : 'musica');

const limpo = (valor) => (typeof valor === 'string' ? valor.trim().toLowerCase() : '');

export const chaveObra = ({ tipo, titulo, artista }) => `${tipoDaObra(tipo)}|${limpo(titulo)}|${limpo(artista)}`;
