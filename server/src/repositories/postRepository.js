import { hasHashtag } from '../../../shared/mentions.js';
import { FEED_PAGINA } from '../../../shared/feed.js';

const POST_INCLUDE = {
  autor: { select: { id: true, nome: true, nomeExibicao: true, fotoPerfil: true, postFixadoId: true, fundadorDesde: true, mostrarSeloFundador: true } },
  _count: { select: { respostas: true, curtidas: true } },
  opcoesEnquete: {
    orderBy: { posicao: 'asc' },
    select: { id: true, titulo: true, artista: true, capa: true, preview: true, _count: { select: { votos: true } } },
  },
};

// Enquete no formato da API (o voto de quem está vendo é marcado depois, no serviço).
function toEnquete(row) {
  if (!row.enqueteFim) return null;
  const opcoes = (row.opcoesEnquete ?? []).map(({ _count, ...opcao }) => ({ ...opcao, votos: _count?.votos ?? 0 }));
  const fim = new Date(row.enqueteFim);
  return {
    fim: fim.toISOString(),
    encerrada: fim.getTime() <= Date.now(),
    total: opcoes.reduce((soma, o) => soma + o.votos, 0),
    opcoes,
  };
}

// Feeds e perfis mostram só posts principais; respostas aparecem dentro do post pai.
const TOP_LEVEL = { parentId: null };

// Feeds paginados do mais novo para o mais antigo. `antes` é o último post da página anterior
// ({ data, id }); compara pela data e, no empate, pelo id, para não pular nem repetir posts.
const FEED_ORDEM = [{ createdAt: 'desc' }, { id: 'desc' }];
const depoisDe = (antes) => (antes
  ? { OR: [{ createdAt: { lt: antes.data } }, { createdAt: antes.data, id: { lt: antes.id } }] }
  : {});

// Posts sobre um álbum ou uma música: mesmo título e artista, sem diferenciar maiúsculas.
// (Os posts não guardam o id do Deezer, então é assim que dá para juntar as avaliações.)
const ondeObra = ({ tipo, titulo, artista }) => ({
  ...TOP_LEVEL,
  artistName: { equals: artista, mode: 'insensitive' },
  ...(tipo === 'album'
    ? { postType: 'album', albumName: { equals: titulo, mode: 'insensitive' } }
    // Música: tudo que não é álbum (posts antigos têm o tipo vazio).
    : { musicName: { equals: titulo, mode: 'insensitive' }, OR: [{ postType: null }, { postType: { not: 'album' } }] }),
});

// Sem os posts de quem a pessoa não vê (silenciou, bloqueou ou a bloqueou).
const semOcultos = (ocultos) => (ocultos?.length ? { autorId: { notIn: ocultos } } : {});

const normalizeType = (postType) => (postType === 'album' ? 'album' : 'música');

const toNota = (nota) => {
  if (nota === null || nota === undefined) return null;
  const value = Number(nota);
  return Number.isFinite(value) ? value : null;
};

export function toPost(row) {
  const hasMusic = Boolean(row.musicName || row.albumName);
  const tipo = hasMusic ? normalizeType(row.postType) : null;
  const isAlbum = tipo === 'album';
  return {
    id: row.id,
    parentId: row.parentId ?? null,
    citadoId: row.citadoId ?? null,
    texto: row.texto,
    likes: row._count.curtidas,
    nota: row.nota ?? null,
    data: row.createdAt.toISOString(),
    quantidadeComentarios: row._count.respostas,
    tipo,
    titulo: isAlbum ? row.albumName : row.musicName,
    artista: row.artistName,
    capa: isAlbum ? row.posterAlbum : row.posterMusica,
    releaseDate: row.releaseDate,
    preview: row.musicPreview ?? null,
    imagem: row.imagemUrl ?? null,
    imagemProporcao: row.imagemProporcao ?? null,
    trechoLetra: row.trechoLetra ? row.trechoLetra.split('\n') : null,
    enquete: toEnquete(row),
    fixado: row.autor.postFixadoId === row.id,
    autor: {
      id: row.autor.id,
      nome: row.autor.nome,
      nomeExibicao: row.autor.nomeExibicao ?? null,
      fotoPerfil: row.autor.fotoPerfil,
      fundador: Boolean(row.autor.fundadorDesde) && row.autor.mostrarSeloFundador !== false,
    },
  };
}

