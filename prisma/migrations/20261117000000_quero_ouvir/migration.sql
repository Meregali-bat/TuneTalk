-- Lista "Quero ouvir".
-- CreateTable
CREATE TABLE "quero_ouvir" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "artista" VARCHAR(255) NOT NULL,
    "capa" VARCHAR(500),
    "release_date" VARCHAR(20),
    "preview" VARCHAR(2000),
    "chave" VARCHAR(530) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quero_ouvir_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quero_ouvir_usuario_id_chave_key" ON "quero_ouvir"("usuario_id", "chave");

-- AddForeignKey
ALTER TABLE "quero_ouvir" ADD CONSTRAINT "quero_ouvir_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

