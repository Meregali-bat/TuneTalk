-- Post fixado no perfil: um por usuário; some sozinho se o post for apagado.
-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "post_fixado_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_post_fixado_id_key" ON "usuarios"("post_fixado_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_post_fixado_id_fkey" FOREIGN KEY ("post_fixado_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

