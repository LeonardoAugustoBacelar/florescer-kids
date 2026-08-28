-- Mensagens automáticas de relacionamento: registro de envio (para não
-- repetir) e descadastro por usuária.

CREATE TYPE "MessageKind" AS ENUM (
  'CADASTRO_SEM_AGENDAMENTO',
  'RESERVA_PENDENTE_PROFESSORA',
  'PEDIDO_AVALIACAO',
  'CONVITE_INDICACAO',
  'REENGAJAMENTO_30_DIAS'
);

ALTER TABLE "User" ADD COLUMN "unsubscribedAt" TIMESTAMP(3);

CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "userId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- É este índice que garante o envio no maximo uma vez, mesmo com o cron
-- rodando duas vezes em paralelo.
CREATE UNIQUE INDEX "MessageLog_dedupeKey_key" ON "MessageLog"("dedupeKey");
CREATE INDEX "MessageLog_kind_sentAt_idx" ON "MessageLog"("kind", "sentAt");

ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
