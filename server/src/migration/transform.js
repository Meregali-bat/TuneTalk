// Converte as tabelas do banco MySQL antigo para o modelo do Prisma, preservando os ids
// e descartando (com motivo) registros que apontam para dados inexistentes.

const TIPOS_NOTIFICACAO = new Set(['like', 'comment', 'new_follower']);

// Datas do MySQL vêm como 'YYYY-MM-DD HH:MM:SS' sem fuso; o dump foi gerado em UTC.
const toDate = (value) => (value ? new Date(`${value.replace(' ', 'T')}Z`) : new Date());

const rowsOf = (tables, name) => tables[name]?.rows ?? [];

export function transformLegacyData(tables) {
  const skipped = [];
  const adjusted = [];
  const skip = (tabela, id, motivo) => skipped.push({ tabela, id, motivo });

  const usuarios = [];
  const emails = new Map();
  const nomes = new Set();
  for (const row of rowsOf(tables, 'usuario')) {
    const email = row.email.trim().toLowerCase();
    if (emails.has(email)) {
      skip('usuario', row.idusuario, `email duplicado (já usado pelo usuário ${emails.get(email)})`);
      continue;
    }
    emails.set(email, row.idusuario);
    // O nome passou a ser único: quem repete um nome anterior fica sem nome e escolhe outro ao entrar.
    let nome = row.nome;
    if (nomes.has(nome.trim().toLowerCase())) {
      adjusted.push({ tabela: 'usuario', id: row.idusuario, motivo: `nome "${nome}" repetido; vai escolher outro no próximo login` });
      nome = null;
    } else {
      nomes.add(nome.trim().toLowerCase());
    }
    usuarios.push({
      id: row.idusuario,
      nome,
      email: row.email.trim(),
      senha: row.senha,
      fotoPerfil: row.fotoPerfil,
      bio: row.bio,
      admin: row.admin === 1,
    });
  }
  const userIds = new Set(usuarios.map((u) => u.id));

  const posts = [];
  for (const row of rowsOf(tables, 'post')) {
    if (!userIds.has(row.usuario_idusuario)) {
      skip('post', row.idpost, `autor ${row.usuario_idusuario} não existe`);
      continue;
    }
    posts.push({
      id: row.idpost,
      autorId: row.usuario_idusuario,
      texto: row.texto,
      musicName: row.musicName,
      artistName: row.artistName,
      posterMusica: row.posterMusica,
      albumName: row.albumName,
      posterAlbum: row.posterAlbum,
      postType: row.postType,
      releaseDate: row.releaseDate == null ? null : String(row.releaseDate),
      // A nota antiga ia de 0 a 5 estrelas; a nova vai de 0 a 10 (meia estrela por ponto).
      nota: Math.min(10, Math.max(0, Math.round((row.nota ?? 0) * 2))),
      musicPreview: row.musicPreview,
      createdAt: toDate(row.data),
    });
  }
  const postsById = new Map(posts.map((p) => [p.id, p]));

  // Retorna o motivo para descartar, ou null se as referências existem.
  const missing = (refs) => {
    for (const [kind, id] of refs) {
      if (kind === 'post' && !postsById.has(id)) return `post ${id} não existe`;
      if (kind === 'usuario' && !userIds.has(id)) return `usuário ${id} não existe`;
    }
    return null;
  };

  // Comentários viram respostas (posts com pai). Os ids continuam depois do maior id de post.
  const respostas = [];
  let nextPostId = Math.max(0, ...posts.map((p) => p.id));
  const comentariosEmOrdem = [...rowsOf(tables, 'comentarios')].sort((a, b) => a.idcomentarios - b.idcomentarios);
  for (const row of comentariosEmOrdem) {
    const motivo = missing([['post', row.post_idpost], ['usuario', row.usuario_idusuario]]);
    if (motivo) { skip('comentarios', row.idcomentarios, motivo); continue; }
    nextPostId += 1;
    respostas.push({
      id: nextPostId,
      parentId: row.post_idpost,
      autorId: row.usuario_idusuario,
      texto: row.texto,
      nota: null,
      // O banco antigo não guardava a data do comentário; usamos a do post.
      createdAt: postsById.get(row.post_idpost).createdAt,
    });
  }

  const curtidas = [];
  const likeKeys = new Set();
  for (const row of rowsOf(tables, 'curtir')) {
    const key = `${row.post_idpost}/${row.usuario_idusuario}`;
    const motivo = missing([['post', row.post_idpost], ['usuario', row.usuario_idusuario]]);
    if (motivo) { skip('curtir', key, motivo); continue; }
    if (likeKeys.has(key)) continue;
    likeKeys.add(key);
    curtidas.push({ postId: row.post_idpost, usuarioId: row.usuario_idusuario });
  }

  const seguimentos = [];
  const followKeys = new Set();
  for (const row of rowsOf(tables, 'seguir')) {
    const key = `${row.usuario_idusuario}/${row.usuario_idusuario1}`;
    const motivo = missing([['usuario', row.usuario_idusuario], ['usuario', row.usuario_idusuario1]]);
    if (motivo) { skip('seguir', key, motivo); continue; }
    if (followKeys.has(key)) continue;
    followKeys.add(key);
    seguimentos.push({ seguidorId: row.usuario_idusuario, seguidoId: row.usuario_idusuario1 });
  }

  const notificacoes = [];
  for (const row of rowsOf(tables, 'notificacoes')) {
    if (!TIPOS_NOTIFICACAO.has(row.tipo)) {
      skip('notificacoes', row.idnotificacoes, `tipo "${row.tipo}" inválido`);
      continue;
    }
    // Notificações de novo seguidor usavam post_id = 0.
    const postId = row.tipo === 'new_follower' || !row.post_id ? null : row.post_id;
    const refs = [['usuario', row.usuario_idusuario], ['usuario', row.usuario_idusuario1]];
    if (postId !== null) refs.push(['post', postId]);
    const motivo = missing(refs);
    if (motivo) { skip('notificacoes', row.idnotificacoes, motivo); continue; }
    notificacoes.push({
      id: row.idnotificacoes,
      destinatarioId: row.usuario_idusuario,
      autorId: row.usuario_idusuario1,
      tipo: row.tipo,
      conteudo: row.conteudo,
      lida: row.lida === 1,
      postId,
      createdAt: toDate(row.data),
    });
  }

  const data = { usuarios, posts, respostas, curtidas, seguimentos, notificacoes };
  const imported = Object.fromEntries(Object.entries(data).map(([name, list]) => [name, list.length]));
  return { data, report: { imported, skipped, adjusted } };
}
