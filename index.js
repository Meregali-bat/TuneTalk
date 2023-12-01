const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const controllerUsuario = require('./controllers/controllerUsuario.js');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const path = require('path');
const controllerPost = require('./controllers/controllerPost.js');
const cloudinary = require('cloudinary').v2;
const bodyParser = require('body-parser');
const controllerComent = require('./controllers/controllerComent.js');
require('dotenv').config()


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const multer = require('multer');
const userModel = require('./models/modelUsuario.js');
const upload = multer({
  dest: 'uploads/'
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'l1u2c3a4s5',
  saveUninitialized: true,
  resave: false,
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
    if (req.originalUrl == '/login' || req.originalUrl == '/cadastrar' || req.originalUrl == '/') {
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

app.get('/pesquisa', (req, res) => {
  controllerUsuario.pesquisar(req, res);
})

app.get('/logout', (req, res) => {
  controllerUsuario.logout(req, res);
});

app.get('/post/curtir/:idpost', (req, res) => {
  controllerPost.darLike(req, res);
});

app.get('/post/descurtir/:idpost', (req, res) => {
  controllerPost.removerLike(req, res);
});

app.get('/create-post', (req, res) => {
  controllerPost.criarPost(req, res);
});

app.get('/perfil/seguir/:idUsuario', (req, res) => {
  controllerUsuario.seguirUsuario(req, res);
});

app.get('/perfil/deixar-de-seguir/:idUsuario', (req, res) => {
  controllerUsuario.deixardeSeguirUsuario(req, res);
});

app.get('/post/deletar/:idpost', (req, res) => {
  controllerPost.deletarPost(req, res);
});

app.get("/perfil/:idUsuario", async function(req, res) {
  const notifications = req.session.user.notifications;
  await controllerUsuario.listarUsuarioPorId(req, res, notifications);
});

app.get('/foryou', async function(req, res) {
  const notifications = req.session.user.notifications;
  await controllerPost.listarPosts(req, res, notifications);
});

app.get('/seguindo', async function(req, res) {
  const notifications = req.session.user.notifications;
  await controllerPost.listarPostsSeguindo(req, res, notifications);
});

app.post('/create-post', controllerPost.criarPost);

app.get('/post/:idpost', async function(req, res) {
  const notifications = req.session.user.notifications;
  await controllerPost.verPost(req, res, notifications);
}, controllerComent.listarComentarios, controllerPost.darLike);

app.post('/post/:idpost/comentar', controllerComent.criarComentario);
app.get('/perfil/editar', (req, res) => {
  controllerUsuario.editarPerfil(req, res);
  res.redirect(`/perfil/${req.session.user.id}`);
});

app.post('/perfil/editar', upload.single('foto'), async (req, res) => {
  const idUsuario = req.session.user.id;
  const usuarioAtual = await userModel.listarUsuarioPorId(idUsuario);

  if (req.file) {
    cloudinary.uploader.upload(req.file.path, (error, result) => {
      if (error) {
        console.error('Erro ao fazer o upload da imagem:', error);
        res.status(500).send('Erro ao fazer o upload da imagem');
      } else {
        req.body.fotoPerfil = result.url;
        controllerUsuario.editarPerfil(req, res);
      }
    });
  } else {
    req.body.fotoPerfil = usuarioAtual.fotoPerfil;
    controllerUsuario.editarPerfil(req, res);
  }
});

app.post('/cadastrar', upload.single('imagem'), (req, res) => {
  const { nome, email, senha } = req.body;

  if (!req.file) {
    res.render('cadastro', { error: "Nenhuma imagem selecionada", nome, email, senha });
  } else {
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
  }
});


app.listen(port, () => {
  console.log('Servidor rodando na porta: '+ port)
});
