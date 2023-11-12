const db = require("./dbModel.js");

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
    releaseDate
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
  }

  async postar() {
    const post = await db.query(`
      INSERT INTO tunetalk.post 
      (texto, usuario_idusuario, likes, musicName, artistName, posterMusica, albumName, posterAlbum, postType, releaseDate) 
      VALUES 
      ('${this.texto}', '${this.usuario_idusuario}', '${this.likes}', '${this.musicName}', '${this.artistName}', '${this.posterMusica}', '${this.albumName}', '${this.posterAlbum}', '${this.postType}', '${this.releaseDate}')
    `);
    console.log(post);
    return post;
  }

  static async listarPosts() {
    const posts = await db.query(`
      SELECT post.*, usuario.nome AS autor, usuario.fotoPerfil, usuario.idusuario AS autorId,
      (SELECT COUNT(*) FROM comentarios WHERE comentarios.post_idpost = post.idpost) AS quantidadeComentarios
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
    }));
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

  static async listarPostsPorIdUsuario(idusuario) {
    const posts = await db.query(`
      SELECT post.*, usuario.nome AS autor, usuario.fotoPerfil
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
    }));
  }
}

module.exports = Post;
