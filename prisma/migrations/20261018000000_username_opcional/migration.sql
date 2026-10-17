-- O nome de usuário passa a ser escolhido depois do cadastro e deve ser único.
-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "nome" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nome_key" ON "usuarios"("nome");
