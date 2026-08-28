import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_RULES,
  canReceiveRelationshipEmail,
  daysBetween,
  dedupeKey,
  isInWindow,
  type EngagementKind,
} from "./engagement";

const NOW = new Date("2026-08-28T12:00:00.000Z");

function diasAtras(dias: number): Date {
  return new Date(NOW.getTime() - dias * 24 * 60 * 60 * 1000);
}

describe("janelas de disparo", () => {
  it("não dispara antes da janela começar", () => {
    // Criou a conta ontem: cedo demais pra cutucar.
    expect(isInWindow(diasAtras(1), NOW, "CADASTRO_SEM_AGENDAMENTO")).toBe(false);
  });

  it("dispara dentro da janela", () => {
    expect(isInWindow(diasAtras(5), NOW, "CADASTRO_SEM_AGENDAMENTO")).toBe(true);
  });

  it("não dispara depois da janela fechar", () => {
    // Este é o teste que importa: sem o limite superior, a primeira execução
    // varreria a base inteira e mandaria e-mail pra quem se cadastrou há um ano.
    expect(isInWindow(diasAtras(400), NOW, "CADASTRO_SEM_AGENDAMENTO")).toBe(false);
  });

  it("toda regra tem começo e fim, e o fim vem depois do começo", () => {
    for (const [kind, regra] of Object.entries(ENGAGEMENT_RULES)) {
      expect(regra.maxDays, `${kind}`).toBeGreaterThan(regra.minDays);
    }
  });

  it("toda janela é larga o bastante pra sobreviver a um cron que falhou", () => {
    // O cron roda uma vez por dia. Se a janela fosse de um dia só, uma falha
    // de execução perderia aquelas pessoas pra sempre.
    for (const [kind, regra] of Object.entries(ENGAGEMENT_RULES)) {
      expect(regra.maxDays - regra.minDays, `${kind}`).toBeGreaterThanOrEqual(6);
    }
  });

  it("cobre as bordas exatas da janela", () => {
    const { minDays, maxDays } = ENGAGEMENT_RULES.PEDIDO_AVALIACAO;
    expect(isInWindow(diasAtras(minDays), NOW, "PEDIDO_AVALIACAO")).toBe(true);
    expect(isInWindow(diasAtras(maxDays), NOW, "PEDIDO_AVALIACAO")).toBe(true);
    expect(isInWindow(diasAtras(minDays - 1), NOW, "PEDIDO_AVALIACAO")).toBe(false);
    expect(isInWindow(diasAtras(maxDays + 1), NOW, "PEDIDO_AVALIACAO")).toBe(false);
  });
});

describe("daysBetween", () => {
  it("conta dias completos, ignorando as horas sobrando", () => {
    expect(daysBetween(new Date("2026-08-20T23:00:00.000Z"), NOW)).toBe(7);
  });
});

describe("dedupeKey", () => {
  it("amarra o tipo da mensagem ao registro que a originou", () => {
    expect(dedupeKey("PEDIDO_AVALIACAO", "booking1")).toBe(
      "PEDIDO_AVALIACAO:booking1"
    );
  });

  it("nunca colide entre tipos diferentes sobre o mesmo registro", () => {
    const kinds: EngagementKind[] = [
      "CADASTRO_SEM_AGENDAMENTO",
      "PEDIDO_AVALIACAO",
      "CONVITE_INDICACAO",
    ];
    const chaves = kinds.map((kind) => dedupeKey(kind, "mesmo-id"));
    expect(new Set(chaves).size).toBe(kinds.length);
  });
});

describe("canReceiveRelationshipEmail", () => {
  it("exclui quem se descadastrou", () => {
    expect(
      canReceiveRelationshipEmail({
        unsubscribedAt: new Date(),
        email: "a@b.com",
      })
    ).toBe(false);
  });

  it("aceita quem não se descadastrou", () => {
    expect(
      canReceiveRelationshipEmail({ unsubscribedAt: null, email: "a@b.com" })
    ).toBe(true);
  });
});
