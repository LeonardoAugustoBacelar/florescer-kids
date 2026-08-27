import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDateBR,
  getWeekday,
  parseDateOnly,
  startOfToday,
  toDateKey,
} from "./date";

// O ponto destes testes é a independência de fuso: nenhuma asserção aqui pode
// mudar de resultado conforme o TZ de quem roda (dev no Brasil, CI e Vercel em
// UTC) — era exatamente essa dependência que fazia dia bloqueado e dia
// agendado virarem instantes diferentes no banco.

describe("parseDateOnly", () => {
  it("sempre devolve a meia-noite UTC do dia informado", () => {
    expect(parseDateOnly("2026-08-10").toISOString()).toBe(
      "2026-08-10T00:00:00.000Z"
    );
  });

  it("faz ida e volta com toDateKey", () => {
    expect(toDateKey(parseDateOnly("2026-01-01"))).toBe("2026-01-01");
    expect(toDateKey(parseDateOnly("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("addDays", () => {
  it("atravessa a virada de mês", () => {
    expect(toDateKey(addDays(parseDateOnly("2026-08-31"), 1))).toBe(
      "2026-09-01"
    );
  });

  it("atravessa a virada de ano", () => {
    expect(toDateKey(addDays(parseDateOnly("2026-12-31"), 1))).toBe(
      "2027-01-01"
    );
  });

  it("mantém a meia-noite UTC depois de somar 14 dias", () => {
    const result = addDays(parseDateOnly("2026-08-10"), 14);
    expect(result.toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("não altera a data original", () => {
    const original = parseDateOnly("2026-08-10");
    addDays(original, 5);
    expect(toDateKey(original)).toBe("2026-08-10");
  });
});

describe("getWeekday", () => {
  it("identifica o dia da semana pela data de calendário, não pelo fuso local", () => {
    expect(getWeekday(parseDateOnly("2026-08-09"))).toBe(0); // domingo
    expect(getWeekday(parseDateOnly("2026-08-10"))).toBe(1); // segunda
    expect(getWeekday(parseDateOnly("2026-08-08"))).toBe(6); // sábado
  });
});

describe("formatDateBR", () => {
  it("mostra o mesmo dia guardado, sem recuar um dia no fuso do Brasil", () => {
    expect(formatDateBR(parseDateOnly("2026-08-10"))).toBe("10/08/2026");
    expect(formatDateBR(parseDateOnly("2026-01-01"))).toBe("01/01/2026");
  });
});

describe("startOfToday", () => {
  it("é uma meia-noite UTC, comparável direto com as datas do banco", () => {
    const today = startOfToday();
    expect(today.getUTCHours()).toBe(0);
    expect(today.getUTCMinutes()).toBe(0);
    expect(today.getUTCSeconds()).toBe(0);
    expect(today.getUTCMilliseconds()).toBe(0);
    expect(toDateKey(today)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
