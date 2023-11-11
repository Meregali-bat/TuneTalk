/* eslint-disable require-jsdoc */
const db = require('./dbModel.js');
const md5 = require('md5');

class userModel {
  constructor(idUsuario, nome, email, senha, fotoPerfil) {
    this.idUsuario = idUsuario;
    this.nome = nome;
    this.email = email;
    this.senha = senha;
    this.fotoPerfil = fotoPerfil;
  }

  static async autenticar(email, senha) {
    const user = await db.query(`SELECT * FROM usuario WHERE email
     = '${email}' AND senha = '${md5(senha)}'`);
    return user;
  }

  static async cadastrar(nome, email, senha, fotoPerfil, publicId) {
    const user = await db.query(`INSERT INTO usuario (nome, email, senha, fotoPerfil, publicId) 
    VALUES ('${nome}', '${email}', '${md5(senha)}', '${fotoPerfil}', '${publicId}')`);
    console.log(user);
    return user;
  }

}

module.exports = userModel;