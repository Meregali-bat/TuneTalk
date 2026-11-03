-- Favoritos do perfil (até 5 músicas, 5 álbuns e 5 artistas).
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "favoritos" JSONB NOT NULL DEFAULT '{}';

