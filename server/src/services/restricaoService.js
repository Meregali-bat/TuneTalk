import { badRequest, notFound } from '../errors.js';

// Sem nenhum bloqueio nem silêncio (testes antigos e quem não precisa disso).
export const SEM_RESTRICOES = {
  async ocultosPara() { return []; },
  async relacao() { return { bloqueado: false, meBloqueou: false, silenciado: false }; },
};

/** Bloqueio em qualquer sentido entre duas pessoas. */
export async function haBloqueio(restricoes, a, b) {
  if (a === b) return false;
  const { bloqueado, meBloqueou } = await restricoes.relacao(a, b);
  return bloqueado || meBloqueou;
}

/**
 * Embrulha o repositório de notificações: quem silenciou ou bloqueou alguém (ou foi bloqueado)
 * não recebe notificações dessa pessoa. Avisos do próprio TuneTalk (autor = destinatário) passam.
 */
export function semNotificacaoDeOcultos(notifications, restricoes) {
  return {
    ...notifications,
    async create(notificacao) {
      const { autorId, destinatarioId } = notificacao;
      if (autorId !== destinatarioId && (await restricoes.ocultosPara(destinatarioId)).includes(autorId)) return;
      await notifications.create(notificacao);
    },
  };
}

export function createRestricaoService({ restricoes, users }) {
  const alvoValido = async (usuarioId, alvoId) => {
    if (usuarioId === alvoId) throw badRequest('Você não pode fazer isso com você mesmo.');
    if (!(await users.findById(alvoId))) throw notFound('Usuário não encontrado.');
  };

  return {
    async bloquear(usuarioId, alvoId) {
      await alvoValido(usuarioId, alvoId);
      await restricoes.bloquear(usuarioId, alvoId);
    },
    async desbloquear(usuarioId, alvoId) {
      await restricoes.desbloquear(usuarioId, alvoId);
    },
    async silenciar(usuarioId, alvoId) {
      await alvoValido(usuarioId, alvoId);
      await restricoes.silenciar(usuarioId, alvoId);
    },
    async dessilenciar(usuarioId, alvoId) {
      await restricoes.dessilenciar(usuarioId, alvoId);
    },
    listar(usuarioId) {
      return restricoes.listar(usuarioId);
    },
  };
}
