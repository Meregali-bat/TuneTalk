import { badRequest } from '../errors.js';

const ENDPOINT_MAX = 1000;
const CHAVE_MAX = 255;
const TEMPO_LIMITE_MS = 4000;

/**
 * Avisos no celular (push da web). Sem as chaves VAPID configuradas, fica desligado:
 * a chave pública volta null e nada é enviado.
 * Falhas no envio nunca atrapalham a ação que gerou o aviso (curtir, comentar...).
 */
export function createPushService({ subscriptions, webpush, vapid, logger = console }) {
  const ligado = Boolean(vapid?.publicKey && vapid?.privateKey);
  if (ligado) webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  return {
    chavePublica: () => (ligado ? vapid.publicKey : null),

    async inscrever(usuarioId, corpo) {
      const endpoint = corpo?.endpoint;
      const p256dh = corpo?.keys?.p256dh;
      const auth = corpo?.keys?.auth;
      const valido = typeof endpoint === 'string' && endpoint.startsWith('https://') && endpoint.length <= ENDPOINT_MAX
        && typeof p256dh === 'string' && p256dh && p256dh.length <= CHAVE_MAX
        && typeof auth === 'string' && auth && auth.length <= CHAVE_MAX;
      if (!valido) throw badRequest('Inscrição de aviso inválida.');
      await subscriptions.save(usuarioId, { endpoint, p256dh, auth });
    },

    async cancelar(usuarioId, endpoint) {
      if (typeof endpoint !== 'string' || !endpoint) throw badRequest('Aparelho inválido.');
      await subscriptions.remove(usuarioId, endpoint);
    },

    // aviso: { titulo, texto, url, naoLidas }
    async enviar(usuarioId, aviso) {
      if (!ligado) return;
      try {
        const aparelhos = await subscriptions.listByUser(usuarioId);
        const payload = JSON.stringify(aviso);
        await Promise.all(aparelhos.map(async ({ endpoint, p256dh, auth }) => {
          try {
            await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload, { TTL: 60 * 60 * 24, timeout: TEMPO_LIMITE_MS });
          } catch (err) {
            // 404/410: o aparelho cancelou ou o navegador descartou a inscrição.
            if (err?.statusCode === 404 || err?.statusCode === 410) await subscriptions.removeEndpoint(endpoint);
            else logger.warn?.(`Aviso não enviado (${err?.statusCode ?? err?.message})`);
          }
        }));
      } catch (err) {
        logger.warn?.(`Avisos indisponíveis: ${err?.message}`);
      }
    },
  };
}

/**
 * Embrulha o repositório de notificações: ao criar uma notificação, manda também o aviso
 * para os aparelhos da pessoa. O resto (listar, contar, marcar como lida) passa direto.
 */
export function withPush(notifications, { push, users }) {
  return {
    ...notifications,
    async create(notificacao) {
      await notifications.create(notificacao);
      try {
        const [autor, naoLidas] = await Promise.all([
          users.findById(notificacao.autorId),
          notifications.countUnread(notificacao.destinatarioId),
        ]);
        const nome = autor?.nomeExibicao || autor?.nome || 'TuneTalk';
        await push.enviar(notificacao.destinatarioId, {
          titulo: 'TuneTalk',
          texto: `${nome} ${notificacao.conteudo}`,
          url: notificacao.postId ? `/post/${notificacao.postId}` : `/perfil/${notificacao.autorId}`,
          naoLidas,
        });
      } catch {
        // O aviso é um extra: a notificação já foi gravada.
      }
    },
  };
}
