const express = require('express');
const app = express();
const port = 3000;
const controllerUsuario = require('./controllers/controllerUsuario.js');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const path = require('path');
const controllerPost = require('./controllers/controllerPost.js');
const cloudinary = require('cloudinary').v2;
const bodyParser = require('body-parser');
const axios = require('axios');
const qs = require('querystring');
require('dotenv').config()


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const multer = require('multer');
const upload = multer({
  dest: 'uploads/'
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'l1u2c3a4s5',
  saveUninitialized: true,
  resave: true,
}));

app.use(expressLayouts);
app.set('layout', './layouts/default/index');
app.set('view engine', 'ejs');

app.use(express.urlencoded({
  extended: true,
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  if (!req.session.user) {
    if (req.originalUrl == '/' ||
      req.originalUrl == '/login' ||
      req.originalUrl == '/cadastrar') {
      app.set('layout', './layouts/default/login');
      res.locals.layoutVariables = {
        url: process.env.URL,
        img: '/img/',
        style: '/style/',
        title: 'TuneTalk',
        user: req.session.user,
      };
      next();
    } else {
      res.redirect('/login');
    }
  } else if (req.session.user) {
    if (req.originalUrl == '/login' || req.originalUrl == '/cadastrar') {
      res.redirect('/foryou');
    } else {
      app.set('layout', './layouts/default/index');
      res.locals.layoutVariables = {
        url: process.env.URL,
        img: '/img/',
        style: '/style/',
        title: 'TuneTalk',
        user: req.session.user,
        authorizationCode: req.session.authorizationCode,
        accessToken: req.session.accessToken,
      };
      next();
    }
  }
});



// Rotas

app.get('/', (req, res) => {
  res.render('landingPage');
});

app.get('/cadastrar', (req, res) => {
  res.render('cadastro');
});

app.get('/login', (req, res) => {
  app.set('layout', './layouts/default/login');
  controllerUsuario.login(req, res);
});

app.post('/login', (req, res) => {
  controllerUsuario.autenticar(req, res);
});

app.get('/perfil', (req, res) => {
  res.render('perfil');
});

app.get('/artistas', (req, res) => {
  res.render('artistas');
});

app.get('/logout', (req, res) => {
  controllerUsuario.logout(req, res);
});

app.get('/post/curtir/:idpost', (req, res) => {
  controllerPost.darLike(req, res);
});

app.get('/create-post', (req, res) => {
  controllerPost.criarPost(req, res);
});


app.get('/foryou', controllerPost.listarPosts);
app.post('/post/curtir/:idpost', controllerPost.darLike);
app.post('/create-post', controllerPost.criarPost);
app.post('/comentarios', controllerPost.comentar);

app.get('/post/:idpost', controllerPost.verPost, controllerPost.listarPosts, controllerPost.comentar, controllerPost.darLike);

app.post('/cadastrar', upload.single('imagem'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo foi enviado.');
  }

  cloudinary.uploader.upload(req.file.path, (error, result) => {
    if (error) {
      console.error('Erro ao fazer o upload da imagem:', error);
      res.status(500).send('Erro ao fazer o upload da imagem');
    } else {
      req.body.fotoPerfil = result.url;
      req.body.publicId = result.public_id;
      controllerUsuario.cadastrar(req, res);
    }
  });
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
