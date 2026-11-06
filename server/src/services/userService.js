import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { SEM_RESTRICOES, haBloqueio } from './restricaoService.js';
import { USERNAME_MESSAGES, checkUsername } from '../../../shared/usernameRules.js';
import { PASSWORD_RULES_MESSAGE, isPasswordValid } from '../../../shared/passwordRules.js';
import { emailValido, limparEmail } from '../../../shared/emailRules.js';
import { validarEfeito } from '../../../shared/profileEffect.js';
import { capaDoDeezer, favoritosVazios, lerFavoritos, validarFavoritos } from '../../../shared/favorites.js';

export const BIO_MAX = 255;

// Aviso mandado para o email antigo quando a pessoa troca o email da conta.
export function avisoTrocaDeEmail({ nome, novoEmail }) {
  const ola = nome ? `Olá, ${nome}!` : 'Olá!';
  const texto = `O email da sua conta no TuneTalk foi trocado para ${novoEmail}. `
    + 'Se foi você, está tudo certo. Se não foi, entre no TuneTalk, troque o email de volta e troque também a sua senha.';
  const escapar = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return {
    subject: 'O email da sua conta no TuneTalk mudou',
    text: `${ola}\n\n${texto}`,
    html: `<p>${escapar(ola)}</p><p>${escapar(texto)}</p>`,
  };
}
export const NOME_EXIBICAO_MAX = 50;

// undefined mantém o atual; texto vazio apaga (o perfil volta a mostrar só o nome de usuário).
const cleanNomeExibicao = (valor, atual) => (valor === undefined ? atual : String(valor).trim() || null);

