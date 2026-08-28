import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  ENGAGEMENT_RULES,
  dedupeKey,
  type EngagementKind,
} from "@/lib/engagement";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe";
import { formatDateBR, startOfToday } from "@/lib/date";
import {
  sendCadastroSemAgendamentoEmail,
  sendConviteIndicacaoEmail,
  sendPedidoAvaliacaoEmail,
  sendReengajamentoEmail,
  sendReservaPendenteProfessoraEmail,
} from "@/lib/email";

// Teto por tipo, por execução. Existe pra limitar o estrago de um erro de
// regra: se alguma janela for calculada errado, o prejuízo é dezenas de
// e-mails, não a base inteira.
const MAX_POR_TIPO = 40;

function windowFor(kind: EngagementKind, now: Date) {
  const { minDays, maxDays } = ENGAGEMENT_RULES[kind];
  const day = 24 * 60 * 60 * 1000;
  return {
    start: new Date(now.getTime() - maxDays * day),
    end: new Date(now.getTime() - minDays * day),
  };
}

/**
 * Reserva o envio antes de mandar e desfaz se o envio falhar.
 *
 * A ordem é o ponto: gravar primeiro faz o índice único barrar uma segunda
 * execução simultânea; desfazer no erro faz a mensagem ser tentada de novo
 * amanhã em vez de se perder. O caso ruim vira "tenta de novo", nunca
 * "chegou duas vezes".
 */
async function sendOnce(
  kind: EngagementKind,
  entityId: string,
  userId: string | null,
  send: () => Promise<void>
): Promise<boolean> {
  const key = dedupeKey(kind, entityId);

  let logId: string;
  try {
    const log = await prisma.messageLog.create({
      data: { kind, dedupeKey: key, userId },
    });
    logId = log.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false; // já enviado antes
    }
    throw error;
  }

  try {
    await send();
    return true;
  } catch (error) {
    await prisma.messageLog.delete({ where: { id: logId } }).catch(() => {});
    console.error(`Falha ao enviar ${kind} para ${entityId}`, error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const enviados: Record<string, number> = {};
  const contar = (kind: string, ok: boolean) => {
    if (ok) enviados[kind] = (enviados[kind] ?? 0) + 1;
  };

  // 1. Criou conta e nunca agendou.
  {
    const kind: EngagementKind = "CADASTRO_SEM_AGENDAMENTO";
    const { start, end } = windowFor(kind, now);
    const usuarias = await prisma.user.findMany({
      where: {
        role: "MAE",
        unsubscribedAt: null,
        createdAt: { gte: start, lte: end },
        bookingsAsMae: { none: {} },
        messageLogs: { none: { kind } },
      },
      take: MAX_POR_TIPO,
    });

    for (const usuaria of usuarias) {
      const ok = await sendOnce(kind, usuaria.id, usuaria.id, () =>
        sendCadastroSemAgendamentoEmail(usuaria.email, {
          name: usuaria.name.split(" ")[0],
          unsubscribeUrl: buildUnsubscribeUrl(usuaria.id),
        })
      );
      contar(kind, ok);
    }
  }

  // 2. Reserva parada esperando confirmação da professora.
  {
    const kind: EngagementKind = "RESERVA_PENDENTE_PROFESSORA";
    const { start, end } = windowFor(kind, now);
    const reservas = await prisma.booking.findMany({
      where: {
        status: "PENDENTE",
        createdAt: { gte: start, lte: end },
        date: { gte: startOfToday() },
      },
      include: { mae: true, teacher: { include: { user: true } } },
      take: MAX_POR_TIPO,
    });

    for (const reserva of reservas) {
      const destino =
        reserva.teacher.notificationEmail || reserva.teacher.user.email;
      const ok = await sendOnce(kind, reserva.id, null, () =>
        sendReservaPendenteProfessoraEmail(destino, {
          maeName: reserva.mae.name,
          childName: reserva.childName,
          date: formatDateBR(reserva.date),
          startTime: reserva.startTime,
        })
      );
      contar(kind, ok);
    }
  }

  // 3. Aula concluída e ainda sem avaliação.
  {
    const kind: EngagementKind = "PEDIDO_AVALIACAO";
    const { start, end } = windowFor(kind, now);
    const reservas = await prisma.booking.findMany({
      where: {
        status: "CONCLUIDA",
        date: { gte: start, lte: end },
        review: null,
        mae: { unsubscribedAt: null },
      },
      include: { mae: true },
      take: MAX_POR_TIPO,
    });

    for (const reserva of reservas) {
      const ok = await sendOnce(kind, reserva.id, reserva.maeId, () =>
        sendPedidoAvaliacaoEmail(reserva.mae.email, {
          name: reserva.mae.name.split(" ")[0],
          childName: reserva.childName,
          unsubscribeUrl: buildUnsubscribeUrl(reserva.maeId),
        })
      );
      contar(kind, ok);
    }
  }

  // 4. Avaliou com nota máxima — momento certo pra pedir indicação.
  {
    const kind: EngagementKind = "CONVITE_INDICACAO";
    const { start, end } = windowFor(kind, now);
    const avaliacoes = await prisma.review.findMany({
      where: {
        rating: 5,
        createdAt: { gte: start, lte: end },
        mae: { unsubscribedAt: null },
      },
      include: { mae: true },
      take: MAX_POR_TIPO,
    });

    for (const avaliacao of avaliacoes) {
      const ok = await sendOnce(kind, avaliacao.id, avaliacao.maeId, () =>
        sendConviteIndicacaoEmail(avaliacao.mae.email, {
          name: avaliacao.mae.name.split(" ")[0],
          unsubscribeUrl: buildUnsubscribeUrl(avaliacao.maeId),
        })
      );
      contar(kind, ok);
    }
  }

  // 5. Sumiu depois da última aula — e não marcou nada desde então.
  {
    const kind: EngagementKind = "REENGAJAMENTO_30_DIAS";
    const { start, end } = windowFor(kind, now);
    const usuarias = await prisma.user.findMany({
      where: {
        role: "MAE",
        unsubscribedAt: null,
        messageLogs: { none: { kind } },
        bookingsAsMae: {
          some: { status: "CONCLUIDA", date: { gte: start, lte: end } },
          // Nada marcado depois da janela: quem voltou não deve ser cutucada.
          none: {
            date: { gt: end },
            status: { in: ["PENDENTE", "CONFIRMADA", "CONCLUIDA"] },
          },
        },
      },
      include: {
        bookingsAsMae: {
          where: { status: "CONCLUIDA" },
          orderBy: { date: "desc" },
          take: 1,
        },
      },
      take: MAX_POR_TIPO,
    });

    for (const usuaria of usuarias) {
      const ultima = usuaria.bookingsAsMae[0];
      if (!ultima) continue;
      const ok = await sendOnce(kind, usuaria.id, usuaria.id, () =>
        sendReengajamentoEmail(usuaria.email, {
          name: usuaria.name.split(" ")[0],
          childName: ultima.childName,
          unsubscribeUrl: buildUnsubscribeUrl(usuaria.id),
        })
      );
      contar(kind, ok);
    }
  }

  return NextResponse.json({ enviados });
}
