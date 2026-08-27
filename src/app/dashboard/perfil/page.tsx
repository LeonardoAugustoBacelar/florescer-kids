import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/date";
import TeacherProfileForm from "@/components/dashboard/TeacherProfileForm";
import BlockedDatesManager from "@/components/dashboard/BlockedDatesManager";

export const metadata: Metadata = {
  title: "Editar perfil",
  robots: { index: false, follow: false },
};

export default async function EditarPerfilPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "PROFESSORA") {
    redirect("/dashboard");
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      blockedDates: {
        where: { date: { gte: startOfToday() } },
        orderBy: { date: "asc" },
      },
    },
  });

  if (!teacherProfile) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700/70 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <h1 className="mt-4 font-serif-display text-3xl font-semibold text-primary-700">
        Meu perfil público
      </h1>
      <p className="mt-1 text-sm text-primary-700/70">
        Essas informações aparecem na sua página pública, que as mães veem
        antes de agendar uma aula.
      </p>

      <div className="mt-8 rounded-lg border border-primary-100 bg-white p-6">
        <TeacherProfileForm
          bio={teacherProfile.bio}
          specialties={teacherProfile.specialties}
          credentials={teacherProfile.credentials}
          whatsapp={teacherProfile.whatsapp}
          pricePerHour={teacherProfile.pricePerHour}
          photoUrl={teacherProfile.photoUrl}
          videoCallLink={teacherProfile.videoCallLink}
          notificationEmail={teacherProfile.notificationEmail}
          offersDomicilio={teacherProfile.offersDomicilio}
          pricePerHourDomicilio={teacherProfile.pricePerHourDomicilio}
          domicilioAddress={teacherProfile.domicilioAddress}
        />
      </div>

      <h2 className="mt-10 font-serif-display text-xl font-semibold text-primary-700">
        Bloquear dias
      </h2>
      <div className="mt-4 rounded-lg border border-primary-100 bg-white p-6">
        <BlockedDatesManager blockedDates={teacherProfile.blockedDates} />
      </div>
    </div>
  );
}
