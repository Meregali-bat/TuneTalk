-- Mostrar ou esconder a medalha de fundador; notificações de selo ganho e de marcação (@).
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoNotificacao" ADD VALUE 'selo_fundador';
ALTER TYPE "TipoNotificacao" ADD VALUE 'mention';

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "mostrar_selo_fundador" BOOLEAN NOT NULL DEFAULT true;

