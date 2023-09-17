const db = require('./dbModel.js');


class Post {
    constructor(id, texto, idUsuario){
        this.id = id;
        this.texto = texto;
        this.idUsuario = idUsuario;
    }

    static async listarPosts(){
        try {
            const posts = await db.query(`SELECT * FROM post`);
            return posts;
        } catch (error) {
            console.log("Erro ao listar os posts:", error);
            throw error;
        }
    }

    async postar(){
        let post = await db.query(`INSERT INTO post (texto, likes, usuario_idusuario, musica) VALUES ('${this.texto}', '${this.likes}', '${this.usuario_idusuario}', '${this.musica}')`);
        return post;
    }

    static async deletar(idpost){
        let post = await db.query(`DELETE FROM post WHERE idpost = '${idpost}'`);
        return post;
    }
}

module.exports = Post;