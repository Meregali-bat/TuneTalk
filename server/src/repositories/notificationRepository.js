const toNotification = (row) => ({
  id: row.idnotificacoes,
  tipo: row.tipo,
  conteudo: row.conteudo,
  lida: Boolean(row.lida),
  postId: row.post_id ?? null,
  autor: { id: row.usuario_idusuario1, nome: row.nome, fotoPerfil: row.fotoPerfil },
});

export function createNotificationRepository(db) {
  return {
    async listForUser(usuarioId) {
      const rows = await db.query(
        `SELECT notificacoes.*, usuario.nome, usuario.fotoPerfil
         FROM notificacoes
         INNER JOIN usuario ON notificacoes.usuario_idusuario1 = usuario.idusuario
         WHERE notificacoes.usuario_idusuario = :p_id_usuario
         ORDER BY notificacoes.idnotificacoes DESC`,
        { p_id_usuario: usuarioId },
      );
      return rows.map(toNotification);
    },

    async countUnread(usuarioId) {
      const rows = await db.query(
        'SELECT COUNT(*) AS count FROM notificacoes WHERE usuario_idusuario = :p_id_usuario AND lida = false',
        { p_id_usuario: usuarioId },
      );
      return Number(rows[0].count);
    },

    async markAllRead(usuarioId) {
      await db.query(
        'UPDATE notificacoes SET lida = true WHERE usuario_idusuario = :p_id_usuario',
        { p_id_usuario: usuarioId },
      );
    },

    async create({ destinatarioId, autorId, tipo, conteudo, postId = null }) {
      await db.query(
        `INSERT INTO notificacoes (usuario_idusuario, usuario_idusuario1, tipo, conteudo, data, lida, post_id)
         VALUES (:p_destinatario, :p_autor, :p_tipo, :p_conteudo, CURRENT_TIMESTAMP, 0, :p_post_id)`,
        { p_destinatario: destinatarioId, p_autor: autorId, p_tipo: tipo, p_conteudo: conteudo, p_post_id: postId },
      );
    },

    async removeLike(postId, usuarioId) {
      await db.query(
        `DELETE FROM notificacoes
         WHERE post_id = :p_idpost AND usuario_idusuario1 = :p_idusuario AND tipo = 'like'`,
        { p_idpost: postId, p_idusuario: usuarioId },
      );
    },
  };
}