// capaFavoritoValida: no app real, só imagens do Deezer; a demo troca pelas capas desenhadas dela.
export function createUserService({
  users, follows, postService, notifications, passwords, capaFavoritoValida = capaDoDeezer, restricoes = SEM_RESTRICOES,
  // Para avisar o endereço antigo quando o email muda (opcional).
  mailer = null,
  // true na primeira vez que a chave aparece (num tempo); sem isso, sempre avisa.
  avisarUmaVez = async () => true,
}) {
  const findOrFail = async (id) => {
    const user = await users.findById(id);
    if (!user) throw notFound('Usuário não encontrado.');
    return user;
  };

  const assertUsernameAvailable = async (nome, usuarioId) => {
    const broken = Object.entries(checkUsername(nome)).find(([, ok]) => !ok);
    if (broken) throw badRequest(USERNAME_MESSAGES[broken[0]]);
    if (await users.isNameTaken(nome, usuarioId)) throw conflict('Esse nome de usuário já está em uso.');
  };

  return {
    async getProfile(profileId, viewerId) {
      let usuario = await findOrFail(profileId);
      // Quem já passou dos 100 posts antes de existir a recompensa ganha ao abrir o próprio perfil.
      if (profileId === viewerId && !usuario.efeitoDesde && await postService.verificarMarco?.(profileId)) {
        usuario = await findOrFail(profileId);
      }
      const relacao = profileId === viewerId
        ? { bloqueado: false, meBloqueou: false, silenciado: false }
        : await restricoes.relacao(viewerId, profileId);

      // Bloqueio em qualquer sentido: o perfil aparece só com nome e foto, sem posts nem listas.
      if (relacao.bloqueado || relacao.meBloqueou) {
        return {
          usuario,
          relacao,
          posts: [],
          quantidadePosts: 0,
          quantidadeSeguidores: 0,
          quantidadeSeguindo: 0,
          seguidores: [],
          seguindo: [],
          seguindoIds: [],
          favoritos: favoritosVazios(),
        };
      }

      const [posts, quantidadeSeguidores, quantidadeSeguindo, seguidores, seguindo, seguindoIds, favoritos] =
        await Promise.all([
          postService.byAuthor(profileId, viewerId),
          follows.countFollowers(profileId),
          follows.countFollowing(profileId),
          follows.listFollowers(profileId),
          follows.listFollowing(profileId),
          follows.followingIds(viewerId),
          users.getFavorites(profileId),
        ]);

      return {
        usuario,
        relacao,
        posts,
        quantidadePosts: posts.length,
        quantidadeSeguidores,
        quantidadeSeguindo,
        seguidores,
        seguindo,
        seguindoIds,
        favoritos: lerFavoritos(favoritos, { capaValida: capaFavoritoValida }),
      };
    },

    // Disco de vinil no feed: aparece para quem ganhou o efeito dos 100 posts e ainda não abriu.
    // Também é onde quem já tinha passado de 100 antes da recompensa existir ganha o efeito.
    async presente(usuarioId) {
      let presente = await users.getGift(usuarioId);
      if (presente && !presente.efeitoDesde && await postService.verificarMarco?.(usuarioId)) {
        presente = await users.getGift(usuarioId);
      }
      return { pendente: Boolean(presente?.efeitoDesde) && !presente.presenteAbertoEm };
    },

    async abrirPresente(usuarioId) {
      const presente = await users.getGift(usuarioId);
      if (!presente?.efeitoDesde) throw forbidden('O presente é liberado ao chegar a 100 posts.');
      await users.openGift(usuarioId);
    },

    async setUsername(usuarioId, nome) {
      const clean = (nome ?? '').trim();
      await assertUsernameAvailable(clean, usuarioId);
      await users.update(usuarioId, { nome: clean });
      return { id: usuarioId, nome: clean };
    },

    async updateProfile(usuarioId, {
      nome, nomeExibicao, bio, fotoPerfil, bannerUrl, mostrarSeloFundador, efeitoPerfil, mostrarEfeito,
    }) {
      const atual = await findOrFail(usuarioId);
      const changes = {
        nome: nome?.trim() || atual.nome,
        nomeExibicao: cleanNomeExibicao(nomeExibicao, atual.nomeExibicao),
        bio: bio ?? atual.bio,
        fotoPerfil: fotoPerfil || atual.fotoPerfil,
        bannerUrl: bannerUrl || atual.bannerUrl,
        mostrarSeloFundador: typeof mostrarSeloFundador === 'boolean' ? mostrarSeloFundador : atual.mostrarSeloFundador,
      };
      if (efeitoPerfil !== undefined || mostrarEfeito !== undefined) {
        if (!atual.efeitoDesde) throw forbidden('O efeito do perfil é liberado ao chegar a 100 posts.');
        if (efeitoPerfil !== undefined) {
          const { efeito, erro } = validarEfeito(efeitoPerfil);
          if (erro) throw badRequest(erro);
          changes.efeitoPerfil = efeito;
        }
        if (typeof mostrarEfeito === 'boolean') changes.mostrarEfeito = mostrarEfeito;
      }
      if ((changes.bio ?? '').length > BIO_MAX) throw badRequest(`A bio pode ter no máximo ${BIO_MAX} caracteres.`);
      if ((changes.nomeExibicao ?? '').length > NOME_EXIBICAO_MAX) {
        throw badRequest(`O nome pode ter no máximo ${NOME_EXIBICAO_MAX} caracteres.`);
      }
      // Nomes antigos fora das regras atuais continuam valendo enquanto não forem trocados.
      if (changes.nome !== atual.nome) await assertUsernameAvailable(changes.nome, usuarioId);
      await users.update(usuarioId, changes);
      return { ...atual, ...changes };
    },

    async updateFavorites(usuarioId, body) {
      const { favoritos, erro } = validarFavoritos(body, { capaValida: capaFavoritoValida });
      if (erro) throw badRequest(erro);
      await users.setFavorites(usuarioId, favoritos);
      return favoritos;
    },

    async getProfileByName(nome, viewerId) {
      const [usuario] = await users.findByNames([nome]);
      if (!usuario) throw notFound('Usuário não encontrado.');
      return this.getProfile(usuario.id, viewerId);
    },

    async search(texto, viewerId) {
      const limpo = (texto ?? '').trim().replace(/^@/, '').trim();
      if (!limpo) return [];
      const [achados, seguindoIds] = await Promise.all([users.search(limpo), follows.followingIds(viewerId)]);
      return achados.map((u) => ({ ...u, seguindo: seguindoIds.includes(u.id) }));
    },

    async changePassword(usuarioId, senhaAtual, novaSenha) {
      if (!senhaAtual || !novaSenha) throw badRequest('Preencha a senha atual e a nova.');
      if (!isPasswordValid(novaSenha)) throw badRequest(PASSWORD_RULES_MESSAGE);
      if (novaSenha === senhaAtual) throw badRequest('A nova senha precisa ser diferente da atual.');

      const auth = await users.findAuthById(usuarioId);
      if (!auth) throw notFound('Usuário não encontrado.');
      // 400 e não 401: errar a senha atual não deve derrubar a sessão no navegador.
      const { ok } = await passwords.verify(senhaAtual, auth.senha);
      if (!ok) throw badRequest('A senha atual está incorreta.');

      await users.updatePassword(usuarioId, await passwords.hash(novaSenha));
    },

    // Trocar o email de login: pede a senha atual (uma sessão aberta esquecida não basta para
    // tomar a conta) e avisa o endereço antigo, para a pessoa perceber se não foi ela.
    async changeEmail(usuarioId, senhaAtual, novoEmail) {
      const email = limparEmail(novoEmail);
      if (!senhaAtual || !email) throw badRequest('Preencha a senha atual e o novo email.');
      if (!emailValido(email)) throw badRequest('Informe um email válido.');

      const auth = await users.findAuthById(usuarioId);
      if (!auth) throw notFound('Usuário não encontrado.');
      if (limparEmail(auth.email) === email) throw badRequest('Esse já é o seu email.');
      // 400 e não 401: errar a senha não deve derrubar a sessão no navegador.
      const { ok } = await passwords.verify(senhaAtual, auth.senha);
      if (!ok) throw badRequest('A senha atual está incorreta.');
      if (await users.existsByEmail(email)) throw conflict('Já existe uma conta com esse email.');

      await users.updateEmail(usuarioId, email);
      if (mailer && auth.email) {
        try {
          await mailer.send({ to: auth.email, ...avisoTrocaDeEmail({ nome: auth.nome, novoEmail: email }) });
        } catch {
          // O aviso é um extra: o email já foi trocado.
        }
      }
      return { email };
    },

    async follow(seguidorId, seguidoId) {
      if (seguidorId === seguidoId) throw badRequest('Você não pode seguir a si mesmo.');
      await findOrFail(seguidoId);
      if (await haBloqueio(restricoes, seguidorId, seguidoId)) throw forbidden('Você não pode seguir essa pessoa.');
      if (await follows.isFollowing(seguidorId, seguidoId)) {
        throw conflict('Você já está seguindo este usuário');
      }

      await follows.follow(seguidorId, seguidoId);
      // Seguir e deixar de seguir em loop não pode virar uma chuva de avisos.
      if (!(await avisarUmaVez(`follow:${seguidorId}:${seguidoId}`))) return;
      await notifications.create({
        destinatarioId: seguidoId,
        autorId: seguidorId,
        tipo: 'new_follower',
        conteudo: 'seguiu você',
      });
    },

    async unfollow(seguidorId, seguidoId) {
      if (!(await follows.isFollowing(seguidorId, seguidoId))) {
        throw conflict('Você não está seguindo este usuário');
      }
      await follows.unfollow(seguidorId, seguidoId);
    },
  };
}
