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
  const { texto, musicName } = req.body;

  // Cria uma nova instância do modelo Post
  const post = new Post(0, texto, req.session.user.id, 0, musicName);
  try {
    await post.postar();
    res.redirect('/foryou');
    console.log(post);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
}

module.exports = {
  listarPosts,
  darLike,
  criarPost, 
};
