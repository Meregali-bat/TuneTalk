import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { isValidNota, parseNota } from '../../../shared/rating.js';
import { extractMentions } from '../../../shared/mentions.js';
import { validarTrecho } from '../../../shared/lyrics.js';
import { capaDoDeezer } from '../../../shared/favorites.js';
import { validarEnquete } from '../../../shared/poll.js';

const TEXTO_MAX = 500;
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
    return list.map((post) => comVoto({ ...post, curtido: liked.has(post.id) }, votos));
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
    async forYou(viewerId) {
      // Os mais recentes primeiro: quem acabou de postar aparece no topo.
      return markLiked(await posts.listLatest(), viewerId);
    },

    async following(viewerId) {
      return markLiked(await posts.listFromFollowed(viewerId), viewerId);
    },

    async repliesByAuthor(autorId, viewerId) {
      return markLiked(await posts.listRepliesByAuthor(autorId), viewerId);
    },

    async byHashtag(tag, viewerId) {
      const limpa = (tag ?? '').trim().replace(/^#/, '').toLowerCase();
      if (!limpa) throw badRequest('Hashtag inválida.');
      return markLiked(await posts.listByHashtag(limpa), viewerId);
    },

    // O post fixado vem primeiro; os outros seguem do mais novo para o mais antigo.
    async byAuthor(autorId, viewerId) {
      const list = await posts.listByAuthor(autorId);
      return markLiked([...list.filter((p) => p.fixado), ...list.filter((p) => !p.fixado)], viewerId);
    },

    async get(postId, viewerId) {
      const post = await findOrFail(postId);
      const [curtido, pai, respostas, votos] = await Promise.all([
        likes.hasLiked(postId, viewerId),
        post.parentId ? posts.findById(post.parentId) : null,
        posts.listReplies(postId),
        post.enquete ? posts.votosDe(viewerId, [post.id]) : new Map(),
      ]);
      const primeiras = await posts.listFirstReplies(respostas.map((r) => r.id));
      const [paiMarcado = null] = pai ? await markLiked([pai], viewerId) : [];
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
      const id = await posts.create({ ...data, ...(pai && { parentId }), ...(enquete && { enquete }), autorId, data: now() });
      if (pai) await notifyAuthor(pai, autorId, 'comment', 'comentou no seu post');
      await notifyMentions(data.texto, { id, autorId, pai });
      return id;
    },

    // Votar numa opção da enquete: um voto por pessoa, só enquanto ela está aberta.
    async votar(postId, usuarioId, opcaoId) {
      const post = await findOrFail(postId);
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
