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
    = :p_email AND senha = :p_senha`, { p_email: email, p_senha: md5(senha) });
    return user;
  }

static async cadastrar(nome, email, senha, fotoPerfil) {
  const existingUser = await db.query(`SELECT * FROM usuario WHERE nome = :p_nome OR email = :p_email`, 
    { p_nome: nome, p_email: email }
  );

  if (existingUser.length > 0) {
    return { error: 'Já existe um usuário com o mesmo nome ou email' };
  }

  const user = await db.query(`INSERT INTO usuario (nome, email, senha, fotoPerfil) VALUES (:p_nome, :p_email, :p_senha, :p_fotoPerfil)`, {
    p_nome: nome,
    p_email: email,
    p_senha: md5(senha),
    p_fotoPerfil: fotoPerfil
  });
  return user;
}


  static async listarUsuarioPorId(idUsuario) {
    const user = await db.query(
      `SELECT idusuario, nome, fotoPerfil, bio FROM usuario WHERE idusuario = :p_id_usuario`, { p_id_usuario: idUsuario }
    );
    return user[0];
  }

  static async editarPerfil(idUsuario, nome, fotoPerfil, bio) {
    const user = await db.query(
      `UPDATE usuario SET nome = :p_nome, fotoPerfil = :p_fotoPerfil, bio = :p_bio WHERE idusuario = :p_id_usuario`, {
        p_nome: nome,
        p_fotoPerfil: fotoPerfil,
        p_bio: bio,
        p_id_usuario: idUsuario
      }
    );
    return user;
  }

  static async seguirUsuario(idUsuario, idUsuarioSeguido) {
    const jaEstaSeguindo = await db.query(
      `SELECT * FROM seguir WHERE usuario_idusuario = :p_id_usuario AND usuario_idusuario1 = :p_id_usuario1`, {
        p_id_usuario: idUsuario,
        p_id_usuario1: idUsuarioSeguido
      }
    );
  
    if (jaEstaSeguindo.length > 0) {
      throw new Error('Você já está seguindo este usuário');
    }
  
    const user = await db.query(
      `INSERT INTO seguir (usuario_idusuario, usuario_idusuario1) VALUES (:p_id_usuario, :p_id_usuario1)`, {
        p_id_usuario: idUsuario,
        p_id_usuario1: idUsuarioSeguido
      }
    );
  
    const notification = await db.query(
      `INSERT INTO notificacoes (usuario_idusuario, usuario_idusuario1, tipo, conteudo, lida) VALUES (:p_id_usuario1, :p_id_usuario, 'new_follower', 'seguiu você', false)`, {
        p_id_usuario1: idUsuarioSeguido,
        p_id_usuario: idUsuario
      }
    );

    return user;
  }

  static async deixardeSeguirUsuario(idUsuario, idUsuarioSeguido) {
    const jaEstaSeguindo = await db.query(
      `SELECT * FROM seguir WHERE usuario_idusuario = :p_id_usuario AND usuario_idusuario1 = :p_id_usuario1`, {
        p_id_usuario: idUsuario,
        p_id_usuario1: idUsuarioSeguido
      }
    );
  
    if (jaEstaSeguindo.length === 0) {
      throw new Error('Você não está seguindo este usuário');
    }
  
    const user = await db.query(
      `DELETE FROM seguir WHERE usuario_idusuario = :p_id_usuario AND usuario_idusuario1 = :p_id_usuario1`, {
        p_id_usuario: idUsuario,
        p_id_usuario1: idUsuarioSeguido
      }
    );
  
    return user;
  }

  static async getSeguindo(idUsuario) {
    const seguindo = await db.query(`SELECT usuario_idusuario1 FROM seguir WHERE usuario_idusuario = :p_id_usuario`, { p_id_usuario: idUsuario });
    return seguindo.map(usuario => usuario.usuario_idusuario1);
  }
  
  static async getSeguindoList(idUsuario) {
    const seguindo = await db.query(`
      SELECT usuario.idusuario, usuario.nome, usuario.fotoPerfil, usuario.bio 
      FROM seguir 
      INNER JOIN usuario ON seguir.usuario_idusuario1 = usuario.idusuario 
      WHERE seguir.usuario_idusuario = :p_id_usuario
    `, { p_id_usuario: idUsuario });
    return seguindo.map(usuario => ({ id: usuario.idusuario, nome: usuario.nome, foto: usuario.fotoPerfil, bio: usuario.bio }));
  }

  static async getSeguidores(idUsuario) {
    const seguidores = await db.query(`
      SELECT usuario.idusuario, usuario.nome, usuario.fotoPerfil, usuario.bio 
      FROM seguir 
      INNER JOIN usuario ON seguir.usuario_idusuario = usuario.idusuario 
      WHERE seguir.usuario_idusuario1 = :p_id_usuario1
    `, { p_id_usuario1: idUsuario });
    return seguidores.map(usuario => ({ id: usuario.idusuario, nome: usuario.nome, foto: usuario.fotoPerfil, bio: usuario.bio }));
  }

  static async getQuantidadeSeguindo(idUsuario) {
    const seguindo = await db.query(`
      SELECT COUNT(usuario_idusuario1) as quantidade 
      FROM seguir 
      WHERE usuario_idusuario = :p_id_usuario
    `, { p_id_usuario: idUsuario });
    return seguindo[0].quantidade;
  }
  
  static async getQuantidadeSeguidores(idUsuario) {
    const seguidores = await db.query(`
      SELECT COUNT(usuario_idusuario) as quantidade 
      FROM seguir 
      WHERE usuario_idusuario1 = :p_id_usuario1
    `, { p_id_usuario1: idUsuario } );
    return seguidores[0].quantidade;
  }

  static async getNotificacoes(idUsuario) {
    const notificacoes = await db.query(`
      SELECT * FROM notificacoes 
      WHERE usuario_idusuario = :p_id_usuario
    `, {p_id_usuario: idUsuario});
    return notificacoes;
  }

}

module.exports = userModel;
