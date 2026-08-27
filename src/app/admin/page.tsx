import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateBR } from "@/lib/date";
import TeacherApprovalToggle from "@/components/dashboard/TeacherApprovalToggle";
import DenyTeacherButton from "@/components/dashboard/DenyTeacherButton";
import DeleteBookingButton from "@/components/dashboard/DeleteBookingButton";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const teachers = await prisma.teacherProfile.findMany({
    include: { user: true, bookings: true },
    orderBy: { createdAt: "desc" },
  });

  const recentBookings = await prisma.booking.findMany({
    include: { mae: true, teacher: { include: { user: true } } },
    orderBy: { date: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-serif-display text-3xl font-semibold text-primary-700">
        Painel de administração
      </h1>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-primary-700">Professora</h2>
        <div className="mt-4 space-y-3">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-100 bg-white p-5"
            >
              <div>
                <p className="font-bold text-primary-700">
                  {teacher.user.name}
                </p>
                <p className="text-sm text-primary-700/70">
                  {teacher.user.email} · {teacher.specialties}
                </p>
                <p className="text-xs text-primary-700/60">
                  {teacher.bookings.length} aula(s) agendada(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    teacher.approved
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {teacher.approved ? "Aprovada" : "Pendente"}
                </span>
                <TeacherApprovalToggle
                  teacherId={teacher.id}
                  approved={teacher.approved}
                />
                {!teacher.approved && (
                  <DenyTeacherButton teacherId={teacher.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-primary-700">
          Últimas reservas
        </h2>
        <p className="mt-1 text-sm text-primary-700/70">
          Pagamento é combinado direto por PIX entre mãe e professora — aqui é
          só um acompanhamento dos agendamentos.
        </p>
        {recentBookings.length === 0 ? (
          <p className="mt-4 text-primary-700/80">
            Nenhuma reserva ainda.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {recentBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-100 bg-white p-5"
              >
                <div>
                  <p className="font-bold text-primary-700">
                    {booking.mae.name}{" "}
                    <span className="font-normal text-primary-700/60">
                      com {booking.teacher.user.name}
                    </span>
                  </p>
                  <p className="text-sm text-primary-700/70">
                    {formatDateBR(booking.date)} ·{" "}
                    {booking.startTime} às {booking.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                    {booking.status}
                  </span>
                  {booking.status === "CANCELADA" && (
                    <DeleteBookingButton bookingId={booking.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
