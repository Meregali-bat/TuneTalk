// Aviso de Natal do TuneTalk: uma notificação (e aviso no celular) para cada pessoa com conta.
// Roda no deploy (scripts/aviso-de-natal.js), então sai quando a versão de Natal for publicada.

export const TEXTO_AVISO_DE_NATAL = 'Feliz Natal! 🎄 Poste com #xmas e curta os posts de Natal para ver a surpresa.';

/**
 * Quando o aviso pode sair:
 * - site de teste (Preview, banco de teste): sempre, para dar para ver como fica;
 * - site de verdade (Production): só em dezembro, para não sair antes da hora se a versão for
 *   publicada cedo (aí sai no primeiro deploy de dezembro);
 * - no computador: só pedindo, com AVISO_DE_NATAL=sim.
 */
export function avisoDeNatalLiberado(env, agora = new Date()) {
  if (env.VERCEL_ENV === 'preview') return true;
  if (env.VERCEL_ENV === 'production') return agora.getUTCMonth() === 11;
  return (env.AVISO_DE_NATAL ?? '').trim().toLowerCase() === 'sim';
}

// Uma vez por pessoa a cada ano: deploys repetidos não mandam de novo.
export async function enviarAvisoDeNatal({ users, notifications, agora = new Date() }) {
  const inicioDoAno = new Date(Date.UTC(agora.getUTCFullYear(), 0, 1));
  let enviados = 0;
  for (const id of await users.listIdsComNome()) {
    if (await notifications.existsDesde(id, 'natal', inicioDoAno)) continue;
    await notifications.create({ destinatarioId: id, autorId: id, tipo: 'natal', conteudo: TEXTO_AVISO_DE_NATAL });
    enviados += 1;
  }
  return enviados;
}
