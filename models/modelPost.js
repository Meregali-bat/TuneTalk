const db = require("./dbModel.js");
const moment = require('moment');

class Post {
  constructor(
    idpost,
    texto,
    usuario_idusuario,
    likes,
    musicName,
    artistName,
    posterMusica,
    albumName,
    posterAlbum,
    postType,
    releaseDate,
    nota,
    data
  ) {
    this.idpost = idpost;
    this.texto = texto;
    this.usuario_idusuario = usuario_idusuario;
    this.likes = likes;
    this.musicName = musicName;
    this.artistName = artistName;
    this.posterMusica = posterMusica;
    this.albumName = albumName;
    this.posterAlbum = posterAlbum;
    this.postType = postType;
    this.releaseDate = releaseDate;
    this.nota = nota;
    this.data = data;
  }

  async postar() {

    function getCurrentDateTime() {
      const currentDateTime = new Date();
      const date = currentDateTime.toISOString().slice(0, 10);
      const time = currentDateTime.toTimeString().slice(0, 5);
      return { date, time };
    }
  
    console.log(getCurrentDateTime());

    const { date, time } = getCurrentDateTime();
    const dateTime = `${date} ${time}`;
  
    const post = await db.query(`
      INSERT INTO tunetalk.post 
      (texto, usuario_idusuario, likes, musicName, artistName, posterMusica, albumName, posterAlbum, postType, releaseDate, nota, data) 
      VALUES 
      ('${this.texto}', '${this.usuario_idusuario}', '${this.likes}', '${this.musicName}', '${this.artistName}', '${this.posterMusica}', '${this.albumName}', '${this.posterAlbum}', '${this.postType}', '${this.releaseDate}', '${this.nota}', '${dateTime}')
    `);
    console.log(post);
    return post;
  }

  static async listarPosts() {
    const posts = await db.query(`
      SELECT post.*, usuario.nome AS autor, usuario.fotoPerfil, usuario.idusuario AS autorId,
      (SELECT COUNT(*) FROM comentarios WHERE comentarios.post_idpost = post.idpost) AS quantidadeComentarios,
      nota
      FROM post 
      JOIN usuario ON post.usuario_idusuario = usuario.idusuario
      ORDER BY post.idpost DESC
    `);
  
    return posts.map((post) => ({
      ...post,
      posterMusica: post.posterMusica,
      albumName: post.albumName,
      posterAlbum: post.posterAlbum,
      postType: post.postType,
      releaseDate: post.releaseDate,
      nota: post.nota,
      data: moment(post.data).fromNow(),
    }));
  }

  static async deletarPost(idpost) {
    const post = await db.query(`DELETE FROM post WHERE idpost = '${idpost}'`);
    return post;
  }

  static async darLike(idpost) {
    const post = await db.query(`UPDATE post SET 
    likes = likes + 1 WHERE idpost = '${idpost}'`);
    return post;
  }

  static async listarPostsPorIdUsuario(idusuario) {
    const posts = await db.query(`
      SELECT post.*, usuario.nome AS autor, usuario.fotoPerfil, usuario.idusuario AS autorId,
      (SELECT COUNT(*) FROM comentarios WHERE comentarios.post_idpost = post.idpost) AS quantidadeComentarios,
      nota
      FROM post 
      JOIN usuario ON post.usuario_idusuario = usuario.idusuario
      WHERE usuario_idusuario = ${idusuario}
      ORDER BY post.idpost DESC
    `);
  
    return posts.map((post) => ({
      ...post,
      posterMusica: post.posterMusica,
      albumName: post.albumName,
      posterAlbum: post.posterAlbum,
      postType: post.postType,
      releaseDate: post.releaseDate,
      numComentarios: post.numComentarios,
    }));
  }
}

module.exports = Post;
