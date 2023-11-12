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
      res.redirect("/login");
    }
  }
}

async function cadastrar(req, res) {
  if (req.body.nome == "" || req.body.email == "" || req.body.senha == "") {
    res.redirect("/cadastrar");
  } else {
    const resp = await userModel.cadastrar(
      req.body.nome,
      req.body.email,
      req.body.senha,
      req.body.fotoPerfil
    );
    console.log(resp);
    res.redirect("/login");
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
  const usuario = await userModel.listarUsuarioPorId(idUsuario);
  const posts = await Post.listarPostsPorIdUsuario(idUsuario);

  console.log("´++++++++++++++++++++++++++++++++++++++++" + JSON.stringify(posts, null, 2));

  res.render('user', {
    usuario,
    posts,
    idUsuario,
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
