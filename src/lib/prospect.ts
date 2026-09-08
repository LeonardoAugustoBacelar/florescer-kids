// Regras da prospecção de parceiros institucionais.
//
// Mesma divisão do engagement.ts: a decisão de "quem vale a pena, e o que
// escrever pra essa pessoa" mora aqui, pura, sem banco e sem rede. O client do
// OpenStreetMap (overpass.ts) e o script (scripts/prospectar.ts) só trazem os
// dados e aplicam estas funções.

export type ProspectKind =
  | "ESCOLA_INFANTIL"
  | "CRECHE"
  | "CLINICA_PEDIATRICA"
  | "PSICOLOGIA"
  | "FONOAUDIOLOGIA"
  | "OUTRO";

export type Coordenada = { lat: number; lng: number };

/**
 * Cotia-SP, centro. É a origem de tudo: o raio da busca sai daqui e a
 * distância guardada em cada prospect é medida a partir deste ponto, porque a
 * parceria que rende aula presencial é a que a professora consegue atender.
 */
export const BASE: Coordenada = { lat: -23.6039, lng: -46.9189 };

export const RAIO_PADRAO_KM = 20;

/**
 * Termos de busca por tipo de parceiro.
 *
 * Sobraram da busca por texto e hoje servem só de documentação do que cada
 * categoria abrange — o OpenStreetMap é consultado por tag, em overpass.ts.
 */
export const BUSCAS: Record<Exclude<ProspectKind, "OUTRO">, string[]> = {
  ESCOLA_INFANTIL: ["escola infantil", "educação infantil", "colégio infantil"],
  CRECHE: ["creche", "berçário"],
  CLINICA_PEDIATRICA: ["pediatra", "clínica pediátrica"],
  PSICOLOGIA: ["psicólogo infantil", "psicologia infantil"],
  FONOAUDIOLOGIA: ["fonoaudiólogo", "fonoaudiologia infantil"],
};

const PALAVRAS_POR_TIPO: Array<[ProspectKind, RegExp]> = [
  ["CRECHE", /\b(creche|ber[çc][áa]rio)\b/i],
  ["FONOAUDIOLOGIA", /\bfono/i],
  ["PSICOLOGIA", /\b(psic[óo]log|psicologia|psicopedag)/i],
  ["CLINICA_PEDIATRICA", /\b(pediatr|puericultura)/i],
  ["ESCOLA_INFANTIL", /\b(escola|col[ée]gio|educa[çc][ãa]o infantil|jardim)\b/i],
];

/**
 * Classifica pela ficha do mapa. O nome manda mais que a categoria: no OSM
 * quase tudo entra como `school`, e metade disso é creche.
 */
export function classificar(name: string, types: string[] = []): ProspectKind {
  for (const [kind, padrao] of PALAVRAS_POR_TIPO) {
    if (padrao.test(name)) return kind;
  }
  // Categorias do OpenStreetMap.
  if (types.includes("kindergarten")) return "CRECHE";
  if (types.includes("childcare")) return "CRECHE";
  if (types.includes("speech_therapist")) return "FONOAUDIOLOGIA";
  if (types.includes("psychotherapist")) return "PSICOLOGIA";
  if (types.includes("school")) return "ESCOLA_INFANTIL";
  if (types.includes("clinic") || types.includes("doctors")) {
    return "CLINICA_PEDIATRICA";
  }
  return "OUTRO";
}

const RAIO_TERRA_KM = 6371;

export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

export type PlaceBruto = {
  placeId: string;
  name: string;
  address: string;
  location: Coordenada;
  types?: string[];
  phone?: string | null;
  website?: string | null;
  // O OpenStreetMap frequentemente já traz o e-mail de contato na ficha, o
  // que dispensa entrar no site atrás dele.
  email?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  businessStatus?: string | null;
};

