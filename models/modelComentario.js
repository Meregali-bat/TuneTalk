const db = require("./dbModel.js");

class Comentario {
  constructor(idcomentarios, texto, likes, post_idpost, usuario_idusuario) {
    this.idcomentarios = idcomentarios;
    this.texto = texto;
    this.likes = likes;
    this.post_idpost = post_idpost;
    this.usuario_idusuario = usuario_idusuario;
  }

  async comentar() {
    const comentario = await db.query(`
      INSERT INTO tunetalk.comentarios 
      (texto, likes, post_idpost, usuario_idusuario) 
      VALUES 
      ('${this.texto}', '${this.likes}', '${this.post_idpost}', '${this.usuario_idusuario}')
    `);
    return comentario;
  }

  static async listarComentariosPorId(postId) {
    const comentarios = await db.query(
        `SELECT comentarios.*, usuario.fotoPerfil, usuario.nome 
        FROM comentarios 
        INNER JOIN usuario ON comentarios.usuario_idusuario = usuario.idusuario 
        WHERE comentarios.post_idpost = ${postId}   
        ORDER BY comentarios.idcomentarios DESC`,
      );
  return comentarios.map((comentario) => ({
    ...comentario,
  }));

  }

}

module.exports = Comentario;
