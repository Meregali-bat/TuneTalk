import { splitMentions } from '../../../shared/mentions.js';

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
const AMOSTRA = 1000;

// Conta em quantos posts cada hashtag aparece (repetida no mesmo post conta uma vez) e mostra
// a grafia mais usada (ex.: #GUTS); no empate, a do post mais recente (os textos vêm dos mais novos).
function rank(textos) {
  const contagem = new Map();
  for (const texto of textos) {
    const tags = splitMentions(texto).filter((p) => p.tipo === 'hashtag').map((p) => p.valor);
    const doPost = new Map(tags.map((tag) => [tag.toLowerCase(), tag]));
    for (const [chave, forma] of doPost) {
      const item = contagem.get(chave) ?? { chave, posts: 0, formas: new Map() };
      item.posts += 1;
      item.formas.set(forma, (item.formas.get(forma) ?? 0) + 1);
      contagem.set(chave, item);
    }
  }
  return [...contagem.values()]
    .map(({ chave, posts, formas }) => ({
      chave,
      tag: [...formas].sort((a, b) => b[1] - a[1])[0][0],
      posts,
    }))
    .sort((a, b) => b.posts - a.posts || a.chave.localeCompare(b.chave));
}

const semChave = ({ tag, posts }) => ({ tag, posts });

export function createHashtagService({ posts, now = () => new Date() }) {
  return {
    // "Em alta": as mais usadas nos últimos 7 dias; sem nenhuma, as mais usadas de sempre.
    async trending() {
      const desde = new Date(now().getTime() - SETE_DIAS);
      let ranking = rank(await posts.listHashtagTexts({ desde, limite: AMOSTRA }));
      if (ranking.length === 0) ranking = rank(await posts.listHashtagTexts({ limite: AMOSTRA }));
      return ranking.slice(0, 10).map(semChave);
    },

    async search(texto) {
      const limpo = (texto ?? '').trim().replace(/^#/, '').trim().toLowerCase();
      if (!limpo) return [];
      return rank(await posts.listHashtagTexts({ contem: limpo, limite: AMOSTRA }))
        .filter((item) => item.chave.startsWith(limpo))
        .slice(0, 20)
        .map(semChave);
    },
  };
}
