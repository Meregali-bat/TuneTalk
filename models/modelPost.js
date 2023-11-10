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
        SELECT post.*, usuario.nome AS autor, usuario.fotoPerfil, 
        GROUP_CONCAT(CONCAT(comentarios.texto, '||', comentario_autor.nome, '||', comentario_autor.fotoPerfil)) AS comentarios
        FROM post 
        JOIN usuario ON post.usuario_idusuario = usuario.idusuario
        LEFT JOIN comentarios ON post.idpost = comentarios.post_idpost
        LEFT JOIN usuario AS comentario_autor ON comentarios.autor_idusuario = comentario_autor.idusuario
        GROUP BY post.idpost
        ORDER BY post.idpost DESC
    `);

    console.log(posts);

    return posts.map(post => ({
        ...post,
        comentarios: post.comentarios ? post.comentarios.split(',').map(comentario => {
            const [texto, autor, fotoPerfil] = comentario.split('||');
            return {
                texto,
                autor,
                fotoPerfil
            };
        }) : []
    }));
}

  static async comentar(idpost, idusuario, texto, idcomentario_pai) {
    const post = await db.query(`
        SELECT usuario_idusuario 
        FROM post 
        WHERE idpost = '${idpost}'
    `);

    const usuario = await db.query(`
        SELECT fotoPerfil 
        FROM usuario
        WHERE idusuario = '${idusuario}'
    `);
    const fotoPerfil = usuario[0].fotoPerfil;

    const comentario = await db.query(`
    INSERT INTO comentarios (post_idpost, post_usuario_idusuario, autor_idusuario, texto, idcomentario_pai) 
    VALUES ('${idpost}', '${post[0].usuario_idusuario}', '${idusuario}', '${texto}', '${idcomentario_pai}')
`);
    console.log(comentario);
    return comentario;
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
