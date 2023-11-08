/* eslint-disable require-jsdoc */
const db = require('./dbModel.js');

class Post {
  constructor(idpost, texto, usuario_idusuario, likes, musicName) {
    this.idpost = idpost;
    this.texto = texto;
    this.usuario_idusuario = usuario_idusuario;
    this.likes = likes;
    this.musicName = musicName;
  }

  static async listarPosts() {
    const posts = await db.query(`SELECT * FROM post`);

    return posts;
  }

  async postar() {
    const post = await db.query(`INSERT INTO post 
    (texto, likes, usuario_idusuario, musicName) VALUES ('${this.texto}','${this.likes}', '${this.usuario_idusuario}', '${this.musicName}')`);
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
