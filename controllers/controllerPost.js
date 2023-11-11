/* eslint-disable require-jsdoc */
const Post = require('../models/modelPost.js');

let posts = [];


async function listarPosts(req, res) {
  posts = await Post.listarPosts();
  res.render('foryouPage', {
    posts,
  });
};

async function darLike(req, res) {
  await Post.darLike(req.params.idpost);
  res.redirect('/foryou');
}

async function criarPost(req, res) {
  console.log(req.session.user);
  // Coleta os dados do post do corpo da solicitação
  const { texto, musicName, artistName, posterMusica, albumName, posterAlbum, postType } = req.body; 

  // Cria uma nova instância do modelo Post
  const post = new Post(0, texto, req.session.user.id, 0, musicName, artistName, posterMusica, albumName, posterAlbum, postType); 

    await post.postar();
    res.redirect('/foryou');
 
}

async function comentar(req, res) {
  // Coleta os dados do comentário do corpo da solicitação
  const { post_id, texto, idcomentario_pai } = req.body; 

  // Insere o comentário no banco de dados
  await Post.comentar(post_id, req.session.user.id, texto, idcomentario_pai); 

  // Redireciona o usuário de volta para a página de posts
  res.redirect(`/post/${post_id}`);
}



async function verPost(req, res) {
  const post = posts.find(post => post.idpost == req.params.idpost);
  res.render('post', {
    post,
  });
}

module.exports = {
  listarPosts,
  darLike,
  criarPost, 
  comentar,
  verPost
};