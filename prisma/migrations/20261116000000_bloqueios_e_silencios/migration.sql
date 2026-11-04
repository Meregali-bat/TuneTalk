-- Bloquear e silenciar pessoas.
-- CreateTable
CREATE TABLE "bloqueios" (
    "bloqueador_id" INTEGER NOT NULL,
    "bloqueado_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueios_pkey" PRIMARY KEY ("bloqueador_id","bloqueado_id")
);

-- CreateTable
CREATE TABLE "silencios" (
    "usuario_id" INTEGER NOT NULL,
    "silenciado_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "silencios_pkey" PRIMARY KEY ("usuario_id","silenciado_id")
);

-- CreateIndex
CREATE INDEX "bloqueios_bloqueado_id_idx" ON "bloqueios"("bloqueado_id");

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_bloqueador_id_fkey" FOREIGN KEY ("bloqueador_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_bloqueado_id_fkey" FOREIGN KEY ("bloqueado_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "silencios" ADD CONSTRAINT "silencios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "silencios" ADD CONSTRAINT "silencios_silenciado_id_fkey" FOREIGN KEY ("silenciado_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

