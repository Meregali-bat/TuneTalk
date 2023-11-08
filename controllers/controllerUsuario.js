/* eslint-disable require-jsdoc */
const userModel = require('../models/modelUsuario.js');

function login(req, res) {
  res.render('login');
};


async function autenticar(req, res) {
  if (req.body.email == '' || req.body.senha == '') {} else {
    const resp = await userModel.autenticar(req.body.email, req.body.senha);
    if (resp.length > 0) {
      req.session.user = {
        id: resp[0].idUsuario,
        nome: resp[0].nome,
        email: resp[0].email,
      };
      res.redirect('/foryou');
      console.log(req.session.user);
    } else {
      res.redirect('/login');
    }
  }
};

async function cadastrar(req, res) {
  if (req.body.nome == '' || req.body.email == '' || req.body.senha == '') {
    res.redirect('/cadastrar');
  } else {
    const resp = await userModel.cadastrar(
        req.body.nome,
        req.body.email,
        req.body.senha,
        req.body.fotoPerfil,);
    console.log(resp);
    res.redirect('/login');
  }
};


module.exports = {
  login,
  autenticar,
  cadastrar,
};
