// Link de descadastro que funciona sem login.
//
// Em vez de guardar um token por usuária no banco, assinamos o id com o
// AUTH_SECRET: o link é verificável, não expira e não precisa de tabela. Quem
// não tem o segredo não consegue forjar um descadastro de terceiros.

import { createHmac, timingSafeEqual } from "crypto";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function sign(userId: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", secret).update(userId).digest("hex").slice(0, 32);
}

export function buildUnsubscribeUrl(userId: string): string {
  const params = new URLSearchParams({ u: userId, t: sign(userId) });
  return `${siteUrl}/descadastro?${params.toString()}`;
}

export function isValidUnsubscribeToken(userId: string, token: string): boolean {
  const expected = sign(userId);
  // Comparação de tempo constante: comparar com === vazaria, pelo tempo de
  // resposta, quantos caracteres iniciais o palpite acertou.
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
