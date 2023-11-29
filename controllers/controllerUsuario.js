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
      
      const user = await userModel.autenticar(email, senha);
      if (user.length > 0) {
        req.session.user = {
          nome: user[0].nome,
          id: user[0].idusuario,
          email: user[0].email,
        };
        res.redirect("/foryou");
      } else {
        res.render('login', { error: 'Erro ao autenticar o usuário.' });
      }
    }
  }
}

async function listarUsuarioPorId(req, res) {
  const idUsuario = req.params.idUsuario;
  const usuario = await userModel.listarUsuarioPorId(idUsuario);
  const posts = await Post.listarPostsPorIdUsuario(idUsuario);
  const quantidadePosts = await Post.contarPostsPorIdUsuario(idUsuario);
  const idSessao = req.session.user.id;
  const seguindoList = await userModel.getSeguindo(idSessao);
  const quantidadeSeguindo = await userModel.getQuantidadeSeguindo(idUsuario);
  const quantidadeSeguidores = await userModel.getQuantidadeSeguidores(idUsuario);
  const seguidoresList = await userModel.getSeguidores(idUsuario); 
  const seguindoListNome = await userModel.getSeguindoList(idUsuario);

  res.render('perfil', {
    usuario,
    posts,
    idUsuario,
    idSessao,
    seguindoList,
    quantidadeSeguindo,
    quantidadeSeguidores,
    quantidadePosts,
    seguidoresList,
    seguindoListNome
  });
}

async function editarPerfil(req, res) {
  const idUsuario = req.session.user.id;
  const { nome, fotoPerfil, bio } = req.body;
  const usuario = await userModel.editarPerfil(idUsuario, nome, fotoPerfil, bio);

  res.redirect(`/perfil/${idUsuario}`);
}


async function seguirUsuario(req, res) {
  const idUsuario = req.session.user.id;
  const idUsuarioSeguido = req.params.idUsuario;
  const usuario = await userModel.seguirUsuario(idUsuario, idUsuarioSeguido);
  const seguindoList = await userModel.getSeguindo(idUsuario);

  res.redirect(req.headers.referer || `/perfil/${idUsuarioSeguido}`);
}

async function deixardeSeguirUsuario(req, res) {
  const idUsuario = req.session.user.id;
  const idUsuarioSeguido = req.params.idUsuario;
  const usuario = await userModel.deixardeSeguirUsuario(idUsuario, idUsuarioSeguido);

  res.redirect(req.headers.referer || `/perfil/${idUsuarioSeguido}`);
}

async function getQuantidadeSeguindo(req, res, next) {
  const quantidadeSeguindo = await userModel.getQuantidadeSeguindo(req.session.user.id); 
  res.locals.quantidadeSeguindo = quantidadeSeguindo;
  next();
}

async function getQuantidadeSeguidores(req, res, next) {
  const quantidadeSeguidores = await userModel.getQuantidadeSeguidores(req.session.user.id); 
  res.locals.quantidadeSeguidores = quantidadeSeguidores;
  next();
}


module.exports = {
  login,
  autenticar,
  cadastrar,
  listarUsuarioPorId,
  editarPerfil,
  seguirUsuario,
  deixardeSeguirUsuario,
  getQuantidadeSeguidores,
  getQuantidadeSeguindo
};
