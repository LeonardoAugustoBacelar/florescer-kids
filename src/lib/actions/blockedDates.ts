"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseDateOnly } from "@/lib/date";

export type BlockedDateState = {
  error?: string;
  success?: boolean;
};

const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha uma data"),
  reason: z.string().trim().optional(),
});

export async function addBlockedDateAction(
  _prevState: BlockedDateState,
  formData: FormData
): Promise<BlockedDateState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSORA") {
    return { error: "Não autorizado" };
  }

  const parsed = blockSchema.safeParse({
    date: formData.get("date"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!teacherProfile) {
    return { error: "Não autorizado" };
  }

  const date = parseDateOnly(parsed.data.date);

  const existing = await prisma.blockedDate.findUnique({
    where: { teacherId_date: { teacherId: teacherProfile.id, date } },
  });

  if (existing) {
    return { error: "Esse dia já está bloqueado." };
  }

  await prisma.blockedDate.create({
    data: {
      teacherId: teacherProfile.id,
      date,
      reason: parsed.data.reason || null,
    },
  });

  revalidatePath("/dashboard/perfil");
  revalidatePath("/horarios");
  revalidatePath("/professoras");
  return { success: true };
}

export async function removeBlockedDateAction(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSORA") {
    throw new Error("Não autorizado");
  }

  const blockedDate = await prisma.blockedDate.findUnique({
    where: { id },
    include: { teacher: true },
  });

  if (!blockedDate || blockedDate.teacher.userId !== session.user.id) {
    throw new Error("Não autorizado");
  }

  await prisma.blockedDate.delete({ where: { id } });

  revalidatePath("/dashboard/perfil");
  revalidatePath("/horarios");
  revalidatePath("/professoras");
}
