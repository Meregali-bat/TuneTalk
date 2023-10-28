const express = require('express');
const app = express();
const port = 3000;
const controllerUsuario = require('./controllers/controllerUsuario.js');
const db = require('./models/dbModel.js');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const modelUsuario = require('./models/modelUsuario.js');
const multer = require('multer');
const path = require('path');
const controllerPost = require('./controllers/controllerPost.js');
const modelPost = require('./models/modelPost.js');

app.use(session({
    secret: 'l1u2c3a4s5',
    saveUninitialized: true,
    resave: true
}));

app.use(expressLayouts);
app.set('layout', './layouts/default/index');
app.set('view engine', 'ejs');

app.use(express.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});

const upload = multer({
    storage: storage
});

app.use((req, res, next) => {
    if (!req.session.user) {
        if (req.originalUrl == '/' ||  req.originalUrl == '/login' || req.originalUrl == '/cadastrar') {
            app.set('layout', './layouts/default/login');
            res.locals.layoutVariables = {
                url: process.env.URL,
                img: "/img/",
                style: "/style/",
                title: "TuneTalk",
                user: req.session.user
            };
            next();
        } else {
            res.redirect('/login');
        }
    } else {
        app.set('layout', './layouts/default/index');
        res.locals.layoutVariables = {
            url: process.env.URL,
            img: "/img/",
            style: "/style/",
            title: "TuneTalk",
            user: req.session.user
        };
        next();
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

app.get('/logout', (req, res) => {
    controllerUsuario.logout(req, res);
});

app.get('/post/curtir/:idpost', (req, res) => {
    controllerPost.darLike(req, res);
});

app.get('/foryou', controllerPost.listarPosts);
app.post('/post/curtir/:idpost', controllerPost.darLike);

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});


app.post('/cadastrar', (req, res) => {
    controllerUsuario.cadastrar(req, res);
});
