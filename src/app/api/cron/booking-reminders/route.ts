import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, formatDateBR, startOfToday } from "@/lib/date";
import { sendBookingReminderEmail } from "@/lib/email";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tomorrowStart = addDays(startOfToday(), 1);
  const tomorrowEnd = addDays(tomorrowStart, 1);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMADA",
      date: { gte: tomorrowStart, lt: tomorrowEnd },
    },
    include: { mae: true, teacher: { include: { user: true } } },
  });

  let sent = 0;
  for (const booking of bookings) {
    const whatsappUrl = buildWhatsAppLink(
      booking.teacher.whatsapp,
      `Olá, ${booking.teacher.user.name}! Sobre a aula de ${booking.childName} amanhã às ${booking.startTime}...`
    );

    await sendBookingReminderEmail(booking.mae.email, {
      childName: booking.childName,
      teacherName: booking.teacher.user.name,
      date: formatDateBR(booking.date),
      startTime: booking.startTime,
      whatsappUrl,
      videoCallLink: booking.teacher.videoCallLink,
    });
    sent += 1;
  }

  return NextResponse.json({ sent });
}
