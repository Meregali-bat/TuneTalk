-- Aparelhos inscritos para receber avisos (push da web).
-- CreateTable
CREATE TABLE "inscricoes_push" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "endpoint" VARCHAR(1000) NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscricoes_push_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_push_endpoint_key" ON "inscricoes_push"("endpoint");

-- CreateIndex
CREATE INDEX "inscricoes_push_usuario_id_idx" ON "inscricoes_push"("usuario_id");

-- AddForeignKey
ALTER TABLE "inscricoes_push" ADD CONSTRAINT "inscricoes_push_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

