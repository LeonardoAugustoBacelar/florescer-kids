// Regras dos disparos automáticos de relacionamento.
//
// A lógica de "quem merece receber o quê" fica aqui, pura, longe do banco e do
// envio — assim dá pra testar as bordas sem subir nada. O cron em
// /api/cron/engajamento só busca os dados e aplica estas funções.

export type EngagementKind =
  | "CADASTRO_SEM_AGENDAMENTO"
  | "RESERVA_PENDENTE_PROFESSORA"
  | "PEDIDO_AVALIACAO"
  | "CONVITE_INDICACAO"
  | "REENGAJAMENTO_30_DIAS";

/**
 * Toda regra tem começo E fim de janela — e o fim é o mais importante dos dois.
 *
 * Sem o limite superior, a primeira execução varreria a base inteira e mandaria
 * e-mail para todo mundo que já passou pelo site, inclusive quem se cadastrou
 * há um ano. Isso é indistinguível de spam para quem recebe, e queima o
 * domínio de envio de uma vez só. Com o limite, cada disparo alcança só quem
 * entrou naquela janela recentemente.
 */
export const ENGAGEMENT_RULES = {
  CADASTRO_SEM_AGENDAMENTO: { minDays: 3, maxDays: 10 },
  RESERVA_PENDENTE_PROFESSORA: { minDays: 2, maxDays: 9 },
  PEDIDO_AVALIACAO: { minDays: 2, maxDays: 16 },
  CONVITE_INDICACAO: { minDays: 1, maxDays: 15 },
  REENGAJAMENTO_30_DIAS: { minDays: 30, maxDays: 44 },
} as const satisfies Record<EngagementKind, { minDays: number; maxDays: number }>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** O evento aconteceu dentro da janela de disparo desta regra? */
export function isInWindow(
  eventDate: Date,
  now: Date,
  kind: EngagementKind
): boolean {
  const { minDays, maxDays } = ENGAGEMENT_RULES[kind];
  const age = daysBetween(eventDate, now);
  return age >= minDays && age <= maxDays;
}

/**
 * Chave de deduplicação — é ela que vira índice único no banco. Amarra o tipo
 * da mensagem ao registro que a originou (usuária, reserva ou avaliação), então
 * a mesma mensagem sobre o mesmo fato nunca sai duas vezes.
 */
export function dedupeKey(kind: EngagementKind, entityId: string): string {
  return `${kind}:${entityId}`;
}

/** Quem optou por não receber fica de fora de tudo que não for transacional. */
export function canReceiveRelationshipEmail(user: {
  unsubscribedAt: Date | null;
  email: string;
}): boolean {
  return user.unsubscribedAt === null && user.email.includes("@");
}
