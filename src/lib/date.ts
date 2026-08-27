// Datas de aula (`Booking.date`, `BlockedDate.date`) são datas de calendário,
// sem hora: guardamos sempre a meia-noite UTC do dia. Criar uma delas com
// `new Date("2026-08-10")` (meia-noite UTC) e outra com
// `new Date("2026-08-10T00:00:00")` (meia-noite local) faz o mesmo dia virar
// dois instantes diferentes no banco — e aí a comparação por igualdade que
// sustenta o bloqueio de dias e a checagem de horário ocupado só funciona por
// acidente, num servidor que roda em UTC. Todo código que cria, compara ou
// exibe essas datas passa por aqui.

/** Fuso do atendimento — usado só pra saber que dia é "hoje" para a família. */
const TIME_ZONE = "America/Sao_Paulo";

/** "2026-08-10" → meia-noite UTC desse dia. */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Meia-noite UTC → "2026-08-10". Chave estável pra comparar dias. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Hoje no fuso do atendimento, como meia-noite UTC. */
export function startOfToday(): Date {
  return parseDateOnly(
    new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date())
  );
}

/** Soma dias mantendo a meia-noite UTC (imune a horário de verão). */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Dia da semana lido em UTC: 0 (domingo) a 6 (sábado). */
export function getWeekday(date: Date): number {
  return date.getUTCDay();
}

/**
 * "10/08/2026". Formatado em UTC de propósito: no fuso do Brasil, a meia-noite
 * UTC cai no dia anterior — sem isso a mesma aula aparece com um dia a menos no
 * navegador da mãe, que renderiza no fuso dela.
 */
export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
