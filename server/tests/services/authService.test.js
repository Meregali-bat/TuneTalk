import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthService } from '../../src/services/authService.js';

const ana = { id: 1, nome: 'Ana', email: 'ana@x.com', fotoPerfil: 'f.png', bio: null };

describe('authService', () => {
  let users;
  let auth;

  beforeEach(() => {
    users = {
      findByCredentials: vi.fn(),
      existsByEmail: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue(1),
    };
    auth = createAuthService({ users });
  });

  describe('login', () => {
    it('devolve o usuário da sessão quando as credenciais batem', async () => {
      users.findByCredentials.mockResolvedValue(ana);
      expect(await auth.login('ana@x.com', 'Senha!1')).toEqual({ id: 1, nome: 'Ana', email: 'ana@x.com' });
    });

    it('rejeita credenciais incorretas com 401', async () => {
      users.findByCredentials.mockResolvedValue(null);
      await expect(auth.login('ana@x.com', 'errada')).rejects.toMatchObject({
        status: 401,
        message: 'Email ou senha incorretos.',
      });
    });

    it('ignora espaços em volta do email', async () => {
      users.findByCredentials.mockResolvedValue(ana);
      await auth.login('  ana@x.com ', 'Senha!1');
      expect(users.findByCredentials).toHaveBeenCalledWith('ana@x.com', 'Senha!1');
    });

    it('rejeita email ou senha vazios com 400 sem consultar o banco', async () => {
      await expect(auth.login('', 'x')).rejects.toMatchObject({ status: 400 });
      await expect(auth.login('a@a.com', '')).rejects.toMatchObject({ status: 400 });
      expect(users.findByCredentials).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const valid = { email: 'ana@x.com', senha: 'Senha!1', fotoPerfil: 'f.png' };

    it('cria a conta só com email e senha; o nome de usuário vem depois', async () => {
      expect(await auth.register(valid)).toEqual({ id: 1, nome: null, email: 'ana@x.com' });
      expect(users.create).toHaveBeenCalledWith(valid);
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
