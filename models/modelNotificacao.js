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
           WHERE notificacoes.usuario_idusuario = :p_id_usuario 
           ORDER BY notificacoes.idnotificacoes DESC`
        , { p_id_usuario: userId });
        return notifications;
      }
    
    static async readNotification(notificationId) {
        const notification = await db.query(
        `UPDATE notificacoes SET lida = true WHERE idnotificacoes = :p_id_notificacao`
        , { p_id_notificacao: notificationId });
        return notification;
    }
    
    static async updateAllNotifications(userId) {
        await db.query(`UPDATE notificacoes SET lida = true WHERE usuario_idusuario = :p_id_usuario`, { p_id_usuario: userId });
    }
    
    static async getUnreadNotificationsCount(userId) {
        const result = await db.query(`SELECT COUNT(*) as count FROM notificacoes WHERE usuario_idusuario = :p_id_usuario AND lida = false`, { p_id_usuario: userId });
        return result[0].count;
    }
    
    }

module.exports = Notificacao;