/**
 * Vale a pena entrar na fila?
 *
 * O filtro existe porque a fila é trabalho humano: cada linha aqui é um
 * e-mail que a Gilda vai ler antes de enviar. Entulhar com ficha fechada ou
 * sem nenhum canal de contato só faz ela gastar tempo descartando.
 */
export function valeContatar(
  place: PlaceBruto,
  raioKm = RAIO_PADRAO_KM
): boolean {
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") {
    return false;
  }
  if (!place.phone && !place.website && !place.email) return false;
  return distanciaKm(BASE, place.location) <= raioKm;
}

/**
 * E-mails publicados na página da instituição.
 *
 * Só o que a própria organização expôs no site dela, que é onde ela pede pra
 * ser contatada. Descarta os endereços de fornecedor de site e de imagem, que
 * aparecem no rodapé de template e não são da escola.
 */
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const DOMINIOS_IGNORADOS =
  /@(example|sentry|wixpress|squarespace|godaddy|jimdo|wordpress|shutterstock|gmail\.com\.br)\b/i;

export function extrairEmails(html: string): string[] {
  const achados = html.match(EMAIL_RE) ?? [];
  const limpos = achados
    .map((e) => e.toLowerCase().replace(/\.$/, ""))
    .filter((e) => !DOMINIOS_IGNORADOS.test(e))
    .filter((e) => !/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e));
  return [...new Set(limpos)];
}

/** Domínio registrável aproximado: as duas (ou três, no .com.br) últimas partes. */
function dominio(host: string): string {
  const partes = host.toLowerCase().replace(/^www\./, "").split(".");
  const corte = partes.length > 2 && partes.at(-2) === "com" ? 3 : 2;
  return partes.slice(-corte).join(".");
}

/**
 * O melhor palpite de e-mail de contato entre os encontrados no site.
 *
 * A regra de maior peso é o domínio bater com o do site, e ela existe por um
 * caso concreto: o Colégio Desafio publica no rodapé o endereço da agência que
 * fez a página, e sem esta checagem o primeiro contato iria pro fornecedor de
 * site em vez de pra escola.
 */
export function escolherEmail(
  emails: string[],
  website?: string | null
): string | null {
  if (emails.length === 0) return null;

  let doSite = emails;
  if (website) {
    try {
      const alvo = dominio(new URL(website).hostname);
      const mesmos = emails.filter((e) => dominio(e.split("@")[1] ?? "") === alvo);
      if (mesmos.length > 0) doSite = mesmos;
    } catch {
      // URL inválida no OSM acontece; segue sem o filtro de domínio.
    }
  }

  const preferido = doSite.find((e) =>
    /^(contato|secretaria|atendimento|coordenacao|falecom|info)@/.test(e)
  );
  return preferido ?? doSite[0];
}

const ABERTURA_POR_TIPO: Record<ProspectKind, string> = {
  ESCOLA_INFANTIL:
    "Sou professora de apoio pedagógico e comportamento infantil aqui em Cotia, e acompanho de perto o tipo de dificuldade que costuma aparecer na sala de aula — criança que não para quieta, que trava na alfabetização, que resiste à rotina.",
  CRECHE:
    "Sou professora de apoio pedagógico e comportamento infantil aqui em Cotia, e trabalho justamente com a faixa em que birra, mordida e dificuldade de adaptação ainda são parte do desenvolvimento — mas cansam a equipe e assustam os pais.",
  CLINICA_PEDIATRICA:
    "Sou professora de apoio pedagógico e comportamento infantil aqui em Cotia. Boa parte das queixas de comportamento que chegam ao consultório não são clínicas: são de rotina, limite e adaptação escolar.",
  PSICOLOGIA:
    "Sou professora de apoio pedagógico e comportamento infantil aqui em Cotia, e trabalho no que fica ao lado do seu: a parte escolar e de rotina, que aparece junto mas não é terapia.",
  FONOAUDIOLOGIA:
    "Sou professora de apoio pedagógico e comportamento infantil aqui em Cotia, e atendo muitas crianças que estão em fono e travam também na leitura e na escrita.",
  OUTRO:
    "Sou professora de apoio pedagógico e comportamento infantil aqui em Cotia, e atendo crianças com dificuldade escolar e de comportamento.",
};

