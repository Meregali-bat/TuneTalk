const toComment = (row) => ({
  id: row.idcomentarios,
  texto: row.texto,
  autor: { id: row.usuario_idusuario, nome: row.nome, fotoPerfil: row.fotoPerfil },
});

export function createCommentRepository(db) {
  return {
    async create({ postId, usuarioId, texto }) {
      const result = await db.query(
        `INSERT INTO comentarios (texto, likes, post_idpost, usuario_idusuario)
         VALUES (:p_texto, :p_likes, :p_post_idpost, :p_usuario_idusuario)`,
        { p_texto: texto, p_likes: 0, p_post_idpost: postId, p_usuario_idusuario: usuarioId },
      );
      return result.insertId;
    },

    async listByPost(postId) {
      const rows = await db.query(
        `SELECT comentarios.*, usuario.fotoPerfil, usuario.nome
         FROM comentarios
         INNER JOIN usuario ON comentarios.usuario_idusuario = usuario.idusuario
         WHERE comentarios.post_idpost = :p_idpost
         ORDER BY comentarios.idcomentarios DESC`,
        { p_idpost: postId },
      );
      return rows.map(toComment);
    },
  };
}
