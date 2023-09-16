const db = require('./dbModel.js');
const md5 = require('md5');

class userModel{
    constructor(id, nome, email, senha){
        this.id = id;
        this.nome = nome;
        this.email = email;
        this.senha = senha;
    }

    static async autenticar(email, senha){
        let user = await db.query(`SELECT * FROM usuario WHERE email = '${email}' AND senha = '${md5(senha)}'`);
        return user; 
    }

    static async cadastrar (nome, email, senha){
        let user = await db.query(`INSERT INTO usuario (nome, email, senha) VALUES ('${nome}', '${email}', '${md5(senha)}')`);
        return user;
    }

}

module.exports = userModel;