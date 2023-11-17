const userModel = require("../models/modelUsuario.js");
const Post = require("../models/modelPost.js");

function login(req, res) {
  res.render("login");
}

async function autenticar(req, res) {
  if (req.body.email == "" || req.body.senha == "") {
  } else {
    const resp = await userModel.autenticar(req.body.email, req.body.senha);
    if (resp.length > 0) {
      req.session.user = {
        nome: resp[0].nome,
        id: resp[0].idusuario,
        email: resp[0].email,
      };
      res.redirect("/foryou");
      console.log(req.session.user);
    } else {
      res.render('login', { error: 'Usuário ou senha incorretos.' });
    }
  }
}

async function cadastrar(req, res) {
  const { nome, email, senha, fotoPerfil } = req.body;

  if (!nome || !email || !senha) {
    res.redirect("/cadastrar");
  } else {
    const hasSymbol = /\W/.test(senha);
    const hasSixCharacters = senha.length >= 6;
    const hasUppercase = /[A-Z]/.test(senha);

    if (!hasSymbol || !hasSixCharacters || !hasUppercase) {
      res.render('cadastro', { error: 'A senha deve conter pelo menos um símbolo, mais de 6 caracteres e uma letra maiúscula.' });
      return;
    }

    const resp = await userModel.cadastrar(nome, email, senha, fotoPerfil);

    if (resp.error) {
      res.render('cadastro', { error: resp.error });
    } else {
      console.log(resp);
      res.redirect("/login");
    }
  }
}

async function listarUsuarioPorId(req, res) {
  const idUsuario = req.params.idUsuario;
  const usuario = await userModel.listarUsuarioPorId(idUsuario);
  const posts = await Post.listarPostsPorIdUsuario(idUsuario);

  console.log("´++++++++++++++++++++++++++++++++++++++++" + JSON.stringify(posts, null, 2));

  res.render('perfil', {
    usuario,
    posts,
    idUsuario,
  });
}

async function listarUsuarioPorId2(req, res) {
  const idUsuario = req.params.idUsuario;
  const usuario2 = await userModel.listarUsuarioPorId(idUsuario);
  const posts = await Post.listarPostsPorIdUsuario(idUsuario);

  res.render('user', {
    usuario2,
    posts,
    idUsuario,
    usuario: req.session.user,
  });
}

async function editarPerfil(req, res) {
  const idUsuario = req.session.user.id;
  const { nome, fotoPerfil, bio } = req.body;
  const usuario = await userModel.editarPerfil(idUsuario, nome, fotoPerfil, bio);
  console.log(usuario);
  res.redirect(`/perfil/${idUsuario}`);
}

module.exports = {
  login,
  autenticar,
  cadastrar,
  listarUsuarioPorId,
  editarPerfil,
  listarUsuarioPorId2,
};
