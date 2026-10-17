const POST_COLUMNS = `
  post.*, usuario.nome AS autor, usuario.fotoPerfil, usuario.idusuario AS autorId,
  (SELECT COUNT(*) FROM comentarios WHERE comentarios.post_idpost = post.idpost) AS quantidadeComentarios
`;

const normalizeType = (postType) => (postType === 'album' ? 'album' : 'música');

export function toPost(row) {
  const tipo = normalizeType(row.postType);
  const isAlbum = tipo === 'album';
  return {
    id: row.idpost,
    texto: row.texto,
    likes: row.likes,
    nota: row.nota,
    data: row.data instanceof Date ? row.data.toISOString() : row.data,
    quantidadeComentarios: Number(row.quantidadeComentarios ?? 0),
    tipo,
    titulo: isAlbum ? row.albumName : row.musicName,
    artista: row.artistName,
    capa: isAlbum ? row.posterAlbum : row.posterMusica,
    releaseDate: row.releaseDate,
    preview: row.musicPreview ?? null,
    autor: {
      id: row.autorId ?? row.usuario_idusuario,
      nome: row.autor ?? row.nome,
      fotoPerfil: row.fotoPerfil,
    },
  };
}

export function createPostRepository(db) {
  const byId = (id) => ({ p_idpost: id });

  const readLikes = async (id) => {
    const rows = await db.query('SELECT likes FROM post WHERE idpost = :p_idpost', byId(id));
    return rows[0]?.likes ?? 0;
  };

  return {
    async listLatest() {
      const rows = await db.query(`
        SELECT ${POST_COLUMNS}
        FROM post
        JOIN usuario ON post.usuario_idusuario = usuario.idusuario
        ORDER BY post.data DESC
        LIMIT 20
      `);
      return rows.map(toPost);
    },

    async listByAuthor(autorId) {
      const rows = await db.query(`
        SELECT ${POST_COLUMNS}
        FROM post
        JOIN usuario ON post.usuario_idusuario = usuario.idusuario
        WHERE usuario_idusuario = :p_idusuario
        ORDER BY post.idpost DESC
      `, { p_idusuario: autorId });
      return rows.map(toPost);
    },

    async listFromFollowed(usuarioId) {
      const rows = await db.query(`
        SELECT ${POST_COLUMNS}
        FROM post
        JOIN usuario ON post.usuario_idusuario = usuario.idusuario
        JOIN seguir ON usuario.idusuario = seguir.usuario_idusuario1
        WHERE seguir.usuario_idusuario = :p_idusuario
        ORDER BY post.idpost DESC
      `, { p_idusuario: usuarioId });
      return rows.map(toPost);
    },

    async findById(id) {
      const rows = await db.query(`
        SELECT ${POST_COLUMNS}
        FROM post
        INNER JOIN usuario ON post.usuario_idusuario = usuario.idusuario
        WHERE post.idpost = :p_idpost
      `, byId(id));
      return rows.length > 0 ? toPost(rows[0]) : null;
    },

    async create(post) {
      const result = await db.query(`
        INSERT INTO post
        (texto, usuario_idusuario, likes, musicName, artistName, posterMusica, albumName,
         posterAlbum, postType, releaseDate, nota, data, musicPreview)
        VALUES
        (:p_texto, :p_usuario_idusuario, :p_likes, :p_musicName, :p_artistName, :p_posterMusica,
         :p_albumName, :p_posterAlbum, :p_postType, :p_releaseDate, :p_nota, :p_data, :p_musicPreview)
      `, {
        p_texto: post.texto ?? '',
        p_usuario_idusuario: post.autorId,
        p_likes: 0,
        p_musicName: post.musicName ?? null,
        p_artistName: post.artistName ?? null,
        p_posterMusica: post.posterMusica ?? null,
        p_albumName: post.albumName ?? null,
        p_posterAlbum: post.posterAlbum ?? null,
        p_postType: post.postType ?? null,
        p_releaseDate: post.releaseDate ?? null,
        p_nota: post.nota ?? 0,
        p_data: post.data,
        p_musicPreview: post.musicPreview ?? null,
      });
      return result.insertId;
    },

    async remove(id) {
      await db.query('DELETE FROM comentarios WHERE post_idpost = :p_idpost', byId(id));
      await db.query('DELETE FROM curtir WHERE post_idpost = :p_idpost', byId(id));
      await db.query('DELETE FROM notificacoes WHERE post_id = :p_idpost', byId(id));
      await db.query('DELETE FROM post WHERE idpost = :p_idpost', byId(id));
    },

    async incrementLikes(id) {
      await db.query('UPDATE post SET likes = likes + 1 WHERE idpost = :p_idpost', byId(id));
      return readLikes(id);
    },

    async decrementLikes(id) {
      await db.query('UPDATE post SET likes = GREATEST(likes - 1, 0) WHERE idpost = :p_idpost', byId(id));
      return readLikes(id);
    },

    getLikeCount: readLikes,
  };
}
