-- Comentários passam a ser posts com "parent_id" apontando para o post respondido.
-- Respostas podem não ter música, então a nota fica vazia nesses casos.

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "parent_id" INTEGER,
ALTER COLUMN "nota" DROP NOT NULL,
ALTER COLUMN "nota" DROP DEFAULT;

-- Copia cada comentário como resposta, na ordem em que foram feitos.
INSERT INTO "posts" ("texto", "nota", "created_at", "autor_id", "parent_id")
SELECT "texto", NULL, "created_at", "autor_id", "post_id"
FROM "comentarios"
ORDER BY "id";

-- DropForeignKey
ALTER TABLE "comentarios" DROP CONSTRAINT "comentarios_autor_id_fkey";

-- DropForeignKey
ALTER TABLE "comentarios" DROP CONSTRAINT "comentarios_post_id_fkey";

-- DropTable
DROP TABLE "comentarios";

-- CreateIndex
CREATE INDEX "posts_parent_id_idx" ON "posts"("parent_id");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
