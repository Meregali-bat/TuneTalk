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
  // Verifica se o usuário está logado
  if (!req.session.user) {
    res.status(401).json({ message: 'Please log in to create a post' });
    return;
  }
  
  // Coleta os dados do post do corpo da solicitação
  const { texto, musicName, artistName, posterMusica } = req.body;

  // Cria uma nova instância do modelo Post
  const post = new Post(0, texto, req.session.user.id, 0, musicName, artistName, posterMusica); // Add posterMusica as a parameter

  try {
    await post.postar();
    res.redirect('/foryou');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
}

async function comentar(req, res) {
  // Coleta os dados do comentário do corpo da solicitação
  const { post_id, texto, idcomentario_pai } = req.body; // Use idcomentario_pai em vez de parentCommentId

  // Insere o comentário no banco de dados
  await Post.comentar(post_id, req.session.user.id, texto, idcomentario_pai); // Use idcomentario_pai como um argumento para Post.comentar

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