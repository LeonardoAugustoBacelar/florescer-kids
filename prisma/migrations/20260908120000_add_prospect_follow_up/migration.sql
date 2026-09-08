-- Segundo toque da prospecção. Coluna separada de `contactedAt` porque as duas
-- perguntas são diferentes: "já me apresentei?" e "já insisti uma vez?". Com um
-- campo só, reenviar o follow-up ficaria indistinguível de reenviar o primeiro
-- contato.
ALTER TABLE "Prospect" ADD COLUMN "followUpAt" TIMESTAMP(3);

-- A fila do cron é "aprovados que ainda não saíram" e "contatados esperando o
-- segundo toque". Este índice cobre as duas.
CREATE INDEX "Prospect_status_contactedAt_idx" ON "Prospect"("status", "contactedAt");
