import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDaySlots, isWeekend, SCHEDULE_RULES } from "@/lib/schedule";
import {
  addDays,
  formatDateBR,
  getWeekday,
  startOfToday,
  toDateKey,
} from "@/lib/date";
import PixPaymentInfo from "@/components/PixPaymentInfo";
import SectionMark from "@/components/SectionMark";

export const metadata: Metadata = {
  title: "Horários disponíveis",
  description:
    "Veja os horários disponíveis para agendar uma aula e como pagar via PIX.",
};

const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const DAYS_TO_SHOW = 14;

export default async function HorariosPage() {
  const teacher = await prisma.teacherProfile.findFirst({
    where: { approved: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const today = startOfToday();
  const rangeEnd = addDays(today, DAYS_TO_SHOW);

  const bookings = teacher
    ? await prisma.booking.findMany({
        where: {
          teacherId: teacher.id,
          status: { in: ["PENDENTE", "CONFIRMADA"] },
          date: { gte: today, lt: rangeEnd },
        },
        select: { date: true, startTime: true },
      })
    : [];

  const blockedDates = teacher
    ? await prisma.blockedDate.findMany({
        where: { teacherId: teacher.id, date: { gte: today, lt: rangeEnd } },
        select: { date: true },
      })
    : [];
  const blockedDateKeys = new Set(
    blockedDates.map((b) => toDateKey(b.date))
  );

  const bookedByDate = new Map<string, Set<string>>();
  for (const booking of bookings) {
    const key = toDateKey(booking.date);
    if (!bookedByDate.has(key)) bookedByDate.set(key, new Set());
    bookedByDate.get(key)!.add(booking.startTime);
  }

  const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const date = addDays(today, i);
    const key = toDateKey(date);
    const takenTimes = bookedByDate.get(key) ?? new Set<string>();
    const slots = getDaySlots(date).map((slot) => ({
      ...slot,
      taken: takenTimes.has(slot.startTime),
    }));
    const isBlocked = blockedDateKeys.has(key);
    const dayIsFull = takenTimes.size >= SCHEDULE_RULES.maxBookingsPerDay;
    return { date, slots, dayIsFull, isBlocked };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-serif-display text-3xl font-semibold text-primary-700">
        Horários disponíveis
      </h1>
      <SectionMark color="accent" align="left" />
      <p className="mt-4 max-w-2xl text-primary-700/80">
        Aulas 100% online, por videochamada (Google Meet), de{" "}
        {SCHEDULE_RULES.slotDurationMinutes} minutos. Segunda a sexta, a
        partir das {SCHEDULE_RULES.weekdayStart}. Sábado e domingo, a partir
        das {SCHEDULE_RULES.weekendStart}. Até no máximo{" "}
        {SCHEDULE_RULES.maxBookingsPerDay} aulas por dia.
      </p>
      <p className="mt-2 flex max-w-2xl items-center gap-1.5 text-sm text-primary-700/70">
        <ShieldCheck className="h-4 w-4 shrink-0 text-accent-600" />
        Chamada privada pelo Google Meet, não é gravada.
      </p>

      {!teacher ? (
        <p className="mt-8 rounded-lg border border-primary-100 bg-primary-50 p-4 text-primary-700/80">
          Em breve teremos uma professora disponível para agendamento.
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {days.map(({ date, slots, dayIsFull, isBlocked }, index) => (
              <div
                key={toDateKey(date)}
                data-reveal
                style={{ "--reveal-delay": `${(index % 6) * 60}ms` } as React.CSSProperties}
                className="rounded-lg border border-primary-100 bg-white p-4"
              >
                <p className="text-sm font-bold text-primary-700">
                  {WEEKDAY_LABELS[getWeekday(date)]}
                  <span className="font-normal text-primary-700/60">
                    {" "}
                    · {formatDateBR(date)}
                  </span>
                  {isWeekend(date) && (
                    <span className="ml-2 rounded-full bg-sun-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sun-600">
                      Fim de semana
                    </span>
                  )}
                </p>
                {isBlocked ? (
                  <p className="mt-2 text-sm text-primary-700/60">
                    Indisponível
                  </p>
                ) : dayIsFull ? (
                  <p className="mt-2 text-sm text-primary-700/60">
                    Dia lotado
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {slots.map((slot) => (
                      <span
                        key={slot.startTime}
                        className={
                          slot.taken
                            ? "rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700/40 line-through"
                            : "rounded-full bg-accent-100 px-2.5 py-1 text-xs font-medium text-accent-600"
                        }
                      >
                        {slot.startTime}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={`/professoras/${teacher.id}`}
              className="btn-press group inline-flex items-center gap-2 rounded-md bg-accent-500 px-6 py-3 font-semibold text-white hover:bg-accent-600"
            >
              Agendar com {teacher.user.name}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </>
      )}

      <div className="mt-10 max-w-lg">
        <PixPaymentInfo amount={teacher?.pricePerHour} />
      </div>

      <div className="mt-12 max-w-2xl">
        <h2 className="font-serif-display text-2xl font-semibold text-primary-700">
          Perguntas frequentes
        </h2>
        <SectionMark color="accent" align="left" />
        <div className="mt-6 divide-y divide-primary-100 rounded-lg border border-primary-100 bg-white">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold text-primary-700">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-primary-700/80">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: "Como funciona o pagamento?",
    answer:
      "Você agenda o horário no site e paga via PIX direto para a professora (chave ou QR code, já com o valor preenchido). Depois de pagar, envie o comprovante pelo WhatsApp para confirmar sua vaga.",
  },
  {
    question: "Posso cancelar ou remarcar minha aula?",
    answer:
      "Sim, quando quiser, sem multa, direto no seu painel. Se já tiver pago e precisar cancelar, combine o reembolso ou reagendamento com a professora pelo WhatsApp.",
  },
  {
    question: "E se a professora precisar cancelar (viagem, imprevisto)?",
    answer:
      "Dias em que ela sabe que não vai poder atender já aparecem como indisponíveis aqui em Horários — você nem consegue agendar neles. Se algo imprevisto acontecer depois de uma aula já marcada, ela avisa direto pelo WhatsApp para reagendar.",
  },
  {
    question: "A aula é gravada?",
    answer:
      "Não. A chamada acontece pelo Google Meet, é privada e não é gravada.",
  },
  {
    question: "Quantas aulas posso agendar?",
    answer:
      "Quantas quiser, em dias diferentes — o limite é de até 3 aulas por dia (capacidade da professora), não por semana.",
  },
];
