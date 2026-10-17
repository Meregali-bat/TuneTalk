// Tabelas com id autoincremento: depois de inserir ids explícitos, a sequência precisa
// apontar para o maior id, senão o próximo INSERT colidiria com um registro migrado.
const SERIAL_TABLES = ['usuarios', 'posts', 'notificacoes'];

export async function loadIntoDatabase(prisma, data) {
  if ((await prisma.usuario.count()) > 0) {
    throw new Error('O banco de destino não está vazio. Rode a migração em um banco recém-criado.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.createMany({ data: data.usuarios });
    await tx.post.createMany({ data: data.posts });
    await tx.post.createMany({ data: data.respostas });
    await tx.curtida.createMany({ data: data.curtidas });
    await tx.seguimento.createMany({ data: data.seguimentos });
    await tx.notificacao.createMany({ data: data.notificacoes });

    for (const table of SERIAL_TABLES) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}"`,
      );
    }
  });
}
