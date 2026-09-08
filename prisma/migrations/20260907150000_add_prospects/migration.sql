-- Prospecção de parceiros institucionais (escolas, creches, consultórios).
-- Tabela isolada: não referencia User nem Booking, porque prospect não é
-- cliente ainda — vira cliente quando a família chega pelo site, e aí o
-- vínculo é a mãe, não a instituição.

CREATE TYPE "ProspectKind" AS ENUM (
  'ESCOLA_INFANTIL',
  'CRECHE',
  'CLINICA_PEDIATRICA',
  'PSICOLOGIA',
  'FONOAUDIOLOGIA',
  'OUTRO'
);

CREATE TYPE "ProspectStatus" AS ENUM (
  'ENCONTRADO',
  'APROVADO',
  'CONTATADO',
  'RESPONDEU',
  'SEM_RESPOSTA',
  'DESCARTADO'
);

CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "kind" "ProspectKind" NOT NULL,
    "status" "ProspectStatus" NOT NULL DEFAULT 'ENCONTRADO',
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "email" TEXT,
    "emailCheckedAt" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "draftSubject" TEXT,
    "draftBody" TEXT,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- Chave natural da busca: é este índice que faz rodar o script duas vezes
-- atualizar a ficha existente em vez de duplicar a mesma escola na fila.
CREATE UNIQUE INDEX "Prospect_placeId_key" ON "Prospect"("placeId");

-- A fila de trabalho é sempre "o que está neste status, do mais perto pro mais
-- longe" — este índice é exatamente essa consulta.
CREATE INDEX "Prospect_status_distanceKm_idx" ON "Prospect"("status", "distanceKm");
CREATE INDEX "Prospect_kind_idx" ON "Prospect"("kind");
