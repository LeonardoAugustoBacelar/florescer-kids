import { describe, expect, it, beforeAll } from "vitest";
import { buildUnsubscribeUrl, isValidUnsubscribeToken } from "./unsubscribe";

beforeAll(() => {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "segredo-de-teste";
});

function tokenDa(url: string): string {
  return new URL(url).searchParams.get("t")!;
}

describe("link de descadastro", () => {
  it("gera um link com id e assinatura", () => {
    const url = new URL(buildUnsubscribeUrl("user123"));
    expect(url.pathname).toBe("/descadastro");
    expect(url.searchParams.get("u")).toBe("user123");
    expect(url.searchParams.get("t")).toBeTruthy();
  });

  it("valida o próprio token que gerou", () => {
    const token = tokenDa(buildUnsubscribeUrl("user123"));
    expect(isValidUnsubscribeToken("user123", token)).toBe(true);
  });

  it("recusa o token de outra usuária", () => {
    // Sem isso, quem recebesse um e-mail poderia descadastrar qualquer pessoa
    // trocando o id na URL.
    const token = tokenDa(buildUnsubscribeUrl("user123"));
    expect(isValidUnsubscribeToken("outra-pessoa", token)).toBe(false);
  });

  it("recusa token adulterado ou vazio", () => {
    expect(isValidUnsubscribeToken("user123", "")).toBe(false);
    expect(isValidUnsubscribeToken("user123", "a".repeat(32))).toBe(false);
  });
});
