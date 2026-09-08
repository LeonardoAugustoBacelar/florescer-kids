// Leitura do e-mail publicado no site da instituição.
//
// Complementa o OpenStreetMap: boa parte das fichas já traz `contact:email`,
// e para as que não trazem, resta entrar no site que a própria organização
// publicou — que é onde ela pede para ser contatada.

import { extrairEmails } from "./prospect";

// Onde escola pequena costuma publicar o e-mail, em ordem de chance.
const CAMINHOS_CONTATO = ["", "/contato", "/contato.html", "/fale-conosco", "/sobre"];

/**
 * Procura um e-mail publicado no site da instituição.
 *
 * Falha em silêncio de propósito: site fora do ar, certificado vencido e
 * página em JavaScript puro são comuns nesse universo, e nenhum desses casos
 * deve derrubar a busca inteira. Sem e-mail, o prospect entra na fila mesmo
 * assim — o contato vira telefone, na mão.
 */
export async function buscarEmailNoSite(
  website: string,
  timeoutMs = 8000
): Promise<string[]> {
  const achados: string[] = [];

  for (const caminho of CAMINHOS_CONTATO) {
    try {
      const url = new URL(caminho, website).toString();
      const resposta = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "FlorescerKidsBot/1.0 (+https://florescerkids.com.br)" },
        redirect: "follow",
      });
      if (!resposta.ok) continue;
      const html = await resposta.text();
      achados.push(...extrairEmails(html));
      if (achados.length > 0) break;
    } catch {
      // Site inacessível: segue pro próximo caminho, e no fim segue sem e-mail.
    }
  }

  return [...new Set(achados)];
}
