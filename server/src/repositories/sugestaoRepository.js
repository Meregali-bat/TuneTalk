import { PUBLIC_USER_SELECT } from './userRepository.js';

// Consultas das sugestões de quem seguir.
export function createSugestaoRepository(prisma) {
  return {
    // Quem avaliou os mesmos discos que `usuarioId`: quantos em comum e a diferença média das
    // notas (0 a 10). Vale a nota mais recente de cada pessoa para cada disco; o disco é
    // tipo + título + artista em minúsculas, como na página do disco.
    async parecidos(usuarioId) {
      const rows = await prisma.$queryRaw`
        WITH avaliacoes AS (
          SELECT DISTINCT ON (autor_id, chave) autor_id, chave, nota
          FROM (
            SELECT autor_id, nota, created_at, id,
              CASE WHEN post_type = 'album'
                THEN 'album|' || lower(trim(album_name))
                ELSE 'musica|' || lower(trim(music_name))
              END || '|' || lower(trim(artist_name)) AS chave
            FROM posts
            WHERE parent_id IS NULL AND nota IS NOT NULL AND artist_name IS NOT NULL
              AND (CASE WHEN post_type = 'album' THEN album_name ELSE music_name END) IS NOT NULL
          ) p
          ORDER BY autor_id, chave, created_at DESC, id DESC
        )
        SELECT outras.autor_id AS "autorId",
          COUNT(*)::int AS "emComum",
          AVG(ABS(outras.nota - minhas.nota))::float AS "diferenca"
        FROM avaliacoes minhas
        JOIN avaliacoes outras ON outras.chave = minhas.chave AND outras.autor_id <> minhas.autor_id
        WHERE minhas.autor_id = ${usuarioId}
        GROUP BY outras.autor_id`;
      return rows;
    },

    // Quem mais postou (desde `desde`, ou de sempre), para quem ainda não avaliou nada.
    async ativos({ desde = null, limite }) {
      const rows = await prisma.post.groupBy({
        by: ['autorId'],
        where: { parentId: null, ...(desde && { createdAt: { gte: desde } }) },
        _count: { _all: true },
        orderBy: { _count: { autorId: 'desc' } },
        take: limite,
      });
      return rows.map((row) => ({ autorId: row.autorId, posts: row._count._all }));
    },

    // Só contas que já escolheram o nome de usuário.
    usuarios(ids) {
      if (ids.length === 0) return Promise.resolve([]);
      return prisma.usuario.findMany({ where: { id: { in: ids }, nome: { not: null } }, select: PUBLIC_USER_SELECT });
    },
  };
}
