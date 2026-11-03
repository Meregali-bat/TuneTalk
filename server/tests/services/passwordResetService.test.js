import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { createPasswordResetService } from '../../src/services/passwordResetService.js';
import { createPasswords } from '../../src/security/passwords.js';

const passwords = createPasswords({ rounds: 4 });
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const agora = new Date('2026-11-03T12:00:00Z');

describe('passwordResetService', () => {
  let users;
  let resets;
  let mailer;
  let sessions;
  let log;
  let service;

  beforeEach(() => {
    users = {
      findAuthByEmail: vi.fn().mockResolvedValue({ id: 7, nome: 'ana<b>', email: 'Ana@X.com', senha: 'x' }),
      updatePassword: vi.fn(),
    };
    resets = {
      create: vi.fn(),
      countSince: vi.fn().mockResolvedValue(0),
      findValid: vi.fn().mockResolvedValue({ id: 3, usuarioId: 7 }),
      claim: vi.fn().mockResolvedValue(true),
      deleteForUser: vi.fn(),
    };
    mailer = { send: vi.fn() };
    sessions = { destroyAll: vi.fn() };
    log = vi.fn();
    service = createPasswordResetService({
      users, resets, passwords, mailer, sessions, log,
      appUrl: 'https://tunetalk.app', now: () => agora, randomToken: () => 'codigo-secreto',
    });
  });

  describe('request (pedir o link)', () => {
    it('guarda só o hash do código, válido por 1 hora, e manda o link por email', async () => {
      await service.request('  ana@x.com ');

      expect(users.findAuthByEmail).toHaveBeenCalledWith('ana@x.com');
      expect(resets.create).toHaveBeenCalledWith({
        usuarioId: 7, tokenHash: sha256('codigo-secreto'), expiraEm: new Date('2026-11-03T13:00:00Z'),
      });
      const email = mailer.send.mock.calls[0][0];
      expect(email.to).toBe('Ana@X.com');
      expect(email.subject).toBe('Redefinir sua senha do TuneTalk');
      expect(email.text).toContain('https://tunetalk.app/redefinir-senha#token=codigo-secreto');
      expect(email.html).toContain('href="https://tunetalk.app/redefinir-senha#token=codigo-secreto"');
      expect(email.html).toContain('ana&lt;b&gt;');
      expect(email.text).toContain('1 hora');
    });

    it('email que não existe: não faz nada e não dá erro (não revela quem tem conta)', async () => {
      users.findAuthByEmail.mockResolvedValue(null);
      await expect(service.request('nada@x.com')).resolves.toBeUndefined();
      expect(resets.create).not.toHaveBeenCalled();
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('limita a 3 pedidos por hora para a mesma conta', async () => {
      resets.countSince.mockResolvedValue(3);
      await service.request('ana@x.com');
      expect(resets.countSince).toHaveBeenCalledWith(7, new Date('2026-11-03T11:00:00Z'));
      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('se o envio falhar, registra no log sem revelar nada para quem pediu', async () => {
      mailer.send.mockRejectedValue(new Error('Resend 403: domínio não verificado'));
      await expect(service.request('ana@x.com')).resolves.toBeUndefined();
      expect(log.mock.calls[0][0]).toMatch(/Resend 403/);
    });

    it('ignora email vazio', async () => {
      await service.request('   ');
      expect(users.findAuthByEmail).not.toHaveBeenCalled();
    });
  });

  describe('reset (usar o link)', () => {
    it('confere o código, grava a nova senha em bcrypt, invalida os links e desconecta todos os aparelhos', async () => {
      await service.reset('codigo-secreto', 'Nova!123');

      expect(resets.findValid).toHaveBeenCalledWith(sha256('codigo-secreto'), agora);
      expect(resets.claim).toHaveBeenCalledWith(3, agora);
      const [id, hash] = users.updatePassword.mock.calls[0];
      expect(id).toBe(7);
      expect(await passwords.verify('Nova!123', hash)).toMatchObject({ ok: true });
      expect(resets.deleteForUser).toHaveBeenCalledWith(7);
      expect(sessions.destroyAll).toHaveBeenCalledWith(7);
    });

    it('link inválido, expirado ou já usado: 400 e nada muda', async () => {
      const invalido = { status: 400, message: 'Este link é inválido ou já expirou. Peça um novo.' };
      resets.findValid.mockResolvedValue(null);
      await expect(service.reset('qualquer', 'Nova!123')).rejects.toMatchObject(invalido);

      resets.findValid.mockResolvedValue({ id: 3, usuarioId: 7 });
      resets.claim.mockResolvedValue(false);
      await expect(service.reset('codigo-secreto', 'Nova!123')).rejects.toMatchObject(invalido);

      await expect(service.reset('', 'Nova!123')).rejects.toMatchObject(invalido);
      expect(users.updatePassword).not.toHaveBeenCalled();
    });

    it('aplica as regras de senha antes de gastar o link', async () => {
      await expect(service.reset('codigo-secreto', 'fraca')).rejects.toMatchObject({
        status: 400,
        message: 'A senha deve conter pelo menos um símbolo, mais de 6 caracteres e uma letra maiúscula.',
      });
      expect(resets.claim).not.toHaveBeenCalled();
    });
  });
});
