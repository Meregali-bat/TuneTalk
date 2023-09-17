const Post = require('../models/modelPost.js');

posts = [];

async function listarPosts(req, res){
    let posts = await Post.listarPosts();
    res.render('foryou', {posts});
};

module.exports = {
    listarPosts
};