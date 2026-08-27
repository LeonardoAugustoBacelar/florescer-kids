import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  GraduationCap,
  Home,
  Lightbulb,
  MapPin,
  Settings,
  Star,
  Video,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateBR } from "@/lib/date";
import BookingActions from "@/components/dashboard/BookingActions";
import CancelBookingButton from "@/components/dashboard/CancelBookingButton";
import TeacherNoteForm from "@/components/dashboard/TeacherNoteForm";
import WhatsAppInlineButton from "@/components/WhatsAppInlineButton";
import ReviewForm from "@/components/forms/ReviewForm";
import { summarizeRatings } from "@/lib/reviews";

const TEACHER_TIPS = [
  "Responda as mensagens no WhatsApp o mais rápido possível — é o primeiro contato da mãe e ele pesa bastante na decisão de agendar.",
  "Confirme a aula assim que receber o comprovante do PIX, assim a mãe já sabe que está tudo certo antes do dia combinado.",
  "De vez em quando, entre no seu link fixo do Google Meet pra garantir que ele ainda está funcionando.",
  "Depois da aula, peça pra mãe deixar uma avaliação — perfis com avaliações reais passam mais confiança pra quem está decidindo.",
  "Anote mentalmente (ou em algum lugar seu) o que percebeu em cada aula — ajuda a dar continuidade na próxima conversa com a família.",
];

export const metadata: Metadata = {
  title: "Minha área",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  CONFIRMADA: "Confirmada",
  CANCELADA: "Cancelada",
  CONCLUIDA: "Concluída",
};

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700",
  CONFIRMADA: "bg-primary-50 text-primary-700",
  CANCELADA: "bg-red-50 text-red-600",
  CONCLUIDA: "bg-emerald-50 text-emerald-700",
};

const MAE_MODALITY_LABELS: Record<string, string> = {
  DOMICILIO_CASA_ALUNO: "Domicílio · a professora vai até vocês",
  DOMICILIO_CASA_PROFESSORA: "Domicílio · vocês vão até a professora",
};

const PROFESSORA_MODALITY_LABELS: Record<string, string> = {
  DOMICILIO_CASA_ALUNO: "Domicílio · vou até a família",
  DOMICILIO_CASA_PROFESSORA: "Domicílio · família vem até mim",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  if (session.user.role === "PROFESSORA") {
    return <ProfessoraDashboard userId={session.user.id} />;
  }

  return <MaeDashboard userId={session.user.id} />;
}

