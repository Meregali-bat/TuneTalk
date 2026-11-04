import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRestricaoService, haBloqueio, semNotificacaoDeOcultos } from '../../src/services/restricaoService.js';

describe('restricaoService', () => {
  let restricoes;
  let users;
  let service;

  beforeEach(() => {
    restricoes = {
      bloquear: vi.fn(), desbloquear: vi.fn(), silenciar: vi.fn(), dessilenciar: vi.fn(),
      listar: vi.fn().mockResolvedValue({ bloqueados: [], silenciados: [] }),
      ocultosPara: vi.fn().mockResolvedValue([]),
      relacao: vi.fn(),
    };
    users = { findById: vi.fn().mockResolvedValue({ id: 2 }) };
    service = createRestricaoService({ restricoes, users });
  });

  it('bloqueia e silencia quem existe; não deixa fazer consigo mesmo', async () => {
    await service.bloquear(1, 2);
    await service.silenciar(1, 2);
    expect(restricoes.bloquear).toHaveBeenCalledWith(1, 2);
    expect(restricoes.silenciar).toHaveBeenCalledWith(1, 2);

    await expect(service.bloquear(1, 1)).rejects.toMatchObject({ status: 400 });
    users.findById.mockResolvedValue(null);
    await expect(service.silenciar(1, 99)).rejects.toMatchObject({ status: 404 });
  });

  it('desfazer e listar', async () => {
    await service.desbloquear(1, 2);
    await service.dessilenciar(1, 2);
    expect(restricoes.desbloquear).toHaveBeenCalledWith(1, 2);
    expect(restricoes.dessilenciar).toHaveBeenCalledWith(1, 2);
    expect(await service.listar(1)).toEqual({ bloqueados: [], silenciados: [] });
  });

  it('haBloqueio vale nos dois sentidos, e nunca consigo mesmo', async () => {
    restricoes.relacao.mockResolvedValue({ bloqueado: false, meBloqueou: true, silenciado: false });
    expect(await haBloqueio(restricoes, 1, 2)).toBe(true);
    restricoes.relacao.mockResolvedValue({ bloqueado: false, meBloqueou: false, silenciado: true });
    expect(await haBloqueio(restricoes, 1, 2)).toBe(false);
    expect(await haBloqueio(restricoes, 1, 1)).toBe(false);
  });

  it('notificação de quem o destinatário não vê não é criada; avisos do TuneTalk passam', async () => {
    const notifications = { create: vi.fn(), listForUser: vi.fn() };
    restricoes.ocultosPara.mockResolvedValue([5]);
    const filtrada = semNotificacaoDeOcultos(notifications, restricoes);

    await filtrada.create({ destinatarioId: 1, autorId: 5, tipo: 'like', conteudo: 'curtiu seu post' });
    expect(notifications.create).not.toHaveBeenCalled();
    expect(restricoes.ocultosPara).toHaveBeenCalledWith(1);

    await filtrada.create({ destinatarioId: 1, autorId: 6, tipo: 'like', conteudo: 'curtiu seu post' });
    await filtrada.create({ destinatarioId: 1, autorId: 1, tipo: 'marco_posts', conteudo: 'Parabéns!' });
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(filtrada.listForUser).toBe(notifications.listForUser);
  });
});
