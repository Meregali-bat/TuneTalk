import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPushService, withPush } from '../../src/services/pushService.js';

const vapid = { publicKey: 'pub', privateKey: 'priv', subject: 'mailto:x@y.z' };
const aparelho = { endpoint: 'https://push.example/abc', p256dh: 'p', auth: 'a' };

describe('pushService', () => {
  let subscriptions;
  let webpush;
  const logger = { warn: vi.fn() };

  beforeEach(() => {
    subscriptions = { save: vi.fn(), remove: vi.fn(), removeEndpoint: vi.fn(), listByUser: vi.fn().mockResolvedValue([aparelho]) };
    webpush = { setVapidDetails: vi.fn(), sendNotification: vi.fn().mockResolvedValue({}) };
  });

  it('sem chaves configuradas fica desligado: sem chave pública e sem envio', async () => {
    const push = createPushService({ subscriptions, webpush, vapid: {}, logger });
    expect(push.chavePublica()).toBeNull();
    await push.enviar(1, { titulo: 'x' });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('inscreve o aparelho validando endpoint https e chaves', async () => {
    const push = createPushService({ subscriptions, webpush, vapid, logger });
    expect(push.chavePublica()).toBe('pub');
    expect(webpush.setVapidDetails).toHaveBeenCalledWith('mailto:x@y.z', 'pub', 'priv');

    await push.inscrever(7, { endpoint: aparelho.endpoint, keys: { p256dh: 'p', auth: 'a' } });
    expect(subscriptions.save).toHaveBeenCalledWith(7, aparelho);

    for (const ruim of [null, {}, { endpoint: 'http://x', keys: { p256dh: 'p', auth: 'a' } }, { endpoint: aparelho.endpoint, keys: {} }]) {
      await expect(push.inscrever(7, ruim)).rejects.toMatchObject({ status: 400 });
    }
  });

  it('envia para todos os aparelhos da pessoa e apaga os que não existem mais', async () => {
    const outro = { ...aparelho, endpoint: 'https://push.example/velho' };
    subscriptions.listByUser.mockResolvedValue([aparelho, outro]);
    webpush.sendNotification.mockResolvedValueOnce({}).mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));
    const push = createPushService({ subscriptions, webpush, vapid, logger });

    await push.enviar(7, { titulo: 'TuneTalk', texto: 'oi', url: '/post/1', naoLidas: 2 });

    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    const [destino, payload] = webpush.sendNotification.mock.calls[0];
    expect(destino).toEqual({ endpoint: aparelho.endpoint, keys: { p256dh: 'p', auth: 'a' } });
    expect(JSON.parse(payload)).toEqual({ titulo: 'TuneTalk', texto: 'oi', url: '/post/1', naoLidas: 2 });
    expect(subscriptions.removeEndpoint).toHaveBeenCalledWith('https://push.example/velho');
  });

  it('falha no envio não quebra nada', async () => {
    webpush.sendNotification.mockRejectedValue(Object.assign(new Error('timeout'), { statusCode: 500 }));
    subscriptions.listByUser.mockRejectedValueOnce(new Error('db'));
    const push = createPushService({ subscriptions, webpush, vapid, logger });
    await expect(push.enviar(7, {})).resolves.toBeUndefined();
    await expect(push.enviar(7, {})).resolves.toBeUndefined();
    expect(subscriptions.removeEndpoint).not.toHaveBeenCalled();
  });
});

describe('withPush (toda notificação vira aviso)', () => {
  it('grava a notificação e manda o aviso com nome, texto, link e não lidas', async () => {
    const notifications = { create: vi.fn(), countUnread: vi.fn().mockResolvedValue(3), listForUser: vi.fn() };
    const push = { enviar: vi.fn() };
    const users = { findById: vi.fn().mockResolvedValue({ id: 2, nome: 'bia', nomeExibicao: 'Bia Souza' }) };
    const comPush = withPush(notifications, { push, users });

    await comPush.create({ destinatarioId: 1, autorId: 2, tipo: 'like', conteudo: 'curtiu seu post', postId: 10 });
    expect(notifications.create).toHaveBeenCalled();
    expect(push.enviar).toHaveBeenCalledWith(1, { titulo: 'TuneTalk', texto: 'Bia Souza curtiu seu post', url: '/post/10', naoLidas: 3 });

    await comPush.create({ destinatarioId: 1, autorId: 2, tipo: 'new_follower', conteudo: 'seguiu você' });
    expect(push.enviar).toHaveBeenLastCalledWith(1, expect.objectContaining({ url: '/perfil/2' }));
    expect(comPush.listForUser).toBe(notifications.listForUser);
  });

  it('aviso do próprio TuneTalk vai sem o nome da pessoa na frente', async () => {
    const notifications = { create: vi.fn(), countUnread: vi.fn().mockResolvedValue(1) };
    const push = { enviar: vi.fn() };
    const users = { findById: vi.fn().mockResolvedValue({ id: 7, nome: 'ana' }) };
    const comPush = withPush(notifications, { push, users });

    await comPush.create({ destinatarioId: 7, autorId: 7, tipo: 'marco_posts', conteudo: 'Parabéns pelo seu 100º post!', postId: 42 });
    expect(push.enviar).toHaveBeenCalledWith(7, { titulo: 'TuneTalk', texto: 'Parabéns pelo seu 100º post!', url: '/post/42', naoLidas: 1 });
  });

  it('se o aviso falhar, a notificação continua gravada e nada quebra', async () => {
    const notifications = { create: vi.fn(), countUnread: vi.fn().mockRejectedValue(new Error('x')) };
    const comPush = withPush(notifications, { push: { enviar: vi.fn() }, users: { findById: vi.fn() } });
    await expect(comPush.create({ destinatarioId: 1, autorId: 2, conteudo: 'oi' })).resolves.toBeUndefined();
    expect(notifications.create).toHaveBeenCalled();
  });
});
