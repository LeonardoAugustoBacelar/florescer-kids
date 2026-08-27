"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateBR, parseDateOnly } from "@/lib/date";
import { Prisma } from "@/generated/prisma/client";
import {
  DOMICILIO_SCHEDULE_RULES,
  isValidSlot,
  SCHEDULE_RULES,
} from "@/lib/schedule";
import { sendNewBookingNotificationEmail } from "@/lib/email";

export type BookingState = {
  error?: string;
  success?: boolean;
};

const bookingSchema = z
  .object({
    teacherId: z.string().min(1),
    childName: z.string().min(2, "Informe o nome da criança"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha uma data"),
    startTime: z.string().min(1, "Escolha um horário"),
    endTime: z.string().min(1),
    notes: z.string().optional(),
    modality: z
      .enum(["ONLINE", "DOMICILIO_CASA_ALUNO", "DOMICILIO_CASA_PROFESSORA"])
      .default("ONLINE"),
    address: z.string().optional(),
  })
  .refine(
    (data) =>
      data.modality !== "DOMICILIO_CASA_ALUNO" ||
      (data.address && data.address.trim().length >= 5),
    {
      message: "Informe o endereço completo para a professora ir até você",
      path: ["address"],
    }
  );

export async function createBookingAction(
  _prevState: BookingState,
  formData: FormData
): Promise<BookingState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAE") {
    return { error: "Você precisa entrar com uma conta de mãe para agendar." };
  }

  const parsed = bookingSchema.safeParse({
    teacherId: formData.get("teacherId"),
    childName: formData.get("childName"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    notes: formData.get("notes") || undefined,
    modality: formData.get("modality") || undefined,
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const data = parsed.data;
  const bookingDate = parseDateOnly(data.date);
  const isDomicilio = data.modality !== "ONLINE";
  const rules = isDomicilio ? DOMICILIO_SCHEDULE_RULES : SCHEDULE_RULES;
  const sameModalityGroup = isDomicilio
    ? (["DOMICILIO_CASA_ALUNO", "DOMICILIO_CASA_PROFESSORA"] as const)
    : (["ONLINE"] as const);

  if (!isValidSlot(bookingDate, data.startTime, data.endTime, rules)) {
    return { error: "Horário inválido. Escolha um dos horários disponíveis." };
  }

  const blockedDate = await prisma.blockedDate.findUnique({
    where: { teacherId_date: { teacherId: data.teacherId, date: bookingDate } },
  });

  if (blockedDate) {
    return { error: "A professora não está disponível nesse dia. Escolha outra data." };
  }

  const conflict = await prisma.booking.findFirst({
    where: {
      teacherId: data.teacherId,
      date: bookingDate,
      startTime: data.startTime,
      status: { in: ["PENDENTE", "CONFIRMADA"] },
    },
  });

  if (conflict) {
    return { error: "Esse horário já está reservado. Escolha outro." };
  }

  const bookingsThisDay = await prisma.booking.count({
    where: {
      teacherId: data.teacherId,
      date: bookingDate,
      status: { in: ["PENDENTE", "CONFIRMADA"] },
      modality: { in: [...sameModalityGroup] },
    },
  });

  if (bookingsThisDay >= rules.maxBookingsPerDay) {
    return {
      error: isDomicilio
        ? "Esse dia já tem um atendimento a domicílio marcado. Escolha outro dia."
        : `Esse dia já atingiu o limite de ${rules.maxBookingsPerDay} aulas. Escolha outro dia.`,
    };
  }

  try {
    const created = await prisma.booking.create({
      data: {
        maeId: session.user.id,
        teacherId: data.teacherId,
        childName: data.childName,
        date: bookingDate,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
        modality: data.modality,
        address: data.modality === "DOMICILIO_CASA_ALUNO" ? data.address : null,
      },
      include: { teacher: { include: { user: true } }, mae: true },
    });

    try {
      const notifyEmail =
        created.teacher.notificationEmail || created.teacher.user.email;
      await sendNewBookingNotificationEmail(notifyEmail, {
        maeName: created.mae.name,
        childName: created.childName,
        date: formatDateBR(bookingDate),
        startTime: created.startTime,
        endTime: created.endTime,
        modality: created.modality,
        address: created.address,
      });
    } catch (emailError) {
      // Aviso por e-mail é um extra — se falhar, a reserva já foi criada
      // com sucesso, então só registramos o erro sem quebrar o fluxo.
      console.error("Falha ao enviar aviso de novo agendamento", emailError);
    }
  } catch (error) {
    // Alguém reservou esse mesmo horário entre a checagem acima e agora
    // (corrida) — o índice único no banco (ver migração
    // add_booking_slot_unique_index) é quem garante isso de verdade.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro horário.",
      };
    }
    throw error;
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelOwnBookingAction(bookingId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MAE") {
    throw new Error("Não autorizado");
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking || booking.maeId !== session.user.id) {
    throw new Error("Não autorizado");
  }

  if (booking.status !== "PENDENTE" && booking.status !== "CONFIRMADA") {
    throw new Error("Esta aula não pode mais ser cancelada.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELADA" },
  });

  revalidatePath("/dashboard");
}

export async function updateBookingStatusAction(
  bookingId: string,
  status: "CONFIRMADA" | "CANCELADA" | "CONCLUIDA"
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSORA") {
    throw new Error("Não autorizado");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { teacher: true },
  });

  if (!booking || booking.teacher.userId !== session.user.id) {
    throw new Error("Não autorizado");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });

  revalidatePath("/dashboard");
}

export async function addTeacherNoteAction(bookingId: string, note: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSORA") {
    throw new Error("Não autorizado");
  }

  const trimmed = note.trim();
  if (trimmed.length === 0) {
    throw new Error("A nota não pode ficar vazia.");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { teacher: true },
  });

  if (!booking || booking.teacher.userId !== session.user.id) {
    throw new Error("Não autorizado");
  }

  if (booking.status !== "CONCLUIDA") {
    throw new Error("Só é possível anotar aulas já concluídas.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { teacherNote: trimmed },
  });

  revalidatePath("/dashboard");
}
