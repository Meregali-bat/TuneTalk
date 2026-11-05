import { describe, it, expect, vi } from 'vitest';
import { TEXTO_AVISO_DE_NATAL, avisoDeNatalLiberado, enviarAvisoDeNatal } from '../../src/services/avisoDeNatalService.js';

describe('aviso de Natal', () => {
  describe('quando pode sair', () => {
    const novembro = new Date('2026-11-20T12:00:00Z');
    const dezembro = new Date('2026-12-20T12:00:00Z');

    it('site de teste (Preview): sempre', () => {
      expect(avisoDeNatalLiberado({ VERCEL_ENV: 'preview' }, novembro)).toBe(true);
    });

    it('site de verdade: só em dezembro', () => {
      expect(avisoDeNatalLiberado({ VERCEL_ENV: 'production' }, novembro)).toBe(false);
      expect(avisoDeNatalLiberado({ VERCEL_ENV: 'production' }, dezembro)).toBe(true);
      expect(avisoDeNatalLiberado({ VERCEL_ENV: 'production' }, new Date('2027-01-02T12:00:00Z'))).toBe(false);
    });

    it('no computador: só com AVISO_DE_NATAL=sim', () => {
      expect(avisoDeNatalLiberado({}, dezembro)).toBe(false);
      expect(avisoDeNatalLiberado({ AVISO_DE_NATAL: 'sim' }, novembro)).toBe(true);
    });
  });

  it('manda para quem ainda não recebeu neste ano, como aviso do TuneTalk', async () => {
    const users = { listIdsComNome: vi.fn().mockResolvedValue([1, 2, 3]) };
    const notifications = {
      existsDesde: vi.fn(async (id) => id === 2),
      create: vi.fn(),
    };
    const agora = new Date('2026-12-20T12:00:00Z');

    expect(await enviarAvisoDeNatal({ users, notifications, agora })).toBe(2);
    expect(notifications.existsDesde).toHaveBeenCalledWith(1, 'natal', new Date('2026-01-01T00:00:00Z'));
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith({ destinatarioId: 1, autorId: 1, tipo: 'natal', conteudo: TEXTO_AVISO_DE_NATAL });
    expect(notifications.create).not.toHaveBeenCalledWith(expect.objectContaining({ destinatarioId: 2 }));
  });
});
