export function createLikeRepository(db) {
  return {
    async hasLiked(postId, usuarioId) {
      const rows = await db.query(
        'SELECT 1 FROM curtir WHERE post_idpost = :p_idpost AND usuario_idusuario = :p_idusuario',
        { p_idpost: postId, p_idusuario: usuarioId },
      );
      return rows.length > 0;
    },

    async add({ postId, autorId, usuarioId }) {
      await db.query(
        `INSERT INTO curtir (post_idpost, post_usuario_idusuario, usuario_idusuario)
         VALUES (:p_idpost, :p_autorId, :p_idusuario)`,
        { p_idpost: postId, p_autorId: autorId, p_idusuario: usuarioId },
      );
    },

    async remove(postId, usuarioId) {
      await db.query(
        'DELETE FROM curtir WHERE post_idpost = :p_idpost AND usuario_idusuario = :p_idusuario',
        { p_idpost: postId, p_idusuario: usuarioId },
      );
    },

    async likedPostIds(usuarioId) {
      const rows = await db.query(
        'SELECT post_idpost FROM curtir WHERE usuario_idusuario = :p_idusuario',
        { p_idusuario: usuarioId },
      );
      return rows.map((row) => row.post_idpost);
    },
  };
}
