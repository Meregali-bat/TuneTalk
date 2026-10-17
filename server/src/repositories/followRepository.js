import { toPublicUser } from './userRepository.js';

export function createFollowRepository(db) {
  const pair = (seguidorId, seguidoId) => ({ p_id_usuario: seguidorId, p_id_usuario1: seguidoId });

  return {
    async isFollowing(seguidorId, seguidoId) {
      const rows = await db.query(
        `SELECT usuario_idusuario FROM seguir
         WHERE usuario_idusuario = :p_id_usuario AND usuario_idusuario1 = :p_id_usuario1`,
        pair(seguidorId, seguidoId),
      );
      return rows.length > 0;
    },

    async follow(seguidorId, seguidoId) {
      await db.query(
        'INSERT INTO seguir (usuario_idusuario, usuario_idusuario1) VALUES (:p_id_usuario, :p_id_usuario1)',
        pair(seguidorId, seguidoId),
      );
    },

    async unfollow(seguidorId, seguidoId) {
      await db.query(
        'DELETE FROM seguir WHERE usuario_idusuario = :p_id_usuario AND usuario_idusuario1 = :p_id_usuario1',
        pair(seguidorId, seguidoId),
      );
    },

    async followingIds(usuarioId) {
      const rows = await db.query(
        'SELECT usuario_idusuario1 FROM seguir WHERE usuario_idusuario = :p_id_usuario',
        { p_id_usuario: usuarioId },
      );
      return rows.map((row) => row.usuario_idusuario1);
    },

    async listFollowing(usuarioId) {
      const rows = await db.query(
        `SELECT usuario.idusuario, usuario.nome, usuario.fotoPerfil, usuario.bio
         FROM seguir
         INNER JOIN usuario ON seguir.usuario_idusuario1 = usuario.idusuario
         WHERE seguir.usuario_idusuario = :p_id_usuario`,
        { p_id_usuario: usuarioId },
      );
      return rows.map(toPublicUser);
    },

    async listFollowers(usuarioId) {
      const rows = await db.query(
        `SELECT usuario.idusuario, usuario.nome, usuario.fotoPerfil, usuario.bio
         FROM seguir
         INNER JOIN usuario ON seguir.usuario_idusuario = usuario.idusuario
         WHERE seguir.usuario_idusuario1 = :p_id_usuario1`,
        { p_id_usuario1: usuarioId },
      );
      return rows.map(toPublicUser);
    },

    async countFollowing(usuarioId) {
      const rows = await db.query(
        'SELECT COUNT(usuario_idusuario1) AS quantidade FROM seguir WHERE usuario_idusuario = :p_id_usuario',
        { p_id_usuario: usuarioId },
      );
      return Number(rows[0].quantidade);
    },

    async countFollowers(usuarioId) {
      const rows = await db.query(
        'SELECT COUNT(usuario_idusuario) AS quantidade FROM seguir WHERE usuario_idusuario1 = :p_id_usuario1',
        { p_id_usuario1: usuarioId },
      );
      return Number(rows[0].quantidade);
    },
  };
}
