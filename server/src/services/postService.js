import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { isValidNota, parseNota } from '../../../shared/rating.js';
import { extractMentions } from '../../../shared/mentions.js';
import { validarTrecho } from '../../../shared/lyrics.js';
import { capaDoDeezer } from '../../../shared/favorites.js';
import { validarEnquete } from '../../../shared/poll.js';
import { SEM_RESTRICOES, haBloqueio } from './restricaoService.js';
import { chaveObra } from '../../../shared/obra.js';

const TEXTO_MAX = 500;
// Ao chegar a esse número de posts (sem contar comentários), o TuneTalk dá os parabéns.
export const MARCO_POSTS = 100;
const MAX_MARCACOES = 10;

const CREATE_FIELDS = [
  'texto', 'musicName', 'artistName', 'posterMusica', 'albumName',
  'posterAlbum', 'postType', 'releaseDate', 'nota', 'musicPreview', 'imagemUrl', 'imagemProporcao',
];

// Proporção largura/altura da imagem cortada: de bem alta (1:5) a bem larga (5:1).
const parseProporcao = (value, temImagem) => {
  if (value === undefined || value === null) return undefined;
  const proporcao = Number(value);
  if (!temImagem || !Number.isFinite(proporcao) || proporcao < 0.2 || proporcao > 5) {
    throw badRequest('Proporção da imagem inválida.');
  }
  return proporcao;
};

// Página seguinte do feed: a data e o id do último post já mostrado (os dois ou nenhum).
const lerPagina = ({ antes, antesId } = {}) => {
  if (antes === undefined && antesId === undefined) return {};
  const data = new Date(antes);
  const id = Number(antesId);
  if (typeof antes !== 'string' || Number.isNaN(data.getTime()) || !Number.isInteger(id) || id <= 0) {
    throw badRequest('Página do feed inválida.');
  }
  return { antes: { data, id } };
};

const OBRA_TEXTO_MAX = 255;

// Álbum ou música pedida na URL: tipo e os nomes como aparecem nos posts.
const lerObra = ({ tipo, titulo, artista } = {}) => {
  const limpo = (valor) => (typeof valor === 'string' ? valor.trim() : '');
  const obra = { tipo, titulo: limpo(titulo), artista: limpo(artista) };
  if (!['album', 'musica'].includes(tipo) || !obra.titulo || !obra.artista
    || obra.titulo.length > OBRA_TEXTO_MAX || obra.artista.length > OBRA_TEXTO_MAX) {
    throw badRequest('Álbum ou música inválido.');
  }
  return obra;
};

// Uma nota por pessoa (a mais recente): postar de novo sobre o mesmo disco atualiza a avaliação.
function resumirNotas(notas) {
  const porPessoa = new Map();
  for (const { autorId, nota } of notas) if (!porPessoa.has(autorId)) porPessoa.set(autorId, nota);
  const valores = [...porPessoa.values()];
  const distribuicao = Array.from({ length: 11 }, (_, nota) => valores.filter((v) => v === nota).length);
  const media = valores.length ? valores.reduce((soma, v) => soma + v, 0) / valores.length : null;
  return { media, avaliacoes: valores.length, distribuicao };
}

const pick = (source, fields) =>
  Object.fromEntries(fields.filter((f) => source[f] !== undefined).map((f) => [f, source[f]]));

const parseParentId = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Post respondido inválido.');
  return id;
};

