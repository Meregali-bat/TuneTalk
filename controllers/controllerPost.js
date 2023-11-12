const Post = require('../models/modelPost.js');
const Comentario = require('../models/modelComentario.js');

let posts = [];

async function criarPost(req, res) {
  const { texto, musicName, artistName, posterMusica, albumName, posterAlbum, postType, releaseDate } = req.body; 
  const usuario_idusuario = req.session.user.id;
  const post = new Post(null, texto, usuario_idusuario, 0, musicName, artistName, posterMusica, albumName, posterAlbum, postType, releaseDate); 
  await post.postar();
  res.redirect('/foryou');
}

async function darLike(req, res) {
  await Post.darLike(req.params.idpost);
  res.redirect(req.headers.referer);
}

async function listarPosts(req, res) {
  posts = await Post.listarPosts();
  res.render('foryouPage', {
    posts,
    usuario : req.session.user
  });
};

async function verPost(req, res) {
  const post = posts.find(post => post.idpost == req.params.idpost);
  const comentarios = await Comentario.listarComentariosPorId(post.idpost);
  res.render('post', {
    post,
    comentarios,
    usuario : req.session.user
  });
}

module.exports = {
  listarPosts,
  darLike,
  criarPost, 
  verPost
};