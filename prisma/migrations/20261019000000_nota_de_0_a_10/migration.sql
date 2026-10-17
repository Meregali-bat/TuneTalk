-- A nota passa de 0–5 estrelas para 0–10 pontos (cada ponto é meia estrela).
-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "nota" SET DATA TYPE INTEGER USING ROUND("nota" * 2)::INTEGER;