export function createPostService({
  posts,
  likes,
  notifications,
  users,
  // Bloqueios e silêncios: some com os posts de quem a pessoa não vê e barra interações.
  restricoes = SEM_RESTRICOES,
  // Lista "Quero ouvir": marca nos posts o que a pessoa guardou e tira da lista ao avaliar.
  queroOuvir = null,
  now = () => new Date(),
  // Capas das opções de enquete: no app real, só do Deezer; a demo troca pelas capas desenhadas dela.
  capaEnqueteValida = capaDoDeezer,
}) {
  // Enquete com o voto de quem está vendo (null se não votou).
  const comVoto = (post, votos) => (post.enquete
    ? { ...post, enquete: { ...post.enquete, meuVoto: votos.get(post.id) ?? null } }
    : post);

  const markLiked = async (list, viewerId) => {
    const comEnquete = list.filter((post) => post.enquete).map((post) => post.id);
    const [liked, votos] = await Promise.all([
      likes.likedPostIds(viewerId).then((ids) => new Set(ids)),
      comEnquete.length ? posts.votosDe(viewerId, comEnquete) : new Map(),
    ]);
    const salvos = queroOuvir && list.some((post) => post.titulo) ? await queroOuvir.chaves(viewerId) : null;
    return list.map((post) => comVoto({
      ...post,
      curtido: liked.has(post.id),
      ...(salvos && post.titulo && { queroOuvir: salvos.has(chaveObra(post)) }),
    }, votos));
  };

  const ocultosPara = (viewerId) => restricoes.ocultosPara(viewerId);

  // Curtir, comentar e votar não valem entre quem se bloqueou.
  const podeInteragir = async (post, usuarioId) => {
    if (await haBloqueio(restricoes, usuarioId, post.autor.id)) {
      throw forbidden('Você não pode interagir com os posts dessa pessoa.');
    }
  };

  const findOrFail = async (postId) => {
    const post = await posts.findById(postId);
    if (!post) throw notFound('Post não encontrado.');
    return post;
  };

  const notifyAuthor = async (post, autorId, tipo, conteudo) => {
    if (post.autor.id === autorId) return;
    await notifications.create({ destinatarioId: post.autor.id, autorId, tipo, conteudo, postId: post.id });
  };

  // Parabéns no 100º post. Só uma vez: apagar e postar de novo não repete o aviso.
  const celebrarMarco = async (autorId, postId) => {
    if ((await posts.countByAuthor(autorId)) !== MARCO_POSTS) return;
    if (await notifications.exists(autorId, 'marco_posts')) return;
    await notifications.create({
      destinatarioId: autorId,
      autorId,
      tipo: 'marco_posts',
      conteudo: `Parabéns pelo seu ${MARCO_POSTS}º post! Obrigado por fazer o TuneTalk acontecer.`,
      postId,
    });
  };

  // Quem foi marcado com @ recebe aviso; o autor do post respondido já recebe o de comentário.
  const notifyMentions = async (texto, { id, autorId, pai }) => {
    const nomes = extractMentions(texto ?? '').slice(0, MAX_MARCACOES);
    if (nomes.length === 0) return;
    const marcados = (await users.findByNames(nomes))
      .filter((u) => u.id !== autorId && u.id !== pai?.autor.id);
    for (const marcado of marcados) {
      await notifications.create({
        destinatarioId: marcado.id,
        autorId,
        tipo: 'mention',
        conteudo: pai ? 'marcou você em um comentário' : 'marcou você em um post',
        postId: id,
      });
    }
  };

  return {
    // Os mais recentes primeiro: quem acabou de postar aparece no topo. `pagina` traz o último
    // post já carregado ({ antes, antesId }) para continuar dali; sem ela, vem a primeira página.
    async forYou(viewerId, pagina) {
      const ocultos = await ocultosPara(viewerId);
      return markLiked(await posts.listLatest({ ...lerPagina(pagina), ocultos }), viewerId);
    },

    async following(viewerId, pagina) {
      const ocultos = await ocultosPara(viewerId);
      return markLiked(await posts.listFromFollowed(viewerId, { ...lerPagina(pagina), ocultos }), viewerId);
    },

    // Página de um álbum ou música: dados da obra, média das notas (uma por pessoa), quantas
    // notas de cada valor e os posts sobre ela, em páginas como os feeds.
    async obra(viewerId, consulta, pagina) {
      const obra = lerObra(consulta);
      const seguinte = lerPagina(pagina);
      const ocultos = await ocultosPara(viewerId);
      // Páginas seguintes só trazem mais posts; o resumo já veio com a primeira.
      if (seguinte.antes) return { posts: await markLiked(await posts.listByObra(obra, { ...seguinte, ocultos }), viewerId) };

      // A média conta todo mundo; só a lista de posts esconde quem a pessoa não vê.
      // Nome, capa e prévia vêm do post mais recente de qualquer pessoa.
      const [lista, notas, [base]] = await Promise.all([
        posts.listByObra(obra, { ocultos }),
        posts.notasDaObra(obra),
        posts.listByObra(obra, { limit: 1 }),
      ]);
      if (!base) throw notFound('Ninguém postou sobre isso ainda.');
      return {
        obra: {
          tipo: obra.tipo,
          titulo: base.titulo,
          artista: base.artista,
          capa: base.capa,
          releaseDate: base.releaseDate,
          preview: base.preview,
        },
        // Está na lista "Quero ouvir" de quem vê?
        naLista: queroOuvir ? (await queroOuvir.chaves(viewerId)).has(chaveObra(obra)) : false,
        ...resumirNotas(notas),
        posts: await markLiked(lista, viewerId),
      };
    },

    async repliesByAuthor(autorId, viewerId) {
      if (await haBloqueio(restricoes, viewerId, autorId)) return [];
      return markLiked(await posts.listRepliesByAuthor(autorId), viewerId);
    },

    async byHashtag(tag, viewerId) {
      const limpa = (tag ?? '').trim().replace(/^#/, '').toLowerCase();
      if (!limpa) throw badRequest('Hashtag inválida.');
      const ocultos = await ocultosPara(viewerId);
      return markLiked(await posts.listByHashtag(limpa, { ocultos }), viewerId);
    },

    // O post fixado vem primeiro; os outros seguem do mais novo para o mais antigo.
    async byAuthor(autorId, viewerId) {
      const list = await posts.listByAuthor(autorId);
      return markLiked([...list.filter((p) => p.fixado), ...list.filter((p) => !p.fixado)], viewerId);
    },

    async get(postId, viewerId) {
      const post = await findOrFail(postId);
      const ocultos = await ocultosPara(viewerId);
      // Post de quem bloqueou (ou foi bloqueado por) quem está vendo: como se não existisse.
      if (await haBloqueio(restricoes, viewerId, post.autor.id)) throw notFound('Post não encontrado.');
      const [curtido, pai, respostas, votos] = await Promise.all([
        likes.hasLiked(postId, viewerId),
        post.parentId ? posts.findById(post.parentId) : null,
        posts.listReplies(postId, { ocultos }),
        post.enquete ? posts.votosDe(viewerId, [post.id]) : new Map(),
      ]);
      const primeiras = await posts.listFirstReplies(respostas.map((r) => r.id), { ocultos });
      const paiVisivel = pai && !ocultos.includes(pai.autor.id) ? pai : null;
      const [paiMarcado = null] = paiVisivel ? await markLiked([paiVisivel], viewerId) : [];
      const primeirasMarcadas = new Map(
        (await markLiked([...primeiras.values()], viewerId)).map((p) => [p.parentId, p]),
      );
      return {
        post: comVoto({ ...post, curtido }, votos),
        pai: paiMarcado,
        respostas: (await markLiked(respostas, viewerId)).map((r) => ({
          ...r,
          primeiraResposta: primeirasMarcadas.get(r.id) ?? null,
        })),
      };
    },

    // Serve para posts e respostas (com parentId). Música e imagem são opcionais; com música, a nota é obrigatória.
    async create(autorId, body) {
      const data = pick(body, CREATE_FIELDS);
      if (data.texto !== undefined) data.texto = String(data.texto).trim();
      const parentId = parseParentId(body.parentId);
      const imagemProporcao = parseProporcao(data.imagemProporcao, Boolean(data.imagemUrl));
      if (imagemProporcao !== undefined) data.imagemProporcao = imagemProporcao;
      const hasMusic = Boolean(data.musicName || data.albumName);

      // Trecho da letra: só com uma música (álbum não tem letra única), até 4 versos.
      const trecho = validarTrecho(body.trechoLetra);
      if (trecho.erro) throw badRequest(trecho.erro);
      if (trecho.versos && !data.musicName) throw badRequest('Escolha uma música para postar um trecho da letra.');
      if (trecho.versos) data.trechoLetra = trecho.versos;

      // Enquete: combina com texto e imagem; não vai com música avaliada nem em comentário.
      let enquete = null;
      if (body.enquete !== undefined && body.enquete !== null) {
        if (parentId !== undefined) throw badRequest('Comentário não pode ter enquete.');
        if (hasMusic) throw badRequest('Post com enquete não pode ter música avaliada.');
        const validada = validarEnquete(body.enquete, { capaValida: capaEnqueteValida });
        if (validada.erro) throw badRequest(validada.erro);
        const fim = new Date(now().getTime() + validada.enquete.duracaoDias * 24 * 60 * 60 * 1000);
        enquete = { opcoes: validada.enquete.opcoes, fim };
      }

      if (hasMusic) {
        const nota = parseNota(data.nota);
        if (nota === null) throw badRequest('Dê uma nota de 0 a 5 estrelas.');
        if (!isValidNota(nota)) throw badRequest('A nota vai de 0 a 5 estrelas, de meia em meia.');
        data.nota = nota;
      } else {
        if (!data.texto && !data.imagemUrl && !enquete) throw badRequest('Escreva algo, escolha uma música ou adicione uma imagem.');
        data.nota = null;
      }
      if ((data.texto ?? '').length > TEXTO_MAX) throw badRequest(`O texto pode ter no máximo ${TEXTO_MAX} caracteres.`);

      const pai = parentId === undefined ? null : await findOrFail(parentId);
      if (pai) await podeInteragir(pai, autorId);
      const id = await posts.create({ ...data, ...(pai && { parentId }), ...(enquete && { enquete }), autorId, data: now() });
      if (pai) await notifyAuthor(pai, autorId, 'comment', 'comentou no seu post');
      await notifyMentions(data.texto, { id, autorId, pai });
      if (!pai) await celebrarMarco(autorId, id);
      // Avaliou um disco que estava no "Quero ouvir": já ouviu, sai da lista.
      if (hasMusic && !pai && queroOuvir) {
        const tipo = data.postType === 'album' ? 'album' : 'musica';
        const titulo = tipo === 'album' ? data.albumName : data.musicName;
        await queroOuvir.remover(autorId, chaveObra({ tipo, titulo, artista: data.artistName }));
      }
      return id;
    },

    // Votar numa opção da enquete: um voto por pessoa, só enquanto ela está aberta.
    async votar(postId, usuarioId, opcaoId) {
      const post = await findOrFail(postId);
      await podeInteragir(post, usuarioId);
      if (!post.enquete) throw badRequest('Esse post não tem enquete.');
      if (new Date(post.enquete.fim).getTime() <= now().getTime()) throw badRequest('Essa enquete já terminou.');
      const opcao = Number(opcaoId);
      if (!post.enquete.opcoes.some((o) => o.id === opcao)) throw badRequest('Opção inválida.');
      if (!(await posts.votar(postId, usuarioId, opcao))) throw conflict('Você já votou nessa enquete.');
      // Quem postou fica sabendo do voto (votar na própria enquete não avisa).
      await notifyAuthor(post, usuarioId, 'voto_enquete', 'votou na sua enquete');
      const atualizado = await posts.findById(postId);
      return { ...atualizado.enquete, meuVoto: opcao };
    },

    async remove(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (post.autor.id !== usuarioId) throw forbidden('Você só pode apagar seus próprios posts.');
      await posts.remove(postId);
    },

    async pin(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (post.autor.id !== usuarioId) throw forbidden('Você só pode fixar seus próprios posts.');
      if (post.parentId) throw badRequest('Só dá para fixar posts, não comentários.');
      await users.setPinnedPost(usuarioId, postId);
    },

    async unpin(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (post.autor.id !== usuarioId) throw forbidden('Você só pode desafixar seus próprios posts.');
      if (post.fixado) await users.setPinnedPost(usuarioId, null);
    },

    async like(postId, usuarioId) {
      const post = await findOrFail(postId);
      await podeInteragir(post, usuarioId);
      if (await likes.hasLiked(postId, usuarioId)) return post.likes;

      await likes.add({ postId, usuarioId });
      await notifyAuthor(post, usuarioId, 'like', 'curtiu seu post');
      return likes.countByPost(postId);
    },

    async unlike(postId, usuarioId) {
      const post = await findOrFail(postId);
      if (!(await likes.hasLiked(postId, usuarioId))) return post.likes;

      await likes.remove(postId, usuarioId);
      await notifications.removeLike(postId, usuarioId);
      return likes.countByPost(postId);
    },
  };
}
