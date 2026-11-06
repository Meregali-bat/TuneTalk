-- Recompensa dos 100 posts: efeito do perfil (forma e paleta à escolha), que pode ser escondido.
-- Só adiciona colunas; quem já passou de 100 posts recebe o efeito sozinho ao postar ou abrir o próprio perfil.
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "efeito_desde" TIMESTAMP(3),
ADD COLUMN     "efeito_perfil" JSONB,
ADD COLUMN     "mostrar_efeito" BOOLEAN NOT NULL DEFAULT true;
