// Busca de instituições no OpenStreetMap, via Overpass API.
//
// Substitui o Google Places por três motivos práticos: não pede chave, não
// pede cartão de crédito e não tem cota. Em compensação a cobertura é
// irregular — o OSM tem o que voluntários mapearam. Na prática, para Cotia,
// isso se mostrou melhor que o esperado: boa parte das escolas já traz e-mail
// de contato na própria ficha, o que dispensa entrar no site atrás dele.
//
// Tudo aqui é dado público sob licença ODbL, do mesmo tipo que aparece no
// mapa para qualquer pessoa.

import type { Coordenada, PlaceBruto } from "./prospect";

// Instâncias públicas, tentadas em ordem. A oficial vive ocupada em horário
// de pico e responde erro de dispatcher; ter espelho é o que faz a busca
// funcionar sem o usuário precisar entender nada disso.
const ESPELHOS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export class OverpassError extends Error {}

/**
 * Uma consulta pequena por categoria, em vez de uma união grande.
 *
 * A união de sete filtros com regex sobre nome era recusada pelo dispatcher
 * ("too busy") sempre que o servidor tinha carga — mesmo num raio de 4km.
 * Quebrada assim, cada pedaço responde em segundos, e uma categoria que falha
 * não leva as outras junto. Clínica e consultório vêm sem filtro de nome (que
 * era a parte cara) e são peneirados aqui no cliente.
 */
export const CATEGORIAS: Array<{ nome: string; filtro: string; sofilhos?: boolean }> = [
  { nome: "escolas", filtro: '["amenity"="school"]' },
  { nome: "creches", filtro: '["amenity"="kindergarten"]' },
  { nome: "berçários", filtro: '["amenity"="childcare"]' },
  { nome: "psicólogos", filtro: '["healthcare"="psychotherapist"]' },
  { nome: "fonoaudiólogos", filtro: '["healthcare"="speech_therapist"]' },
  { nome: "clínicas", filtro: '["amenity"="clinic"]', sofilhos: true },
  { nome: "consultórios", filtro: '["amenity"="doctors"]', sofilhos: true },
];

// Peneira das categorias de saúde: sem ela entram 165 UBS de adulto, farmácia
// e laboratório, que não encaminham criança nenhuma.
const NOME_INFANTIL = /pediatr|infantil|crian|fono|psicolog|puericultura/i;

function montarConsulta(centro: Coordenada, raioKm: number, filtro: string): string {
  const r = Math.round(Math.min(Math.max(raioKm, 1), 50) * 1000);
  // O timeout curto é proposital: se o servidor não der conta em 25s, é
  // melhor saber logo e tentar outro espelho do que segurar a tela.
  return `[out:json][timeout:25];nwr${filtro}(around:${r},${centro.lat},${centro.lng});out center tags;`;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function consultar(consulta: string): Promise<ElementoOSM[]> {
  let ultimoErro: unknown;

  for (let tentativa = 0; tentativa < ESPELHOS.length; tentativa++) {
    const espelho = ESPELHOS[tentativa];
    try {
      const resposta = await fetch(espelho, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          // A etiqueta de uso é exigida pelas instâncias públicas, e é o que
          // permite a elas nos contatar em vez de simplesmente bloquear.
          "User-Agent": "FlorescerKidsBot/1.0 (+https://florescerkids.com.br)",
        },
        body: consulta,
        signal: AbortSignal.timeout(40000),
      });

      if (!resposta.ok) throw new OverpassError(`HTTP ${resposta.status}`);

      const texto = await resposta.text();
      // Instância ocupada responde 200 com uma página de erro em XML, não com
      // JSON. Sem esta checagem, o parse estoura com uma mensagem que não
      // ajuda ninguém a entender que era só sobrecarga.
      if (!texto.trimStart().startsWith("{")) {
        throw new OverpassError("instância ocupada");
      }

      return (JSON.parse(texto) as { elements?: ElementoOSM[] }).elements ?? [];
    } catch (erro) {
      ultimoErro = erro;
      await espera(1500);
    }
  }

  throw ultimoErro instanceof Error ? ultimoErro : new OverpassError("falhou");
}