const OFERTA_POR_TIPO: Record<ProspectKind, string> = {
  ESCOLA_INFANTIL:
    "Queria propor uma roda de conversa gratuita com os pais da escola — 40 minutos sobre limites e rotina de estudo em casa, sem venda nenhuma no meio. Vocês oferecem algo útil às famílias e eu me apresento pra comunidade.",
  CRECHE:
    "Queria propor um encontro gratuito com as famílias — 40 minutos sobre birra, limites e adaptação, sem venda nenhuma no meio. Vocês oferecem algo útil aos pais e eu me apresento pra comunidade.",
  CLINICA_PEDIATRICA:
    "Queria me colocar à disposição como encaminhamento para essas famílias, e deixar com vocês alguns materiais sobre rotina de estudo que costumam resolver a dúvida ali mesmo na consulta.",
  PSICOLOGIA:
    "Queria abrir um canal de encaminhamento nos dois sentidos: eu recebo o que é escolar, e devolvo pra você o que é clínico e aparece nas minhas aulas.",
  FONOAUDIOLOGIA:
    "Queria abrir um canal de encaminhamento nos dois sentidos: o reforço escolar caminha junto com a terapia, e o resultado costuma vir mais rápido quando os dois conversam.",
  OUTRO:
    "Queria me colocar à disposição como encaminhamento para as famílias que vocês atendem.",
};

export type DadosContato = {
  prospect: {
    name: string;
    kind: ProspectKind;
    distanceKm: number;
  };
  professora: { nome: string; whatsapp: string };
  siteUrl: string;
};

/**
 * Redige o primeiro contato.
 *
 * Duas regras que valem mais que o texto em si: cita o nome da instituição
 * (quem recebe precisa ver na primeira linha que não é disparo em massa) e
 * pede uma coisa pequena — uma conversa, não uma parceria assinada. E-mail
 * frio que pede pouco é o que é respondido.
 */
export function redigirPrimeiroContato(dados: DadosContato): {
  subject: string;
  body: string;
} {
  const { prospect, professora, siteUrl } = dados;
  const perto = prospect.distanceKm <= 8;

  const subject =
    prospect.kind === "ESCOLA_INFANTIL" || prospect.kind === "CRECHE"
      ? `Roda de conversa gratuita com os pais do ${prospect.name}?`
      : `Parceria de encaminhamento — ${prospect.name}`;

  const body = [
    `Olá, equipe do ${prospect.name},`,
    "",
    `Meu nome é ${professora.nome}. ${ABERTURA_POR_TIPO[prospect.kind]}`,
    "",
    OFERTA_POR_TIPO[prospect.kind],
    "",
    perto
      ? "Estou aqui pertinho de vocês, então posso passar aí pessoalmente no horário que for melhor."
      : "Atendo online e também presencialmente na região, então dá pra combinar do jeito que funcionar pra vocês.",
    "",
    `Se fizer sentido, respondo aqui mesmo ou pelo WhatsApp ${professora.whatsapp}. O site é ${siteUrl}, caso queiram dar uma olhada antes.`,
    "",
    "Obrigada pela atenção,",
    professora.nome,
  ].join("\n");

  return { subject, body };
}


/**
 * Escola da rede pública?
 *
 * Não muda o texto do contato — muda a expectativa. Escola particular tem
 * famílias que já pagam por serviço educacional, então converte em aula mais
 * rápido. Escola pública dá volume e alcance, e uma roda de conversa lá
 * costuma lotar. Vale saber qual é qual antes de gastar a agenda da semana.
 */
export function ehRedePublica(name: string): boolean {
  return /\b(estadual|municipal|emei|emef|ceu|cei|e\.?e\.?|e\.?m\.?|prefeitura)\b/i.test(
    name
  );
}
