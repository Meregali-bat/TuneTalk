import { badRequest, conflict, notFound } from '../errors.js';
import { USERNAME_MESSAGES, checkUsername } from '../../../shared/usernameRules.js';

export const BIO_MAX = 255;

export function createUserService({ users, follows, postService, notifications }) {
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

    async updateProfile(usuarioId, { nome, bio, fotoPerfil }) {
      const atual = await findOrFail(usuarioId);
      const changes = {
        nome: nome?.trim() || atual.nome,
        bio: bio ?? atual.bio,
        fotoPerfil: fotoPerfil || atual.fotoPerfil,
      };
      if ((changes.bio ?? '').length > BIO_MAX) throw badRequest(`A bio pode ter no máximo ${BIO_MAX} caracteres.`);
      // Nomes antigos fora das regras atuais continuam valendo enquanto não forem trocados.
      if (changes.nome !== atual.nome) await assertUsernameAvailable(changes.nome, usuarioId);
      await users.update(usuarioId, changes);
      return { ...atual, ...changes };
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
