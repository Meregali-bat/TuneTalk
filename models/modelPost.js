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

    const { date, time } = getCurrentDateTime();
    const dateTime = `${date} ${time}`;
  
    const post = await db.query(`
      INSERT INTO tunetalk.post 
      (texto, usuario_idusuario, likes, musicName, artistName, posterMusica, albumName, posterAlbum, postType, releaseDate, nota, data) 
      VALUES 
      ("${this.texto}", "${this.usuario_idusuario}", '${this.likes}', "${this.musicName}", "${this.artistName}", '${this.posterMusica}', '${this.albumName}', '${this.posterAlbum}', '${this.postType}', '${this.releaseDate}', '${this.nota}', '${dateTime}')
    `);
    return post;
  }

  static async listarPosts() {
    const posts = await db.query(`
      SELECT post.*, usuario.nome AS autor, usuario.fotoPerfil, usuario.idusuario AS autorId,
      (SELECT COUNT(*) FROM comentarios WHERE comentarios.post_idpost = post.idpost) AS quantidadeComentarios,
      nota
      FROM post 
      JOIN usuario ON post.usuario_idusuario = usuario.idusuario
      ORDER BY post.data DESC
      LIMIT 20
    `);
    
    const uniquePosts = Array.from(new Set(posts.map(post => JSON.stringify(post)))).map(post => JSON.parse(post));

    const shuffledPosts = uniquePosts.sort(() => Math.random() - 0.5);

    return shuffledPosts.map((post) => ({
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
    await db.query(`DELETE FROM comentarios WHERE post_idpost = '${idpost}'`);
    await db.query(`DELETE FROM curtir WHERE post_idpost = '${idpost}'`);
    await db.query(`DELETE FROM notificacoes WHERE post_id = '${idpost}'`);
    const post = await db.query(`DELETE FROM post WHERE idpost = '${idpost}'`);
    return post;
}

  static async darLike(idpost, req) {
    const idusuario = req.session.user.id;
  
    const alreadyLiked = await db.query(`SELECT * FROM curtir WHERE post_idpost = '${idpost}' AND usuario_idusuario = '${idusuario}'`);
  
    if (alreadyLiked.length > 0) {
      return;
    }
  
    const post = await db.query(`SELECT * FROM post WHERE idpost = '${idpost}'`);
    const autorId = post[0].usuario_idusuario;
  
    await db.query(`UPDATE post SET likes = likes + 1 WHERE idpost = '${idpost}'`);
  
    const curtir = await db.query(`INSERT INTO curtir (post_idpost, post_usuario_idusuario, usuario_idusuario) VALUES ('${idpost}', '${autorId}', '${idusuario}')`);
  
    await db.query(`INSERT INTO notificacoes (usuario_idusuario, usuario_idusuario1, tipo, conteudo, data, lida, post_id) VALUES ('${autorId}', '${idusuario}', 'like', 'curtiu seu post', CURRENT_TIMESTAMP, 0, '${idpost}')`);
    
    const updatedPost = await db.query(`SELECT * FROM post WHERE idpost = '${idpost}'`);
  

    return updatedPost[0].likes;
  }

  static async removerLike(idpost, req) {
    const idusuario = req.session.user.id;
  
    const alreadyLiked = await db.query(`SELECT * FROM curtir WHERE post_idpost = '${idpost}' AND usuario_idusuario = '${idusuario}'`);
  
    if (alreadyLiked.length === 0) {
      return;
    }
  
    await db.query(`UPDATE post SET likes = likes - 1 WHERE idpost = '${idpost}'`);
  
    await db.query(`DELETE FROM curtir WHERE post_idpost = '${idpost}' AND usuario_idusuario = '${idusuario}'`);
  
    const updatedPost = await db.query(`SELECT * FROM post WHERE idpost = '${idpost}'`);
  
    return updatedPost[0].likes;
  }

  static async getLikes(idUsuario) {
    const likes = await db.query(`SELECT post_idpost FROM curtir WHERE usuario_idusuario = '${idUsuario}'`);
    return likes.map(like => like.post_idpost); 
  }

  static async contarPostsPorIdUsuario(idusuario) {
    const result = await db.query(`
      SELECT COUNT(*) as quantidadePosts 
      FROM post 
      WHERE usuario_idusuario = ${idusuario}
    `);
    return result[0].quantidadePosts;
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
      data: moment(post.data).fromNow(),
    }));
  }

  static async listarPostsSeguindo(idusuario) {
    const posts = await db.query(`
      SELECT post.*, usuario.nome AS autor, usuario.fotoPerfil, usuario.idusuario AS autorId,
      (SELECT COUNT(*) FROM comentarios WHERE comentarios.post_idpost = post.idpost) AS quantidadeComentarios,
      nota
      FROM post 
      JOIN usuario ON post.usuario_idusuario = usuario.idusuario
      JOIN seguir ON usuario.idusuario = seguir.usuario_idusuario1
      WHERE seguir.usuario_idusuario = ${idusuario}
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

  static async buscarPorId(idpost) {
    const posts = await db.query(`
      SELECT post.*, usuario.fotoPerfil, usuario.nome 
      FROM post 
      INNER JOIN usuario ON post.usuario_idusuario = usuario.idusuario 
      WHERE post.idpost = ${idpost}
    `);
    if (posts.length > 0) {
      return posts[0];
    } else {
      return null;
    }
  }

}

module.exports = Post;
