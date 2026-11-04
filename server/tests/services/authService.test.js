import { describe, it, expect, vi, beforeEach } from 'vitest';
import md5 from 'md5';
import { createAuthService } from '../../src/services/authService.js';
import { createPasswords } from '../../src/security/passwords.js';

const passwords = createPasswords({ rounds: 4 });

describe('authService', () => {
  let users;
  let notifications;
  let auth;
  let ana;

  beforeEach(async () => {
    ana = { id: 1, nome: 'Ana', email: 'ana@x.com', senha: await passwords.hash('Senha!1') };
    users = {
      findAuthByEmail: vi.fn().mockResolvedValue(ana),
      updatePassword: vi.fn(),
      existsByEmail: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(1),
    };
    notifications = { create: vi.fn() };
    auth = createAuthService({ users, passwords, notifications });
  });

  describe('login', () => {
    it('devolve o usuário da sessão (sem a senha) quando as credenciais batem', async () => {
      expect(await auth.login('ana@x.com', 'Senha!1')).toEqual({ id: 1, nome: 'Ana', email: 'ana@x.com', fotoPerfil: null });
      expect(users.updatePassword).not.toHaveBeenCalled();
    });

    it('rejeita senha errada ou email inexistente com a mesma mensagem (401)', async () => {
      await expect(auth.login('ana@x.com', 'errada')).rejects.toMatchObject({ status: 401, message: 'Email ou senha incorretos.' });
      users.findAuthByEmail.mockResolvedValue(null);
      await expect(auth.login('nada@x.com', 'Senha!1')).rejects.toMatchObject({ status: 401, message: 'Email ou senha incorretos.' });
    });

    it('senha antiga em md5: entra e já regrava a senha em bcrypt', async () => {
      users.findAuthByEmail.mockResolvedValue({ ...ana, senha: md5('Senha!1') });

      await auth.login('ana@x.com', 'Senha!1');

      const [id, novoHash] = users.updatePassword.mock.calls[0];
      expect(id).toBe(1);
      expect(await passwords.verify('Senha!1', novoHash)).toEqual({ ok: true, needsRehash: false });
    });

    describe('selo de fundador', () => {
      it('conta do TuneTalk antigo ganha o selo no primeiro login depois da mudança', async () => {
        users.activateFounder = vi.fn();
        users.findAuthByEmail.mockResolvedValue({ ...ana, veterano: true, fundadorDesde: null });
        await auth.login('ana@x.com', 'Senha!1');
        expect(users.activateFounder).toHaveBeenCalledWith(1);
        expect(notifications.create).toHaveBeenCalledWith({
          destinatarioId: 1,
          autorId: 1,
          tipo: 'selo_fundador',
          conteudo: 'Você ganhou o selo de fundador por estar no TuneTalk desde o início! Dá para escondê-lo em Editar perfil.',
        });
      });

      it('não reativa quem já tem, nem dá para contas novas', async () => {
        users.activateFounder = vi.fn();
        users.findAuthByEmail.mockResolvedValue({ ...ana, veterano: true, fundadorDesde: new Date() });
        await auth.login('ana@x.com', 'Senha!1');
        users.findAuthByEmail.mockResolvedValue({ ...ana, veterano: false, fundadorDesde: null });
        await auth.login('ana@x.com', 'Senha!1');
        expect(users.activateFounder).not.toHaveBeenCalled();
        expect(notifications.create).not.toHaveBeenCalled();
      });

      it('senha errada não ativa nada', async () => {
        users.activateFounder = vi.fn();
        users.findAuthByEmail.mockResolvedValue({ ...ana, veterano: true, fundadorDesde: null });
        await expect(auth.login('ana@x.com', 'errada')).rejects.toMatchObject({ status: 401 });
        expect(users.activateFounder).not.toHaveBeenCalled();
      });
    });

    it('ignora espaços em volta do email', async () => {
      await auth.login('  ana@x.com ', 'Senha!1');
      expect(users.findAuthByEmail).toHaveBeenCalledWith('ana@x.com');
    });

    it('rejeita email ou senha vazios com 400 sem consultar o banco', async () => {
      await expect(auth.login('', 'x')).rejects.toMatchObject({ status: 400 });
      await expect(auth.login('a@a.com', '')).rejects.toMatchObject({ status: 400 });
      expect(users.findAuthByEmail).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const valid = { email: 'ana@x.com', senha: 'Senha!1', fotoPerfil: 'f.png' };

    it('cria a conta só com email e senha (guardada em bcrypt); o nome de usuário vem depois', async () => {
      expect(await auth.register(valid)).toEqual({ id: 1, nome: null, email: 'ana@x.com', fotoPerfil: 'f.png' });
      const { senhaHash, ...resto } = users.create.mock.calls[0][0];
      expect(resto).toEqual({ email: 'ana@x.com', fotoPerfil: 'f.png' });
      expect(senhaHash).not.toContain('Senha!1');
      expect(await passwords.verify('Senha!1', senhaHash)).toMatchObject({ ok: true });
    });

    it('normaliza o email (espaços e maiúsculas)', async () => {
      await auth.register({ ...valid, email: '  Ana@X.com ' });
      expect(users.existsByEmail).toHaveBeenCalledWith('ana@x.com');
      expect(users.create.mock.calls[0][0].email).toBe('ana@x.com');
    });

    it('exige email e senha', async () => {
      await expect(auth.register({ ...valid, email: '' })).rejects.toMatchObject({ status: 400 });
      await expect(auth.register({ ...valid, senha: '' })).rejects.toMatchObject({ status: 400 });
      expect(users.create).not.toHaveBeenCalled();
    });

    it('rejeita email em formato inválido', async () => {
      await expect(auth.register({ ...valid, email: 'ana@' })).rejects.toMatchObject({
        status: 400,
        message: 'Informe um email válido.',
      });
    });

    it('valida as regras de senha', async () => {
      await expect(auth.register({ ...valid, senha: 'fraca' })).rejects.toMatchObject({
        status: 400,
        message: 'A senha deve conter pelo menos um símbolo, mais de 6 caracteres e uma letra maiúscula.',
      });
    });

    it('rejeita email já cadastrado com 409', async () => {
      users.existsByEmail.mockResolvedValue(true);
      await expect(auth.register(valid)).rejects.toMatchObject({
        status: 409,
        message: 'Já existe uma conta com esse email.',
      });
      expect(users.create).not.toHaveBeenCalled();
    });
  });
});
