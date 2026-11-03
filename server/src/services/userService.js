import { badRequest, conflict, notFound } from '../errors.js';
import { USERNAME_MESSAGES, checkUsername } from '../../../shared/usernameRules.js';
import { PASSWORD_RULES_MESSAGE, isPasswordValid } from '../../../shared/passwordRules.js';

export const BIO_MAX = 255;
export const NOME_EXIBICAO_MAX = 50;

// undefined mantém o atual; texto vazio apaga (o perfil volta a mostrar só o nome de usuário).
const cleanNomeExibicao = (valor, atual) => (valor === undefined ? atual : String(valor).trim() || null);

export function createUserService({ users, follows, postService, notifications, passwords }) {
  const findOrFail = async (id) => {
    const user = await users.findById(id);
    if (!user) throw notFound('Usuário não encontrado.');
    return user;
  };

  const assertUsernameAvailable = async (nome, usuarioId) => {
    const broken = Object.entries(checkUsername(nome)).find(([, ok]) => !ok);
    if (broken) throw badRequest(USERNAME_MESSAGES[broken[0]]);
    if (await users.isNameTaken(nome, usuarioId)) throw conflict('Esse nome de usuário já está em uso.');
  };

  return {
    async getProfile(profileId, viewerId) {
      const usuario = await findOrFail(profileId);
      const [posts, quantidadeSeguidores, quantidadeSeguindo, seguidores, seguindo, seguindoIds] =
        await Promise.all([
          postService.byAuthor(profileId, viewerId),
          follows.countFollowers(profileId),
          follows.countFollowing(profileId),
          follows.listFollowers(profileId),
          follows.listFollowing(profileId),
          follows.followingIds(viewerId),
        ]);

      return {
        usuario,
        posts,
        quantidadePosts: posts.length,
        quantidadeSeguidores,
        quantidadeSeguindo,
        seguidores,
        seguindo,
        seguindoIds,
      };
    },

    async setUsername(usuarioId, nome) {
      const clean = (nome ?? '').trim();
      await assertUsernameAvailable(clean, usuarioId);
      await users.update(usuarioId, { nome: clean });
      return { id: usuarioId, nome: clean };
    },

    async updateProfile(usuarioId, { nome, nomeExibicao, bio, fotoPerfil, bannerUrl, mostrarSeloFundador }) {
      const atual = await findOrFail(usuarioId);
      const changes = {
        nome: nome?.trim() || atual.nome,
        nomeExibicao: cleanNomeExibicao(nomeExibicao, atual.nomeExibicao),
        bio: bio ?? atual.bio,
        fotoPerfil: fotoPerfil || atual.fotoPerfil,
        bannerUrl: bannerUrl || atual.bannerUrl,
        mostrarSeloFundador: typeof mostrarSeloFundador === 'boolean' ? mostrarSeloFundador : atual.mostrarSeloFundador,
      };
      if ((changes.bio ?? '').length > BIO_MAX) throw badRequest(`A bio pode ter no máximo ${BIO_MAX} caracteres.`);
      if ((changes.nomeExibicao ?? '').length > NOME_EXIBICAO_MAX) {
        throw badRequest(`O nome pode ter no máximo ${NOME_EXIBICAO_MAX} caracteres.`);
      }
      // Nomes antigos fora das regras atuais continuam valendo enquanto não forem trocados.
      if (changes.nome !== atual.nome) await assertUsernameAvailable(changes.nome, usuarioId);
      await users.update(usuarioId, changes);
      return { ...atual, ...changes };
    },

    async search(texto, viewerId) {
      const limpo = (texto ?? '').trim().replace(/^@/, '').trim();
      if (!limpo) return [];
      const [achados, seguindoIds] = await Promise.all([users.search(limpo), follows.followingIds(viewerId)]);
      return achados.map((u) => ({ ...u, seguindo: seguindoIds.includes(u.id) }));
    },

    async changePassword(usuarioId, senhaAtual, novaSenha) {
      if (!senhaAtual || !novaSenha) throw badRequest('Preencha a senha atual e a nova.');
      if (!isPasswordValid(novaSenha)) throw badRequest(PASSWORD_RULES_MESSAGE);
      if (novaSenha === senhaAtual) throw badRequest('A nova senha precisa ser diferente da atual.');

      const auth = await users.findAuthById(usuarioId);
      if (!auth) throw notFound('Usuário não encontrado.');
      // 400 e não 401: errar a senha atual não deve derrubar a sessão no navegador.
      const { ok } = await passwords.verify(senhaAtual, auth.senha);
      if (!ok) throw badRequest('A senha atual está incorreta.');

      await users.updatePassword(usuarioId, await passwords.hash(novaSenha));
    },

    async follow(seguidorId, seguidoId) {
      if (seguidorId === seguidoId) throw badRequest('Você não pode seguir a si mesmo.');
      await findOrFail(seguidoId);
      if (await follows.isFollowing(seguidorId, seguidoId)) {
        throw conflict('Você já está seguindo este usuário');
      }

      await follows.follow(seguidorId, seguidoId);
      await notifications.create({
        destinatarioId: seguidoId,
        autorId: seguidorId,
        tipo: 'new_follower',
        conteudo: 'seguiu você',
      });
    },

    async unfollow(seguidorId, seguidoId) {
      if (!(await follows.isFollowing(seguidorId, seguidoId))) {
        throw conflict('Você não está seguindo este usuário');
      }
      await follows.unfollow(seguidorId, seguidoId);
    },
  };
}
