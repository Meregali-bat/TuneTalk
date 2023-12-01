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
  const existingUser = await db.query(`SELECT * FROM usuario WHERE nome = '${nome}' OR email = '${email}'`);

  if (existingUser.length > 0) {
    return { error: 'Já existe um usuário com o mesmo nome ou email' };
  }

  const user = await db.query(`INSERT INTO usuario (nome, email, senha, fotoPerfil) VALUES ('${nome}', '${email}', '${md5(senha)}', '${fotoPerfil}')`);
  return user;
}


  static async listarUsuarioPorId(idUsuario) {
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

  static async seguirUsuario(idUsuario, idUsuarioSeguido) {
    const jaEstaSeguindo = await db.query(
      `SELECT * FROM seguir WHERE usuario_idusuario = ${idUsuario} AND usuario_idusuario1 = ${idUsuarioSeguido}`
    );
  
    if (jaEstaSeguindo.length > 0) {
      throw new Error('Você já está seguindo este usuário');
    }
  
    const user = await db.query(
      `INSERT INTO seguir (usuario_idusuario, usuario_idusuario1) VALUES (${idUsuario}, ${idUsuarioSeguido})`
    );
  
    const notification = await db.query(
      `INSERT INTO notificacoes (usuario_idusuario, usuario_idusuario1, tipo, conteudo, lida) VALUES (${idUsuarioSeguido}, ${idUsuario}, 'new_follower', 'seguiu você', false)`
    );

    return user;
  }

  static async deixardeSeguirUsuario(idUsuario, idUsuarioSeguido) {
    const jaEstaSeguindo = await db.query(
      `SELECT * FROM seguir WHERE usuario_idusuario = ${idUsuario} AND usuario_idusuario1 = ${idUsuarioSeguido}`
    );
  
    if (jaEstaSeguindo.length === 0) {
      throw new Error('Você não está seguindo este usuário');
    }
  
    const user = await db.query(
      `DELETE FROM seguir WHERE usuario_idusuario = ${idUsuario} AND usuario_idusuario1 = ${idUsuarioSeguido}`
    );
  
    return user;
  }

  static async getSeguindo(idUsuario) {
    const seguindo = await db.query(`SELECT usuario_idusuario1 FROM seguir WHERE usuario_idusuario = '${idUsuario}'`);
    return seguindo.map(usuario => usuario.usuario_idusuario1);
  }
  
  static async getSeguindoList(idUsuario) {
    const seguindo = await db.query(`
      SELECT usuario.idusuario, usuario.nome, usuario.fotoPerfil, usuario.bio 
      FROM seguir 
      INNER JOIN usuario ON seguir.usuario_idusuario1 = usuario.idusuario 
      WHERE seguir.usuario_idusuario = '${idUsuario}'
    `);
    return seguindo.map(usuario => ({ id: usuario.idusuario, nome: usuario.nome, foto: usuario.fotoPerfil, bio: usuario.bio }));
  }

  static async getSeguidores(idUsuario) {
    const seguidores = await db.query(`
      SELECT usuario.idusuario, usuario.nome, usuario.fotoPerfil, usuario.bio 
      FROM seguir 
      INNER JOIN usuario ON seguir.usuario_idusuario = usuario.idusuario 
      WHERE seguir.usuario_idusuario1 = '${idUsuario}'
    `);
    return seguidores.map(usuario => ({ id: usuario.idusuario, nome: usuario.nome, foto: usuario.fotoPerfil, bio: usuario.bio }));
  }

  static async getQuantidadeSeguindo(idUsuario) {
    const seguindo = await db.query(`
      SELECT COUNT(usuario_idusuario1) as quantidade 
      FROM seguir 
      WHERE usuario_idusuario = '${idUsuario}'
    `);
    return seguindo[0].quantidade;
  }
  
  static async getQuantidadeSeguidores(idUsuario) {
    const seguidores = await db.query(`
      SELECT COUNT(usuario_idusuario) as quantidade 
      FROM seguir 
      WHERE usuario_idusuario1 = '${idUsuario}'
    `);
    return seguidores[0].quantidade;
  }

  static async getNotificacoes(idUsuario) {
    const notificacoes = await db.query(`
      SELECT * FROM notificacoes 
      WHERE usuario_idusuario = '${idUsuario}'
    `);
    return notificacoes;
  }

}

module.exports = userModel;
