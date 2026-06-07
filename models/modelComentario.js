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
      (:p_texto, :p_likes, :p_post_idpost, :p_usuario_idusuario)
    `, {
      p_texto: this.texto ?? null,
      p_likes: this.likes,
      p_post_idpost: this.post_idpost,
      p_usuario_idusuario: this.usuario_idusuario
    });
  
    const post = await db.query(`SELECT * FROM post WHERE idpost = :p_post_idpost`, { p_post_idpost: this.post_idpost });
    const autorId = post[0].usuario_idusuario;
  
    await db.query(`INSERT INTO notificacoes (usuario_idusuario, usuario_idusuario1, tipo, conteudo, data, lida, post_id) VALUES (:p_usuario_idusuario, :p_usuario_idusuario1, :p_tipo, :p_conteudo, CURRENT_TIMESTAMP, 0, :p_post_id)`, {
      p_usuario_idusuario: autorId,
      p_usuario_idusuario1: this.usuario_idusuario,
      p_tipo: 'comment',
      p_conteudo: 'comentou no seu post',
      p_post_id: this.post_idpost
    });
    
    return comentario;
  }

  static async listarComentariosPorId(postId) {
    const comentarios = await db.query(
        `SELECT comentarios.*, usuario.fotoPerfil, usuario.nome 
        FROM comentarios 
        INNER JOIN usuario ON comentarios.usuario_idusuario = usuario.idusuario 
        WHERE comentarios.post_idpost = :p_idpost   
        ORDER BY comentarios.idcomentarios DESC`,
        { p_idpost: postId }
      );
  return comentarios.map((comentario) => ({
    ...comentario,
  }));

  }

}

module.exports = Comentario;
