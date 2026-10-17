import md5 from 'md5';

const toPublicUser = (row) => ({
  id: row.idusuario,
  nome: row.nome,
  fotoPerfil: row.fotoPerfil,
  bio: row.bio,
});

export function createUserRepository(db) {
  return {
    async findByCredentials(email, senha) {
      const rows = await db.query(
        'SELECT * FROM usuario WHERE email = :p_email AND senha = :p_senha',
        { p_email: email, p_senha: md5(senha) },
      );
      if (rows.length === 0) return null;
      return { ...toPublicUser(rows[0]), email: rows[0].email };
    },

    async existsByNameOrEmail(nome, email) {
      const rows = await db.query(
        'SELECT idusuario FROM usuario WHERE nome = :p_nome OR email = :p_email',
        { p_nome: nome, p_email: email },
      );
      return rows.length > 0;
    },

    async create({ nome, email, senha, fotoPerfil }) {
      const result = await db.query(
        `INSERT INTO usuario (nome, email, senha, fotoPerfil)
         VALUES (:p_nome, :p_email, :p_senha, :p_fotoPerfil)`,
        { p_nome: nome, p_email: email, p_senha: md5(senha), p_fotoPerfil: fotoPerfil },
      );
      return result.insertId;
    },

    async findById(id) {
      const rows = await db.query(
        'SELECT idusuario, nome, fotoPerfil, bio FROM usuario WHERE idusuario = :p_id_usuario',
        { p_id_usuario: id },
      );
      return rows.length > 0 ? toPublicUser(rows[0]) : null;
    },

    async update(id, { nome, fotoPerfil, bio }) {
      await db.query(
        `UPDATE usuario SET nome = :p_nome, fotoPerfil = :p_fotoPerfil, bio = :p_bio
         WHERE idusuario = :p_id_usuario`,
        { p_nome: nome, p_fotoPerfil: fotoPerfil, p_bio: bio, p_id_usuario: id },
      );
    },
  };
}

export { toPublicUser };
