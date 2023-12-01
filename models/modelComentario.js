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
  
    const post = await db.query(`SELECT * FROM post WHERE idpost = '${this.post_idpost}'`);
    const autorId = post[0].usuario_idusuario;
  
    await db.query(`INSERT INTO notificacoes (usuario_idusuario, usuario_idusuario1, tipo, conteudo, data, lida, post_id) VALUES ('${autorId}', '${this.usuario_idusuario}', 'comment', 'comentou no seu post', CURRENT_TIMESTAMP, 0, '${this.post_idpost}')`);
    
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
