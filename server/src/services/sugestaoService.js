import { SEM_RESTRICOES } from './restricaoService.js';

export const SUGESTOES_MAX = 5;
const DIAS_ATIVOS = 60;

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Mais discos em comum e notas mais próximas (diferença média de 0 a 10) pesam mais.
const pontuar = ({ emComum, diferenca }) => emComum * (1 - diferenca / 10);

function motivo({ emComum, diferenca }) {
  const discos = plural(emComum, 'disco', 'discos');
  // Até uma estrela de diferença, em média: gosto parecido.
  return diferenca <= 2 ? `Notas parecidas com as suas em ${discos}` : `Avaliou ${discos} que você também avaliou`;
}

/**
 * Sugestões de quem seguir: primeiro quem deu notas parecidas aos mesmos discos; se faltar
 * gente (ex.: quem acabou de entrar e não avaliou nada), quem mais posta por aqui.
 * Nunca sugere a própria pessoa, quem ela já segue, nem quem ela silenciou ou bloqueou (ou a bloqueou).
 */
export function createSugestaoService({ sugestoes, follows, restricoes = SEM_RESTRICOES, now = () => new Date() }) {
  return {
    async listar(usuarioId) {
      const [seguindo, ocultos, parecidos] = await Promise.all([
        follows.followingIds(usuarioId),
        restricoes.ocultosPara(usuarioId),
        sugestoes.parecidos(usuarioId),
      ]);
      const fora = new Set([usuarioId, ...seguindo, ...ocultos]);

      const escolhidos = parecidos
        .filter((p) => !fora.has(p.autorId) && pontuar(p) > 0)
        .sort((a, b) => pontuar(b) - pontuar(a) || b.emComum - a.emComum)
        .map((p) => ({ autorId: p.autorId, motivo: motivo(p) }));

      // Completa com quem posta bastante: primeiro nos últimos dias, depois de sempre.
      const completar = (lista) => {
        for (const { autorId } of lista) {
          if (escolhidos.length >= SUGESTOES_MAX * 2) break;
          if (!fora.has(autorId) && !escolhidos.some((e) => e.autorId === autorId)) {
            escolhidos.push({ autorId, motivo: 'Posta bastante por aqui' });
          }
        }
      };
      const desde = new Date(now().getTime() - DIAS_ATIVOS * 24 * 60 * 60 * 1000);
      if (escolhidos.length < SUGESTOES_MAX) completar(await sugestoes.ativos({ desde, limite: SUGESTOES_MAX * 3 }));
      if (escolhidos.length < SUGESTOES_MAX) completar(await sugestoes.ativos({ limite: SUGESTOES_MAX * 3 }));

      // Pega alguns a mais porque contas sem nome de usuário não entram.
      const usuarios = new Map((await sugestoes.usuarios(escolhidos.map((e) => e.autorId))).map((u) => [u.id, u]));
      return escolhidos
        .filter((e) => usuarios.has(e.autorId))
        .slice(0, SUGESTOES_MAX)
        .map((e) => ({ usuario: usuarios.get(e.autorId), motivo: e.motivo }));
    },
  };
}
