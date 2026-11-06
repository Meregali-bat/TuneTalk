-- Contadores do limite de requisições (quantas vezes cada chave bateu na janela atual).
-- Ficam no banco porque na Vercel cada requisição pode cair numa instância diferente.
-- CreateTable
CREATE TABLE "limites_requisicao" (
    "chave" VARCHAR(255) NOT NULL,
    "contagem" INTEGER NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "limites_requisicao_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "limites_requisicao_expira_em_idx" ON "limites_requisicao"("expira_em");
