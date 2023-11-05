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

module.exports = {
  listarPosts,
  darLike,
};