type ElementoOSM = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// O OSM aceita o mesmo dado em duas grafias (`phone` e `contact:phone`), e
// ficha antiga usa uma, ficha nova usa outra. Ler as duas evita descartar
// contato que existe.
function tag(tags: Record<string, string>, ...chaves: string[]): string | null {
  for (const chave of chaves) {
    const valor = tags[chave]?.trim();
    if (valor) return valor;
  }
  return null;
}

function montarEndereco(tags: Record<string, string>): string {
  const rua = [tag(tags, "addr:street"), tag(tags, "addr:housenumber")]
    .filter(Boolean)
    .join(", ");
  const resto = [
    tag(tags, "addr:suburb", "addr:neighbourhood"),
    tag(tags, "addr:city"),
  ].filter(Boolean);
  return [rua, ...resto].filter(Boolean).join(" — ");
}

/**
 * Busca UMA categoria.
 *
 * A granularidade é essa porque a tela chama uma por vez e mostra qual está
 * rodando. Uma busca de 20km leva minutos no total, e sem esse recorte o
 * usuário fica olhando um botão "Buscando..." sem saber se travou — foi
 * exatamente o que aconteceu no primeiro teste.
 */
export async function buscarCategoria(opcoes: {
  centro: Coordenada;
  raioKm: number;
  indice: number;
}): Promise<PlaceBruto[]> {
  const categoria = CATEGORIAS[opcoes.indice];
  if (!categoria) throw new OverpassError("Categoria inexistente");

  const elementos = await consultar(
    montarConsulta(opcoes.centro, opcoes.raioKm, categoria.filtro)
  );

  const places: PlaceBruto[] = [];
  for (const e of elementos) {
    const tags = e.tags;
    if (!tags?.name) continue;
    if (categoria.sofilhos && !NOME_INFANTIL.test(tags.name)) continue;

    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (lat == null || lon == null) continue;

    places.push({
      // `type/id` é a chave estável do OSM, e cabe no mesmo campo que guardava
      // o placeId do Google — rebuscar atualiza em vez de duplicar.
      placeId: `osm:${e.type}/${e.id}`,
      name: tags.name,
      address: montarEndereco(tags),
      location: { lat, lng: lon },
      types: [tags.amenity, tags.healthcare, tags["healthcare:speciality"]].filter(
        (t): t is string => Boolean(t)
      ),
      phone: tag(tags, "phone", "contact:phone"),
      website: tag(tags, "website", "contact:website"),
      email: tag(tags, "email", "contact:email"),
      rating: null,
      ratingCount: null,
      businessStatus: "OPERATIONAL",
    });
  }

  return places;
}

/**
 * Todas as categorias de uma vez — usado pelo script de terminal, onde não há
 * tela pra atualizar e esperar alguns minutos não incomoda.
 *
 * Falha parcial é tolerada de propósito e devolvida em `falhas`: com o servidor
 * oscilando, perder "consultórios" e ficar com 700 escolas é muito melhor que
 * não devolver nada — desde que quem chamou diga o que faltou.
 */
export async function buscarOverpass(opcoes: {
  centro: Coordenada;
  raioKm: number;
}): Promise<{ places: PlaceBruto[]; falhas: string[] }> {
  const porId = new Map<string, PlaceBruto>();
  const falhas: string[] = [];

  for (let indice = 0; indice < CATEGORIAS.length; indice++) {
    try {
      for (const place of await buscarCategoria({ ...opcoes, indice })) {
        if (!porId.has(place.placeId)) porId.set(place.placeId, place);
      }
    } catch {
      falhas.push(CATEGORIAS[indice].nome);
    }
    // Respiro entre consultas: as instâncias públicas são compartilhadas, e
    // disparar sete de uma vez é o caminho mais curto pra ser bloqueado.
    await espera(400);
  }

  if (falhas.length === CATEGORIAS.length) {
    throw new OverpassError(
      "As instâncias públicas do OpenStreetMap não responderam. Não é erro seu — tente de novo em alguns minutos."
    );
  }

  return { places: [...porId.values()], falhas };
}
