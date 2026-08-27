// Regras fixas de horário do Florescer Kids: aulas de 1h, começando às
// 17h em dias de semana e às 14h em finais de semana, até as 20h, com no
// máximo 3 aulas por dia (capacidade da professora).

import { getWeekday } from "@/lib/date";

export const SCHEDULE_RULES = {
  weekdayStart: "17:00",
  weekendStart: "14:00",
  end: "20:00",
  slotDurationMinutes: 60,
  maxBookingsPerDay: 3,
} as const;

// Mesmo horário do atendimento online, mas só 1 aula por dia — deslocamento
// até/da casa da família não permite empilhar como no online.
export const DOMICILIO_SCHEDULE_RULES = {
  ...SCHEDULE_RULES,
  maxBookingsPerDay: 1,
} as const;

export type ScheduleRules = {
  weekdayStart: string;
  weekendStart: string;
  end: string;
  slotDurationMinutes: number;
  maxBookingsPerDay: number;
};

export type TimeSlot = { startTime: string; endTime: string };

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

export function isWeekend(date: Date): boolean {
  const day = getWeekday(date);
  return day === 0 || day === 6;
}

/** Todos os horários possíveis (independente de reserva) para uma data. */
export function getDaySlots(
  date: Date,
  rules: ScheduleRules = SCHEDULE_RULES
): TimeSlot[] {
  const start = isWeekend(date) ? rules.weekendStart : rules.weekdayStart;
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(rules.end);

  const slots: TimeSlot[] = [];
  for (
    let minutes = startMinutes;
    minutes + rules.slotDurationMinutes <= endMinutes;
    minutes += rules.slotDurationMinutes
  ) {
    slots.push({
      startTime: minutesToTime(minutes),
      endTime: minutesToTime(minutes + rules.slotDurationMinutes),
    });
  }
  return slots;
}

export function isValidSlot(
  date: Date,
  startTime: string,
  endTime: string,
  rules: ScheduleRules = SCHEDULE_RULES
): boolean {
  return getDaySlots(date, rules).some(
    (slot) => slot.startTime === startTime && slot.endTime === endTime
  );
}
