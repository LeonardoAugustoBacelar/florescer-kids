-- Datas de aula são datas de calendário: a convenção agora é meia-noite UTC
-- (ver src/lib/date.ts). Linhas gravadas antes disso a partir de um ambiente
-- fora de UTC ficaram com o horário local junto (ex: 03:00 no Brasil), e
-- deixariam de casar com a comparação por igualdade que sustenta o bloqueio de
-- dias. Trunca pro início do dia; idempotente e sem efeito nas linhas que já
-- estão corretas.
UPDATE "BlockedDate"
SET "date" = date_trunc('day', "date")
WHERE "date" <> date_trunc('day', "date");

UPDATE "Booking"
SET "date" = date_trunc('day', "date")
WHERE "date" <> date_trunc('day', "date");