async function MaeDashboard({ userId }: { userId: string }) {
  const bookings = await prisma.booking.findMany({
    where: { maeId: userId },
    include: { teacher: { include: { user: true } }, review: true },
    orderBy: { date: "desc" },
  });

  const concludedCount = bookings.filter((b) => b.status === "CONCLUIDA").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-display text-3xl font-semibold text-primary-700">
            Minhas aulas
          </h1>
          {concludedCount > 0 && (
            <p className="mt-1 text-sm text-primary-700/70">
              Você e a professora já fizeram {concludedCount}{" "}
              {concludedCount === 1 ? "aula" : "aulas"} juntas.
            </p>
          )}
        </div>
        <Link
          href="/professoras"
          className="rounded-md bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          Agendar nova aula
        </Link>
      </div>

      {bookings.length === 0 ? (
        <p className="mt-8 text-primary-700/80">
          Você ainda não agendou nenhuma aula.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-lg border border-primary-100 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-primary-700">
                    {booking.teacher.user.name}
                  </p>
                  <p className="text-sm text-primary-700/70">
                    Criança: {booking.childName}
                  </p>
                  <p className="text-sm text-primary-700/70">
                    {formatDateBR(booking.date)} ·{" "}
                    {booking.startTime} às {booking.endTime}
                  </p>
                  {booking.modality !== "ONLINE" && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-accent-600">
                      <Home className="h-3.5 w-3.5" />
                      {MAE_MODALITY_LABELS[booking.modality]}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[booking.status]}`}
                >
                  {STATUS_LABELS[booking.status]}
                </span>
              </div>

              {booking.modality === "DOMICILIO_CASA_ALUNO" && booking.address && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-primary-50 p-3 text-sm text-primary-700/90">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                  <span>
                    <span className="font-semibold">Endereço informado: </span>
                    {booking.address}
                  </span>
                </p>
              )}

              {booking.modality === "DOMICILIO_CASA_PROFESSORA" && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-primary-50 p-3 text-sm text-primary-700/90">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" />
                  {booking.status === "CONFIRMADA" && booking.teacher.domicilioAddress ? (
                    <span>
                      <span className="font-semibold">Endereço da professora: </span>
                      {booking.teacher.domicilioAddress}
                    </span>
                  ) : (
                    <span className="text-primary-700/60">
                      O endereço da professora aparece aqui assim que a aula
                      for confirmada.
                    </span>
                  )}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {booking.modality === "ONLINE" &&
                  booking.status === "CONFIRMADA" &&
                  booking.teacher.videoCallLink && (
                  <a
                    href={booking.teacher.videoCallLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-press inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-600"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Entrar na videochamada
                  </a>
                )}
                <WhatsAppInlineButton
                  phone={booking.teacher.whatsapp}
                  message={`Olá, ${booking.teacher.user.name}! Sobre a aula do dia ${formatDateBR(
                    booking.date
                  )} às ${booking.startTime}...`}
                  label="Falar com a professora"
                  className="!px-4 !py-2 text-xs"
                />
                {(booking.status === "PENDENTE" ||
                  booking.status === "CONFIRMADA") && (
                  <WhatsAppInlineButton
                    phone={booking.teacher.whatsapp}
                    message={`Olá, ${booking.teacher.user.name}! Segue o comprovante do PIX da aula do dia ${formatDateBR(
                      booking.date
                    )} às ${booking.startTime}:`}
                    label="Enviar comprovante PIX"
                    className="!bg-accent-500 !px-4 !py-2 text-xs hover:!bg-accent-600"
                  />
                )}
                {(booking.status === "PENDENTE" ||
                  booking.status === "CONFIRMADA") && (
                  <CancelBookingButton bookingId={booking.id} />
                )}
              </div>

              {booking.teacherNote && (
                <p className="mt-3 rounded-md bg-primary-50 p-3 text-sm text-primary-700/90">
                  <span className="font-semibold">
                    Nota da professora:{" "}
                  </span>
                  {booking.teacherNote}
                </p>
              )}

              {booking.status === "CONCLUIDA" && !booking.review && (
                <div className="mt-3">
                  <ReviewForm bookingId={booking.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function ProfessoraDashboard({ userId }: { userId: string }) {
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      bookings: {
        include: { mae: true },
        orderBy: { date: "asc" },
      },
      reviews: true,
    },
  });

  if (!teacherProfile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
        <p className="text-primary-700">
          Não encontramos um perfil de professora associado à sua conta.
        </p>
      </div>
    );
  }

  const pending = teacherProfile.bookings.filter((b) => b.status === "PENDENTE");
  const confirmed = teacherProfile.bookings.filter((b) => b.status === "CONFIRMADA");
  const concluded = teacherProfile.bookings.filter((b) => b.status === "CONCLUIDA");
  const concludedNoNote = concluded.filter((b) => !b.teacherNote);
  const history = teacherProfile.bookings
    .filter(
      (b) =>
        b.status === "CANCELADA" || (b.status === "CONCLUIDA" && b.teacherNote)
    )
    .reverse();
  const ratingSummary = summarizeRatings(teacherProfile.reviews);
  const projectedEarnings = confirmed.reduce(
    (sum, b) =>
      sum +
      (b.modality === "ONLINE"
        ? teacherProfile.pricePerHour
        : (teacherProfile.pricePerHourDomicilio ?? 0)),
    0
  );

  const tipOfTheDay =
    TEACHER_TIPS[new Date().getDate() % TEACHER_TIPS.length];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif-display text-3xl font-semibold text-primary-700">
          Painel da professora
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              {pending.length} aguardando confirmação
            </span>
          )}
          {confirmed.length > 0 && (
            <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700">
              {confirmed.length} confirmada{confirmed.length > 1 ? "s" : ""}
            </span>
          )}
          <Link
            href="/dashboard/perfil"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary-100 px-3 py-1 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            <Settings className="h-3.5 w-3.5" />
            Editar perfil
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700/60">
            <Wallet className="h-3.5 w-3.5" />
            Ganhos previstos
          </p>
          <p className="mt-1 text-2xl font-bold text-primary-700">
            R$ {projectedEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-primary-700/60">
            das aulas confirmadas
          </p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700/60">
            <GraduationCap className="h-3.5 w-3.5" />
            Aulas dadas
          </p>
          <p className="mt-1 text-2xl font-bold text-primary-700">
            {concluded.length}
          </p>
          <p className="text-xs text-primary-700/60">no total</p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700/60">
            <Star className="h-3.5 w-3.5" />
            Avaliação média
          </p>
          <p className="mt-1 text-2xl font-bold text-primary-700">
            {ratingSummary.count > 0 ? ratingSummary.average.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-primary-700/60">
            {ratingSummary.count} avaliaç{ratingSummary.count === 1 ? "ão" : "ões"}
          </p>
        </div>
      </div>

      <section className="mt-6">
        {pending.length === 0 && confirmed.length === 0 ? (
          <p className="text-primary-700/80">
            Nenhuma aula agendada até agora.
          </p>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-amber-700">
                  <Clock className="h-4 w-4" />
                  Aguardando confirmação
                </h2>
                <div className="mt-3 space-y-3">
                  {pending.map((booking) => (
                    <TeacherBookingCard
                      key={booking.id}
                      booking={booking}
                      accent="amber"
                    />
                  ))}
                </div>
              </div>
            )}

            {confirmed.length > 0 && (
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-primary-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Próximas aulas confirmadas
                </h2>
                <div className="mt-3 space-y-3">
                  {confirmed.map((booking) => (
                    <TeacherBookingCard
                      key={booking.id}
                      booking={booking}
                      accent="primary"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {concludedNoNote.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-emerald-700">
            <GraduationCap className="h-4 w-4" />
            Aulas concluídas — adicionar nota
          </h2>
          <div className="mt-3 space-y-3">
            {concludedNoNote.map((booking) => (
              <TeacherBookingCard
                key={booking.id}
                booking={booking}
                accent="done"
              />
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <details className="mt-8 rounded-lg border border-primary-100 bg-white p-5">
          <summary className="cursor-pointer text-sm font-semibold text-primary-700/70">
            Histórico ({history.length})
          </summary>
          <div className="mt-4 space-y-3">
            {history.map((booking) => (
              <TeacherBookingCard
                key={booking.id}
                booking={booking}
                accent="muted"
              />
            ))}
          </div>
        </details>
      )}

      <section className="mt-10 rounded-lg border border-accent-100 bg-accent-100/40 p-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-accent-600">
          <Lightbulb className="h-4 w-4" />
          Dica pra você
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-primary-700/90">
          {tipOfTheDay}
        </p>
      </section>
    </div>
  );
}

function TeacherBookingCard({
  booking,
  accent,
}: {
  booking: {
    id: string;
    mae: { name: string };
    childName: string;
    date: Date;
    startTime: string;
    endTime: string;
    notes: string | null;
    teacherNote: string | null;
    status: string;
    modality: string;
    address: string | null;
  };
  accent: "amber" | "primary" | "muted" | "done";
}) {
  const accentBorder = {
    amber: "border-l-4 border-l-amber-400",
    primary: "border-l-4 border-l-primary-400",
    muted: "border-l-4 border-l-primary-100",
    done: "border-l-4 border-l-emerald-400",
  }[accent];

  return (
    <div
      className={`rounded-lg border border-primary-100 bg-white p-5 ${accentBorder}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-primary-700">{booking.mae.name}</p>
          <p className="text-sm text-primary-700/70">
            Criança: {booking.childName}
          </p>
          <p className="text-sm text-primary-700/70">
            {formatDateBR(booking.date)} ·{" "}
            {booking.startTime} às {booking.endTime}
          </p>
          {booking.modality !== "ONLINE" && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-accent-600">
              <Home className="h-3.5 w-3.5" />
              {PROFESSORA_MODALITY_LABELS[booking.modality]}
            </p>
          )}
          {booking.address && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-primary-700/70">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
              {booking.address}
            </p>
          )}
          {booking.notes && (
            <p className="mt-1 text-sm italic text-primary-700/60">
              &quot;{booking.notes}&quot;
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[booking.status]}`}
        >
          {STATUS_LABELS[booking.status]}
        </span>
      </div>

      {(booking.status === "PENDENTE" || booking.status === "CONFIRMADA") && (
        <div className="mt-3">
          <BookingActions bookingId={booking.id} />
        </div>
      )}

      {booking.status === "CONCLUIDA" && !booking.teacherNote && (
        <TeacherNoteForm bookingId={booking.id} />
      )}

      {booking.teacherNote && (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="font-semibold">Sua nota: </span>
          {booking.teacherNote}
        </p>
      )}
    </div>
  );
}
