-- Proporção da imagem cortada pelo usuário (posts novos); posts antigos ficam sem.
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "imagem_proporcao" REAL;

