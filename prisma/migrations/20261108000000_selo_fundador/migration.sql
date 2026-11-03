-- Selo de fundador para quem veio do TuneTalk antigo; ativa no próximo login (fundador_desde).
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "fundador_desde" TIMESTAMP(3),
ADD COLUMN     "veterano" BOOLEAN NOT NULL DEFAULT false;


-- As contas do banco antigo foram importadas com os ids originais (11 a 73); as criadas no
-- site novo começam no 74. Num banco novo (desenvolvimento) não há contas antigas: as primeiras
-- contas criadas também cairiam aqui, o que não importa fora de produção.
UPDATE "usuarios" SET "veterano" = true WHERE "id" <= 73;
