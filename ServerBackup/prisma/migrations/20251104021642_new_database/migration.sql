/*
  Warnings:

  - A unique constraint covering the columns `[id_pagamento_externo]` on the table `planos_mercado_pago` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "planos_mercado_pago" ADD COLUMN     "id_pagamento_externo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "planos_mercado_pago_id_pagamento_externo_key" ON "planos_mercado_pago"("id_pagamento_externo");
