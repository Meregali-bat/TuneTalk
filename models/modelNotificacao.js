const db = require("./dbModel.js");

class Notificacao {
    constructor(idnotificacoes, usuario_idusuario, usuario_idusuario1, tipo, conteudo, lida) {
        this.idnotificacoes = idnotificacoes;
        this.usuario_idusuario = usuario_idusuario;
        this.usuario_idusuario1 = usuario_idusuario1;
        this.tipo = tipo;
        this.conteudo = conteudo;
        this.lida = lida;
    }
    
    static async getNotifications(userId) {
        const notifications = await db.query(
          `SELECT notificacoes.*, usuario.nome, usuario.fotoPerfil 
           FROM notificacoes 
           INNER JOIN usuario ON notificacoes.usuario_idusuario1 = usuario.idusuario 
           WHERE notificacoes.usuario_idusuario = ${userId} 
           ORDER BY notificacoes.idnotificacoes DESC`
        );
        return notifications;
      }
    
    static async readNotification(notificationId) {
        const notification = await db.query(
        `UPDATE notificacoes SET lida = true WHERE idnotificacoes = ${notificationId}`
        );
        return notification;
    }
    
    }

module.exports = Notificacao;