export function createPostRepository(prisma) {
  const findPosts = async (args) => (await prisma.post.findMany({ ...args, include: POST_INCLUDE })).map(toPost);

  return {
    listLatest({ limit = FEED_PAGINA, antes, ocultos } = {}) {
      return findPosts({ where: { ...TOP_LEVEL, ...depoisDe(antes), ...semOcultos(ocultos) }, orderBy: FEED_ORDEM, take: limit });
    },

    listByAuthor(autorId) {
      return findPosts({ where: { ...TOP_LEVEL, autorId }, orderBy: { id: 'desc' } });
    },

    listFromFollowed(usuarioId, { limit = FEED_PAGINA, antes, ocultos } = {}) {
      return findPosts({
        where: { ...TOP_LEVEL, ...depoisDe(antes), ...semOcultos(ocultos), autor: { seguidores: { some: { seguidorId: usuarioId } } } },
        orderBy: FEED_ORDEM,
        take: limit,
      });
    },

    // Só os textos com "#" (para contar hashtags em alta ou buscar uma), dos mais novos.
    async listHashtagTexts({ desde, contem, limite }) {
      const rows = await prisma.post.findMany({
        where: {
          texto: { contains: contem ? `#${contem}` : '#', mode: 'insensitive' },
          ...(desde && { createdAt: { gte: desde } }),
        },
        select: { texto: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limite,
      });
      return rows.map((row) => row.texto);
    },

    listByObra(obra, { limit = FEED_PAGINA, antes, ocultos } = {}) {
      return findPosts({ where: { AND: [ondeObra(obra), depoisDe(antes), semOcultos(ocultos)] }, orderBy: FEED_ORDEM, take: limit });
    },

    // Todas as notas dadas a um álbum ou música, das mais novas para as mais antigas.
    async notasDaObra(obra) {
      const rows = await prisma.post.findMany({
        where: { ...ondeObra(obra), nota: { not: null } },
        orderBy: FEED_ORDEM,
        select: { autorId: true, nota: true },
      });
      return rows;
    },

    // Comentários de alguém (aba "Comentários" do perfil), com quem cada um respondeu.
    async listRepliesByAuthor(autorId, limit = 50) {
      const rows = await prisma.post.findMany({
        where: { autorId, parentId: { not: null } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        include: { ...POST_INCLUDE, pai: { select: { id: true, autor: { select: { nome: true } } } } },
      });
      return rows.map((row) => ({ ...toPost(row), respondendoA: { postId: row.pai.id, nome: row.pai.autor.nome } }));
    },

    // Posts e comentários com a hashtag inteira (o banco filtra por "contém"; aqui conferimos a tag).
    async listByHashtag(tag, { limit = 50, ocultos } = {}) {
      const candidatos = await findPosts({
        where: { texto: { contains: `#${tag}`, mode: 'insensitive' }, ...semOcultos(ocultos) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit * 2,
      });
      return candidatos.filter((p) => hasHashtag(p.texto, tag)).slice(0, limit);
    },

    // Em ordem de conversa: a primeira resposta fica no topo.
    listReplies(parentId, { ocultos } = {}) {
      return findPosts({ where: { parentId, ...semOcultos(ocultos) }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    },

    // Primeira resposta de cada comentário (a mais antiga), para mostrar a conversa como no Twitter.
    async listFirstReplies(parentIds, { ocultos } = {}) {
      if (parentIds.length === 0) return new Map();
      const rows = await findPosts({
        where: { parentId: { in: parentIds }, ...semOcultos(ocultos) },
        orderBy: [{ parentId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        distinct: ['parentId'],
      });
      return new Map(rows.map((post) => [post.parentId, post]));
    },

    // Posts principais da pessoa (comentários não contam).
    countByAuthor(autorId) {
      return prisma.post.count({ where: { ...TOP_LEVEL, autorId } });
    },

    async findById(id) {
      const row = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
      return row ? toPost(row) : null;
    },

    // Posts citados de uma lista: Map id → post (os apagados não vêm).
    async findByIds(ids) {
      if (ids.length === 0) return new Map();
      return new Map((await findPosts({ where: { id: { in: ids } } })).map((post) => [post.id, post]));
    },

    async create(post) {
      const created = await prisma.post.create({
        data: {
          autorId: post.autorId,
          parentId: post.parentId ?? null,
          citadoId: post.citadoId ?? null,
          texto: post.texto ?? '',
          musicName: post.musicName ?? null,
          artistName: post.artistName ?? null,
          posterMusica: post.posterMusica ?? null,
          albumName: post.albumName ?? null,
          posterAlbum: post.posterAlbum ?? null,
          postType: post.postType ?? null,
          releaseDate: post.releaseDate == null ? null : String(post.releaseDate),
          nota: toNota(post.nota),
          musicPreview: post.musicPreview ?? null,
          imagemUrl: post.imagemUrl ?? null,
          imagemProporcao: post.imagemProporcao ?? null,
          trechoLetra: post.trechoLetra?.length ? post.trechoLetra.join('\n') : null,
          createdAt: post.data,
          ...(post.enquete && {
            enqueteFim: post.enquete.fim,
            opcoesEnquete: { create: post.enquete.opcoes.map((opcao, posicao) => ({ ...opcao, posicao })) },
          }),
        },
        select: { id: true },
      });
      return created.id;
    },

    // Um voto por pessoa: votar de novo na mesma enquete devolve false.
    async votar(postId, usuarioId, opcaoId) {
      try {
        await prisma.enqueteVoto.create({ data: { postId, usuarioId, opcaoId } });
        return true;
      } catch (err) {
        if (err?.code === 'P2002') return false;
        throw err;
      }
    },

    // Em quais enquetes (dentre esses posts) a pessoa votou, e em qual opção: Map postId → opcaoId.
    async votosDe(usuarioId, postIds) {
      if (!usuarioId || postIds.length === 0) return new Map();
      const votos = await prisma.enqueteVoto.findMany({
        where: { usuarioId, postId: { in: postIds } },
        select: { postId: true, opcaoId: true },
      });
      return new Map(votos.map((v) => [v.postId, v.opcaoId]));
    },

    // Respostas (e as respostas delas), curtidas e notificações são apagadas em cascata pelo banco.
    async remove(id) {
      await prisma.post.delete({ where: { id } });
    },
  };
}
