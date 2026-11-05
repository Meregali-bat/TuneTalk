import { extractHashtags } from './mentions.js';

// Hashtags especiais: aparecem com um emoji do lado e mudam o like dos posts que as usam.
// tema: animação do like (ver LikeButton) e presentes (ex.: a toca de Natal). Para criar outra,
// é só acrescentar aqui.
const HASHFLAGS = {
  xmas: { emoji: '🎄', tema: 'natal' },
  natal: { emoji: '🎄', tema: 'natal' },
  christmas: { emoji: '🎄', tema: 'natal' },
};

export const hashflag = (tag) => HASHFLAGS[String(tag ?? '').toLowerCase()] ?? null;

// Tema do post pela primeira hashtag especial do texto (ou null).
export const temaDoTexto = (texto) => extractHashtags(texto ?? '').map(hashflag).find(Boolean)?.tema ?? null;
