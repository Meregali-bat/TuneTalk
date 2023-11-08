/* eslint-disable require-jsdoc */
const db = require('./dbModel.js');

class Post {
  constructor(idpost, texto, usuario_idusuario, likes, musicName, artistName) {
    this.idpost = idpost;
    this.texto = texto;
    this.usuario_idusuario = usuario_idusuario;
    this.likes = likes;
    this.musicName = musicName;
    this.artistName = artistName;
  }

  static async listarPosts() {
    const posts = await db.query(`
      SELECT post.*, usuario.nome AS autor, 
      GROUP_CONCAT(CONCAT(comentarios.texto, '||', usuario.nome)) AS comentarios
      FROM post 
      JOIN usuario ON post.usuario_idusuario = usuario.idusuario
      LEFT JOIN comentarios ON post.idpost = comentarios.post_idpost
      LEFT JOIN usuario AS comentario_autor ON comentarios.post_usuario_idusuario = comentario_autor.idusuario
      GROUP BY post.idpost
    `);

    return posts.map(post => ({
      ...post,
      comentarios: post.comentarios ? post.comentarios.split(',').map(comentario => {
        const [texto, autor] = comentario.split('||');
        return {
          texto,
          autor
        };
      }) : []
    }));
  }

  async postar() {
    const post = await db.query(`INSERT INTO post 
    (texto, likes, usuario_idusuario, musicName, artistName) VALUES ('${this.texto}','${this.likes}', '${this.usuario_idusuario}', '${this.musicName}', '${this.artistName}')`);
    return post;
  }

  static async deletar(idpost) {
    const post = await db.query(`DELETE FROM post WHERE idpost = '${idpost}'`);
    return post;
  }

  static async darLike(idpost) {
    const post = await db.query(`UPDATE post SET 
    likes = likes + 1 WHERE idpost = '${idpost}'`);
    return post;
  }
}

module.exports = Post;
