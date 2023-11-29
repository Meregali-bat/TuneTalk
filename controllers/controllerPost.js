const Post = require('../models/modelPost.js');
const Comentario = require('../models/modelComentario.js');

let posts = [];

async function criarPost(req, res) {
  const { texto, musicName, artistName, posterMusica, albumName, posterAlbum, postType, releaseDate, nota, data } = req.body; 
  const usuario_idusuario = req.session.user.id;
  const post = new Post(null, texto, usuario_idusuario, 0, musicName, artistName, posterMusica, albumName, posterAlbum, postType, releaseDate, nota, data); 
  await post.postar();
  res.redirect('/foryou');
}

async function darLike(req, res) {
  const newLikeCount = await Post.darLike(req.params.idpost, req);
  res.json({ success: true, likeCount: newLikeCount });
}

async function removerLike(req, res) {
  const newLikeCount = await Post.removerLike(req.params.idpost, req);
  res.json({ success: true, likeCount: newLikeCount });
}

async function getLikes(req, res) {
    const likesList = await Post.getLikes(req.session.user.id);
    res.locals.likesList = likesList;
    next();
  } 


async function listarPosts(req, res) {
  posts = await Post.listarPosts();
  likesList = await Post.getLikes(req.session.user.id);
  res.render('foryouPage', {
    posts,
    likesList,
    usuario : req.session.user
  });
};

async function verPost(req, res) {
  const idpost = req.params.idpost;

  if (!idpost) {
    return;
  }

  const post = await Post.buscarPorId(idpost);

  if (!post) {
    return;
  }

  const comentarios = await Comentario.listarComentariosPorId(post.idpost);
  res.render('post', {
  post,
  comentarios,
  usuario : req.session.user,
  fotoPerfil: post.fotoPerfil,
  nome: post.nome
});
}

async function listarPostsSeguindo(req, res) {
  const posts = await Post.listarPostsSeguindo(req.session.user.id);
  const likesList = await Post.getLikes(req.session.user.id);
  res.render('Seguindo', {
    posts,
    likesList,
    usuario: req.session.user,
    idUsuarioLogado: req.session.user.idUsuario
  });
};

async function deletarPost(req, res) {
  const idpost = req.params.idpost;
  await Post.deletarPost(idpost);
  res.redirect(req.headers.referer || '/foryou');
}

module.exports = {
  listarPosts,
  darLike,
  removerLike,
  getLikes,
  criarPost, 
  verPost,
  listarPostsSeguindo,
  deletarPost
};