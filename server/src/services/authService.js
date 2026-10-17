import { badRequest, conflict, unauthorized } from '../errors.js';
import { PASSWORD_RULES_MESSAGE, isPasswordValid } from '../../../shared/passwordRules.js';

const toSessionUser = ({ id, nome, email }) => ({ id, nome, email });

export function createAuthService({ users }) {
  return {
    async login(email, senha) {
      if (!email || !senha) throw badRequest('Preencha email e senha.');

      const user = await users.findByCredentials(email, senha);
      if (!user) throw unauthorized('Usuário ou senha incorretos.');

      return toSessionUser(user);
    },

    async register({ nome, email, senha, fotoPerfil }) {
      if (!nome || !email || !senha) throw badRequest('Preencha nome, email e senha.');
      if (!isPasswordValid(senha)) throw badRequest(PASSWORD_RULES_MESSAGE);
      if (await users.existsByNameOrEmail(nome, email)) {
        throw conflict('Já existe um usuário com o mesmo nome ou email');
      }

      const id = await users.create({ nome, email, senha, fotoPerfil });
      return toSessionUser({ id, nome, email });
    },
  };
}
