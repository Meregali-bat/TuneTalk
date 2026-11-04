import { badRequest, conflict, unauthorized } from '../errors.js';
import { PASSWORD_RULES_MESSAGE, isPasswordValid } from '../../../shared/passwordRules.js';

// A foto vai na sessão para o app mostrar quem está postando (ex.: ao lado do texto no compositor).
const toSessionUser = ({ id, nome, email, fotoPerfil = null }) => ({ id, nome, email, fotoPerfil });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createAuthService({ users, passwords, notifications }) {
  return {
    async login(email, senha) {
      const cleanEmail = (email ?? '').trim();
      if (!cleanEmail || !senha) throw badRequest('Preencha email e senha.');

      const user = await users.findAuthByEmail(cleanEmail);
      const { ok, needsRehash } = await passwords.verify(senha, user?.senha);
      if (!ok) throw unauthorized('Email ou senha incorretos.');
      // Senhas antigas (md5) passam para bcrypt no primeiro login depois da mudança.
      if (needsRehash) await users.updatePassword(user.id, await passwords.hash(senha));
      // Quem veio do TuneTalk antigo ganha o selo de fundador no primeiro login depois da mudança.
      if (user.veterano && !user.fundadorDesde) {
        await users.activateFounder(user.id);
        await notifications.create({
          destinatarioId: user.id,
          autorId: user.id,
          tipo: 'selo_fundador',
          conteudo: 'Você ganhou o selo de fundador por estar no TuneTalk desde o início! Dá para escondê-lo em Editar perfil.',
        });
      }

      return toSessionUser(user);
    },

    // A conta nasce só com email e senha; o nome de usuário é escolhido depois do primeiro login.
    async register({ email, senha, fotoPerfil }) {
      const cleanEmail = (email ?? '').trim().toLowerCase();
      if (!cleanEmail || !senha) throw badRequest('Preencha email e senha.');
      if (!EMAIL_PATTERN.test(cleanEmail)) throw badRequest('Informe um email válido.');
      if (!isPasswordValid(senha)) throw badRequest(PASSWORD_RULES_MESSAGE);
      if (await users.existsByEmail(cleanEmail)) throw conflict('Já existe uma conta com esse email.');

      const id = await users.create({ email: cleanEmail, senhaHash: await passwords.hash(senha), fotoPerfil });
      return toSessionUser({ id, nome: null, email: cleanEmail, fotoPerfil: fotoPerfil ?? null });
    },
  };
}
