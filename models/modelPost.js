const db = require('./dbModel.js');

class Post {
    constructor(idpost, texto, idUsuario, likes){
        this.idpost = idpost;
        this.texto = texto;
        this.idUsuario = idUsuario;
        this.likes = likes;
    }

    static async listarPosts(){
        let posts = await db.query(`SELECT * FROM post`);
        
        return posts;
    }

    async postar(){
        let post = await db.query(`INSERT INTO post (texto, likes, usuario_idusuario, musica) VALUES ('${this.texto}', '${this.likes}', '${this.usuario_idusuario}', '${this.musica}')`);
        return post;
    }

    static async deletar(idpost){
        let post = await db.query(`DELETE FROM post WHERE idpost = '${idpost}'`);
        return post;
    }

    static async darLike(idpost){
        let post = await db.query(`UPDATE post SET likes = likes + 1 WHERE idpost = '${idpost}'`);
        return post;
    }
}

module.exports = Post;