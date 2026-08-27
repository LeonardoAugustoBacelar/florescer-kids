import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
  GraduationCap,
  Home,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DOMICILIO_SCHEDULE_RULES, getDaySlots, isWeekend } from "@/lib/schedule";
import {
  addDays,
  formatDateBR,
  getWeekday,
  startOfToday,
  toDateKey,
} from "@/lib/date";
import DomicilioBookingForm from "@/components/forms/DomicilioBookingForm";
import PixPaymentInfo from "@/components/PixPaymentInfo";
import SectionMark from "@/components/SectionMark";

export const metadata: Metadata = {
  title: "Atendimento a domicílio em Cotia-SP",
  description:
    "Aulas e apoio comportamental presenciais em Cotia-SP: a professora vai até sua casa ou vocês vão até a dela.",
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
const DOMICILIO_MODALITIES = [
  "DOMICILIO_CASA_ALUNO",
  "DOMICILIO_CASA_PROFESSORA",
] as const;

const FAQ_ITEMS = [
  {
    question: "Vocês atendem em qualquer lugar?",
    answer:
      "Não — o atendimento a domicílio é só em Cotia-SP e arredores próximos, por causa do tempo de deslocamento. Se você estiver fora dessa região, o atendimento online continua disponível para qualquer lugar.",
  },
  {
    question: "Como escolho quem vai até quem?",
    answer:
      "Você escolhe no momento de agendar: a professora vai até a sua casa, ou vocês vão até a casa dela. As duas opções têm o mesmo valor.",
  },
  {
    question: "O endereço fica visível pra qualquer pessoa?",
    answer:
      "Não. Se a professora for até você, o endereço que você preenche fica visível só para você e para ela. Se vocês forem até a casa dela, o endereço só aparece no seu painel depois que o atendimento é confirmado — nunca fica público no site.",
  },
  {
    question: "É seguro receber alguém que eu não conheço em casa (ou levar meu filho à casa dela)?",
    answer:
      "Antes do primeiro encontro presencial, converse com a professora pelo WhatsApp para se conhecerem e alinhar expectativas — isso ajuda bastante a reduzir a insegurança do primeiro contato. A decisão de seguir ou não é sempre sua.",
  },
  {
    question: "E se eu precisar cancelar depois que a professora já saiu de casa?",
    answer:
      "Avise assim que possível pelo WhatsApp para combinarem juntas o que for mais justo. Não temos uma multa automática — é sempre conversado caso a caso.",
  },
];

export default async function DomicilioPage() {
  const session = await auth();
  const isMae = session?.user?.role === "MAE";

  const teacher = await prisma.teacherProfile.findFirst({
    where: { approved: true, offersDomicilio: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  if (!teacher) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
        <h1 className="font-serif-display text-3xl font-semibold text-primary-700">
          Atendimento a domicílio
        </h1>
        <p className="mt-4 text-primary-700/80">
          Ainda não temos atendimento a domicílio disponível. Enquanto isso,
          conheça o{" "}
          <Link href="/horarios" className="font-semibold text-accent-600 hover:underline">
            atendimento 100% online
          </Link>
          .
        </p>
      </div>
    );
  }

  const today = startOfToday();
  const rangeEnd = addDays(today, DAYS_TO_SHOW);

  const [bookings, blockedDates] = await Promise.all([
    prisma.booking.findMany({
      where: {
        teacherId: teacher.id,
        status: { in: ["PENDENTE", "CONFIRMADA"] },
        modality: { in: [...DOMICILIO_MODALITIES] },
        date: { gte: today, lt: rangeEnd },
      },
      select: { date: true, startTime: true },
    }),
    prisma.blockedDate.findMany({
      where: { teacherId: teacher.id, date: { gte: today, lt: rangeEnd } },
      select: { date: true },
    }),
  ]);

  const bookedByDate = new Map<string, Set<string>>();
  for (const booking of bookings) {
    const key = toDateKey(booking.date);
    if (!bookedByDate.has(key)) bookedByDate.set(key, new Set());
    bookedByDate.get(key)!.add(booking.startTime);
  }
  const blockedDateKeys = new Set(
    blockedDates.map((b) => toDateKey(b.date))
  );

  const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const date = addDays(today, i);
    const key = toDateKey(date);
    const takenTimes = bookedByDate.get(key) ?? new Set<string>();
    const slots = getDaySlots(date, DOMICILIO_SCHEDULE_RULES).map((slot) => ({
      ...slot,
      taken: takenTimes.has(slot.startTime),
    }));
    const isBlocked = blockedDateKeys.has(key);
    const dayIsFull = takenTimes.size >= DOMICILIO_SCHEDULE_RULES.maxBookingsPerDay;
    return { date, slots, dayIsFull, isBlocked };
  });

  const bookedSlotsForForm = bookings.map((b) => ({
    date: toDateKey(b.date),
    startTime: b.startTime,
  }));
  const blockedDatesForForm = Array.from(blockedDateKeys);

  const price = teacher.pricePerHourDomicilio ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-600">
        <MapPin className="h-3.5 w-3.5" />
        Atende apenas Cotia-SP e região
      </span>
      <h1 className="mt-3 font-serif-display text-3xl font-semibold text-primary-700">
        Atendimento a domicílio
      </h1>
      <SectionMark color="accent" align="left" />
      <p className="mt-4 max-w-2xl text-primary-700/80">
        Além do atendimento 100% online, {teacher.user.name} também recebe ou
        visita famílias presencialmente em Cotia-SP. Você escolhe: ela vai
        até sua casa, ou vocês vão até a dela.
      </p>

      <div className="mt-8 grid gap-10 md:grid-cols-[2fr_1fr]">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-primary-100 bg-white p-4">
              <Home className="h-5 w-5 text-accent-600" />
              <p className="mt-2 font-semibold text-primary-700">
                A professora vai até você
              </p>
              <p className="mt-1 text-sm text-primary-700/70">
                Você informa o endereço ao agendar. Fica visível só para
                vocês duas.
              </p>
            </div>
            <div className="rounded-lg border border-primary-100 bg-white p-4">
              <MapPin className="h-5 w-5 text-accent-600" />
              <p className="mt-2 font-semibold text-primary-700">
                Vocês vão até a casa dela
              </p>
              <p className="mt-1 text-sm text-primary-700/70">
                O endereço dela aparece no seu painel assim que o
                atendimento é confirmado.
              </p>
            </div>
          </div>

          {teacher.credentials && (
            <p className="mt-6 flex items-start gap-2 rounded-md bg-accent-100/50 p-3 text-sm font-medium text-accent-600">
              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" />
              {teacher.credentials}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-primary-100 bg-white p-5">
            <p className="flex items-center gap-1.5 font-semibold text-primary-700">
              <ShieldCheck className="h-4 w-4 text-accent-600" />
              Segurança no primeiro encontro
            </p>
            <ul className="mt-3 space-y-2 text-sm text-primary-700/80">
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                Converse com a professora pelo WhatsApp antes da primeira
                visita, para se conhecerem e alinharem expectativas.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                O endereço de cada uma fica visível só entre vocês duas —
                nunca é exibido publicamente no site.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                A decisão de seguir com o atendimento presencial é sempre
                sua — se preferir, o atendimento online continua disponível.
              </li>
            </ul>
          </div>

          <h2 className="mt-10 font-serif-display text-xl font-semibold text-primary-700">
            Horários disponíveis
          </h2>
          <p className="mt-1 text-sm text-primary-700/70">
            Mesmos horários do atendimento online, mas no máximo{" "}
            {DOMICILIO_SCHEDULE_RULES.maxBookingsPerDay} atendimento a
            domicílio por dia.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {days.map(({ date, slots, dayIsFull, isBlocked }, index) => (
              <div
                key={toDateKey(date)}
                data-reveal
                style={{ "--reveal-delay": `${(index % 6) * 60}ms` } as CSSProperties}
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
                  <p className="mt-2 text-sm text-primary-700/60">Indisponível</p>
                ) : dayIsFull ? (
                  <p className="mt-2 text-sm text-primary-700/60">
                    Já tem atendimento marcado
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

          <div className="mt-12">
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

        <div className="space-y-6">
          <div className="rounded-lg border border-primary-100 bg-white p-6">
            <h2 className="font-bold text-primary-700">
              Agendar atendimento a domicílio
            </h2>

            {!session?.user ? (
              <div className="mt-4 space-y-3 text-sm text-primary-700/80">
                <p>Entre ou crie uma conta de mãe para agendar.</p>
                <Link
                  href="/login"
                  className="block rounded-md bg-primary-700 px-4 py-2 text-center font-semibold text-white hover:bg-primary-600"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="block rounded-md border border-primary-100 px-4 py-2 text-center font-semibold text-primary-700 hover:bg-primary-50"
                >
                  Criar conta
                </Link>
              </div>
            ) : !isMae ? (
              <p className="mt-4 text-sm text-primary-700/80">
                Apenas contas de mãe podem agendar atendimentos.
              </p>
            ) : (
              <div className="mt-4">
                <DomicilioBookingForm
                  teacherId={teacher.id}
                  teacherName={teacher.user.name}
                  teacherWhatsapp={teacher.whatsapp}
                  bookedSlots={bookedSlotsForForm}
                  blockedDates={blockedDatesForForm}
                />
              </div>
            )}
          </div>

          <PixPaymentInfo amount={price} />
        </div>
      </div>
    </div>
  );
}
