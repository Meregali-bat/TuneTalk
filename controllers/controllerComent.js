const Comentario = require("../models/modelComentario.js");

let comentarios = [];

async function criarComentario(req, res) {
  
    const { texto } = req.body;
    const postId = req.params.idpost; 
    const usuarioId = req.session.user.id;
    const comentario = new Comentario(null, texto, 0, postId, usuarioId);
    await comentario.comentar();
    res.redirect(req.headers.referer);
  
}

async function listarComentarios(req, res, next) {
    const postId = req.params.idpost;
    const comentarios = await Comentario.listarComentariosPorId(postId);
    res.locals.comentarios = comentarios;
    next();
  }

module.exports = {
  criarComentario,
  listarComentarios,
};
