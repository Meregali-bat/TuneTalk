-- Enquete de músicas: opções (2 a 4) e um voto por pessoa.
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "enquete_fim" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "enquete_opcoes" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "posicao" INTEGER NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "artista" VARCHAR(255),
    "capa" VARCHAR(500),
    "preview" VARCHAR(2000),

    CONSTRAINT "enquete_opcoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquete_votos" (
    "post_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "opcao_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquete_votos_pkey" PRIMARY KEY ("post_id","usuario_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enquete_opcoes_post_id_posicao_key" ON "enquete_opcoes"("post_id", "posicao");

-- CreateIndex
CREATE INDEX "enquete_votos_opcao_id_idx" ON "enquete_votos"("opcao_id");

-- AddForeignKey
ALTER TABLE "enquete_opcoes" ADD CONSTRAINT "enquete_opcoes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquete_votos" ADD CONSTRAINT "enquete_votos_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquete_votos" ADD CONSTRAINT "enquete_votos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquete_votos" ADD CONSTRAINT "enquete_votos_opcao_id_fkey" FOREIGN KEY ("opcao_id") REFERENCES "enquete_opcoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

