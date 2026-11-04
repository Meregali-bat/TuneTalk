-- Citar um post (repostar com comentário). Sem chave estrangeira de propósito: se o post citado
-- for apagado, a citação continua e mostra "post indisponível" no lugar dele.
-- AlterTable
ALTER TABLE "posts" ADD COLUMN "citado_id" INTEGER;

-- CreateIndex
CREATE INDEX "posts_citado_id_idx" ON "posts"("citado_id");

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'citacao';
