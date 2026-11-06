// Limites de requisições por rota. Os números miram em parar scripts sem atrapalhar quem usa o
// app com as mãos; mude aqui se alguém de verdade estiver batendo neles.
const MIN = 60;
const HORA = 60 * MIN;

const porIp = (req) => req.ip;
const porUsuario = (req) => req.session?.user?.id ?? null;
// Login: por ip + email, para uma conta atacada não travar o login de todo mundo no mesmo ip.
const porIpEEmail = (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email ? `${req.ip}:${email}` : req.ip;
};

export const LIMITES = {
  // Contas
  login: { max: 10, janelaSeg: 15 * MIN, chave: porIpEEmail },
  loginIp: { max: 50, janelaSeg: HORA, chave: porIp },
  cadastro: { max: 5, janelaSeg: HORA, chave: porIp },
  esqueciSenha: { max: 5, janelaSeg: HORA, chave: porIp },
  redefinirSenha: { max: 10, janelaSeg: HORA, chave: porIp },
  // Trocar senha/email pede a senha atual: sem limite, seria força bruta por dentro.
  senhaAtual: { max: 5, janelaSeg: 15 * MIN, chave: porUsuario },

  // Escrita
  postar: { max: 10, janelaSeg: MIN, chave: porUsuario },
  postarHora: { max: 100, janelaSeg: HORA, chave: porUsuario },
  // Curtir, seguir, votar, bloquear, silenciar e os desfazer.
  interacao: { max: 60, janelaSeg: MIN, chave: porUsuario },
  // Editar perfil, nome, favoritos, Quero ouvir, avisos no celular.
  perfil: { max: 30, janelaSeg: MIN, chave: porUsuario },
  // Cada assinatura deixa subir imagens no Cloudinary (a cota é sua).
  upload: { max: 30, janelaSeg: HORA, chave: porUsuario },

  // APIs de terceiros (Deezer, LRCLIB, Giphy): a busca do app já espera a pessoa parar de digitar.
  externas: { max: 120, janelaSeg: MIN, chave: porUsuario },
  // Imagem do cartão de compartilhar: pública e cara de gerar.
  imagemOg: { max: 30, janelaSeg: MIN, chave: porIp },
};

const passa = (req, res, next) => next();

// limite('login') -> middleware. Sem limitador (testes de rota), não limita nada.
export function criarLimites(limitador) {
  return (nome) => (limitador ? limitador.middleware(nome, LIMITES[nome]) : passa);
}
