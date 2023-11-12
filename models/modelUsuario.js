/* eslint-disable require-jsdoc */
const db = require("./dbModel.js");
const md5 = require("md5");

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

  static async cadastrar(nome, email, senha, fotoPerfil) {
    const user =
      await db.query(`INSERT INTO usuario (nome, email, senha, fotoPerfil) 
    VALUES ('${nome}', '${email}', '${md5(senha)}', '${fotoPerfil}')`);
    console.log(user);
    return user;
  }

  static async listarUsuarioPorId(idUsuario) {
    console.log("idUsuario: " + idUsuario);
    const user = await db.query(
      `SELECT idusuario, nome, fotoPerfil, bio FROM usuario WHERE idusuario = ${idUsuario}`
    );
    return user[0];
  }

  static async editarPerfil(idUsuario, nome, fotoPerfil, bio) {
    const user = await db.query(
      `UPDATE usuario SET nome = '${nome}', fotoPerfil = '${fotoPerfil}', bio = '${bio}' WHERE idusuario = ${idUsuario}`
    );
    return user;
  }

}

module.exports = userModel;
