-- Disco de vinil no feed: guarda quando a pessoa abriu o presente dos 100 posts (some depois disso).
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "presente_aberto_em" TIMESTAMP(3);
