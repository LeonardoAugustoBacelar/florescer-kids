import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DIAS_PARA_FOLLOW_UP,
  LIMITE_DIARIO_ENVIO,
  precisaFollowUp,
} from "@/lib/prospect";
import { enviarFollowUp, enviarPrimeiroContato } from "@/lib/prospectSend";

// Sai da mesma conta que manda confirmação de aula e redefinição de senha.
// Fatiar o envio ao longo dos dias é o que mantém essa conta longe do filtro
// de spam — e o que impede que um erro de fila vire centenas de e-mails de uma
// vez só.
export const maxDuration = 60;

/**
 * Disparo automático da prospecção.
 *
 * Manda os primeiros contatos que já foram aprovados na tela e, depois, os
 * segundos toques de quem não respondeu. O cron não decide o que enviar nem
 * para quem: ele só executa, no ritmo certo, o que já passou pela leitura
 * humana. É por isso que um prospect nunca sai daqui sem estar APROVADO.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const agora = new Date();
  let primeiros = 0;
  let followUps = 0;
  const erros: string[] = [];

  // 1. Primeiros contatos aprovados e ainda não enviados, do mais perto pro
  //    mais longe — parceria a poucos quilômetros é a que vira aula presencial.
  const aprovados = await prisma.prospect.findMany({
    where: { status: "APROVADO", email: { not: null }, contactedAt: null },
    orderBy: { distanceKm: "asc" },
    take: LIMITE_DIARIO_ENVIO,
  });

  for (const prospect of aprovados) {
    try {
      await enviarPrimeiroContato(prospect.id);
      primeiros++;
    } catch (erro) {
      // Uma instituição com e-mail inválido não pode parar a fila do dia.
      erros.push(`${prospect.name}: ${(erro as Error).message}`);
    }
  }

  // 2. Segundos toques. Só depois dos primeiros, e com o que sobrou do teto:
  //    o limite diário é da conta de e-mail inteira, não de cada tipo de
  //    mensagem.
  const sobra = Math.max(0, LIMITE_DIARIO_ENVIO - primeiros);
  if (sobra > 0) {
    const limite = new Date(
      agora.getTime() - DIAS_PARA_FOLLOW_UP * 24 * 60 * 60 * 1000
    );
    const candidatos = await prisma.prospect.findMany({
      where: {
        status: "CONTATADO",
        email: { not: null },
        followUpAt: null,
        respondedAt: null,
        contactedAt: { lte: limite },
      },
      orderBy: { contactedAt: "asc" },
      take: sobra,
    });

    for (const prospect of candidatos) {
      // A checagem em SQL já filtra, mas a regra pura é a que manda: ela é a
      // que está coberta por teste, e é ela que decide se é hora de insistir.
      if (!precisaFollowUp(prospect, agora)) continue;
      try {
        await enviarFollowUp(prospect.id);
        followUps++;
      } catch (erro) {
        erros.push(`${prospect.name} (follow-up): ${(erro as Error).message}`);
      }
    }
  }

  return NextResponse.json({ primeiros, followUps, erros });
}
