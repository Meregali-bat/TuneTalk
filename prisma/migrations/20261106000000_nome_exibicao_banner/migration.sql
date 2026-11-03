-- Perfil no estilo do Twitter: nome de exibição e capa (banner).
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "banner_url" VARCHAR(500),
ADD COLUMN     "nome_exibicao" VARCHAR(50);

