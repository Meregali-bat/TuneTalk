-- Toca de Natal: ganha no primeiro like num post com #xmas e aparece em cima da foto de perfil.
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "toca_natal_em" TIMESTAMP(3),
ADD COLUMN "usar_toca_natal" BOOLEAN NOT NULL DEFAULT true;

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'toca_natal';
