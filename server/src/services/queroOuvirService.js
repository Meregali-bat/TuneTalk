import { badRequest } from '../errors.js';
import { capaDoDeezer } from '../../../shared/favorites.js';
import { chaveObra } from '../../../shared/obra.js';

const TEXTO_MAX = 255;
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// capaValida: no app real, só imagens (e prévias) do Deezer; a demo troca pelas capas desenhadas dela.
export function createQueroOuvirService({ queroOuvir, capaValida = capaDoDeezer }) {
  const lerObra = (corpo = {}) => {
    const obra = { tipo: corpo.tipo, titulo: texto(corpo.titulo), artista: texto(corpo.artista) };
    if (!['album', 'musica'].includes(obra.tipo) || !obra.titulo || !obra.artista
      || obra.titulo.length > TEXTO_MAX || obra.artista.length > TEXTO_MAX) {
      throw badRequest('Álbum ou música inválido.');
    }
    return obra;
  };

  return {
    listar(usuarioId) {
      return queroOuvir.listar(usuarioId);
    },

    async adicionar(usuarioId, corpo) {
      const obra = lerObra(corpo);
      const capa = corpo.capa && capaValida(corpo.capa) ? corpo.capa : null;
      const preview = obra.tipo === 'musica' && corpo.preview && capaValida(corpo.preview) ? corpo.preview : null;
      const releaseDate = corpo.releaseDate == null ? null : String(corpo.releaseDate).slice(0, 20);
      return queroOuvir.adicionar(usuarioId, { ...obra, capa, preview, releaseDate, chave: chaveObra(obra) });
    },

    async remover(usuarioId, corpo) {
      await queroOuvir.remover(usuarioId, chaveObra(lerObra(corpo)));
    },
  };
}
