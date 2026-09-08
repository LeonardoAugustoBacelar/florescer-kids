"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendProspeccaoEmail } from "@/lib/email";
import { buscarEmailNoSite } from "@/lib/siteEmail";
import { CATEGORIAS, buscarCategoria } from "@/lib/overpass";
import {
  BASE,
  classificar,
  distanciaKm,
  escolherEmail,
  redigirPrimeiroContato,
  valeContatar,
  type PlaceBruto,
  type ProspectKind,
} from "@/lib/prospect";
import type { ProspectStatus } from "@/generated/prisma/enums";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Não autorizado");
  }
}

export async function setProspectStatusAction(
  prospectId: string,
  status: ProspectStatus
) {
  await requireAdmin();

  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      status,
      ...(status === "RESPONDEU" ? { respondedAt: new Date() } : {}),
    },
  });

  revalidatePath("/admin/prospeccao");
}

export async function saveProspectDraftAction(
  prospectId: string,
  draft: { subject: string; body: string }
) {
  await requireAdmin();

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { draftSubject: draft.subject, draftBody: draft.body },
  });

  revalidatePath("/admin/prospeccao");
}

export async function saveProspectNotesAction(prospectId: string, notes: string) {
  await requireAdmin();

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { notes },
  });

  revalidatePath("/admin/prospeccao");
}

/**
 * Envia o primeiro contato — o único ponto do sistema que dispara para fora.
 *
 * Três travas, todas por um motivo já visto acontecer:
 *
 * 1. Exige status APROVADO. É o portão de leitura humana: nada sai sem alguém
 *    ter aberto o rascunho e clicado em aprovar.
 * 2. Exige `contactedAt` vazio. Duplo clique no botão, ou aba reaberta, não
 *    manda o mesmo e-mail duas vezes — apresentar-se duas vezes para a mesma
 *    escola custa a parceria.
 * 3. Marca `contactedAt` ANTES de enviar. Se o envio estourar no meio, o
 *    registro já está travado: melhor investigar um envio incerto do que
 *    arriscar mandar de novo.
 */
export async function sendProspectContactAction(prospectId: string) {
  await requireAdmin();

  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) throw new Error("Prospect não encontrado");
  if (!prospect.email) throw new Error("Sem e-mail — o contato aqui é por telefone");
  if (prospect.status !== "APROVADO") {
    throw new Error("Aprove o texto antes de enviar");
  }
  if (prospect.contactedAt) throw new Error("Este contato já foi enviado");
  if (!prospect.draftSubject || !prospect.draftBody) {
    throw new Error("Rascunho vazio");
  }

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: "CONTATADO", contactedAt: new Date() },
  });

  const professora = await prisma.teacherProfile.findFirst({
    where: { approved: true },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });

  await sendProspeccaoEmail(prospect.email, {
    subject: prospect.draftSubject,
    body: prospect.draftBody,
    replyTo: professora?.notificationEmail ?? professora?.user.email,
  });

  revalidatePath("/admin/prospeccao");
}

/**
 * Roda UMA categoria da busca e grava o que achou.
 *
 * Recortada assim por dois motivos que apareceram no primeiro teste real: a
 * consulta de 20km leva minutos somando as sete categorias, e função
 * serverless tem teto de duração — mas, acima disso, um botão parado em
 * "Buscando..." por três minutos é indistinguível de tela travada. Uma
 * categoria por chamada cabe no tempo e deixa a tela dizer onde está.
 */
export async function runProspectSearchAction(opcoes: {
  raioKm: number;
  tipos: string[];
  indice: number;
}): Promise<{
  categoria: string;
  novos: number;
  atualizados: number;
  comEmail: number;
  falhou: boolean;
}> {
  await requireAdmin();

  const categoria = CATEGORIAS[opcoes.indice];
  if (!categoria) throw new Error("Categoria inexistente");

  const raioKm = Math.min(Math.max(opcoes.raioKm, 1), 50);
  const tipos = new Set(opcoes.tipos);
  if (tipos.size === 0) throw new Error("Escolha pelo menos um tipo de parceiro");

  const professora = await prisma.teacherProfile.findFirst({
    where: { approved: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  if (!professora) throw new Error("Nenhuma professora aprovada — o e-mail sairia sem assinatura");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://florescerkids.com.br";

  let encontrados: PlaceBruto[];
  try {
    encontrados = await buscarCategoria({ centro: BASE, raioKm, indice: opcoes.indice });
  } catch {
    // Uma categoria recusada pelo servidor não derruba a busca inteira: a tela
    // avisa qual faltou e seguir buscando as outras ainda entrega valor.
    return { categoria: categoria.nome, novos: 0, atualizados: 0, comEmail: 0, falhou: true };
  }

  // A consulta vem por categoria, mas a classificação final é pelo nome — e só
  // então dá pra saber se o tipo interessa. Uma creche cadastrada como
  // "school" no OSM não pode sumir porque o usuário desmarcou "Escolas".
  const aceitos = new Map<string, { place: PlaceBruto; kind: ProspectKind }>();
  for (const place of encontrados) {
    if (!valeContatar(place, raioKm)) continue;
    const kind = classificar(place.name, place.types);
    if (kind === "OUTRO" || !tipos.has(kind)) continue;
    aceitos.set(place.placeId, { place, kind });
  }

  const existentes = new Set(
    (
      await prisma.prospect.findMany({
        where: { placeId: { in: [...aceitos.keys()] } },
        select: { placeId: true },
      })
    ).map((p) => p.placeId)
  );

  const paraCriar = [];
  const paraAtualizar = [];
  let comEmail = 0;

  for (const { place, kind } of aceitos.values()) {
    const distanceKm = distanciaKm(BASE, place.location);
    if (place.email) comEmail++;

    const comuns = {
      name: place.name,
      address: place.address,
      distanceKm,
      phone: place.phone ?? null,
      website: place.website ?? null,
    };

    if (existentes.has(place.placeId)) {
      // Status, rascunho editado e anotações ficam intocados numa rebusca: são
      // trabalho humano, e sobrescrever apagaria o histórico.
      paraAtualizar.push(
        prisma.prospect.update({
          where: { placeId: place.placeId },
          data: {
            ...comuns,
            ...(place.email ? { email: place.email, emailCheckedAt: new Date() } : {}),
          },
        })
      );
    } else {
      const { subject, body } = redigirPrimeiroContato({
        prospect: { name: place.name, kind, distanceKm },
        professora: {
          nome: professora.user.name.split(" ")[0],
          whatsapp: professora.whatsapp,
        },
        siteUrl,
      });
      paraCriar.push({
        placeId: place.placeId,
        kind,
        ...comuns,
        email: place.email ?? null,
        // E-mail que veio na própria ficha do OSM já conta como resolvido: não
        // há site a visitar depois.
        emailCheckedAt: place.email ? new Date() : null,
        draftSubject: subject,
        draftBody: body,
      });
    }
  }

  // Escrita em lote. Antes era um upsert por instituição, e com ~500 linhas
  // isso viravam 500 idas ao banco — sozinho já respondia por boa parte dos
  // minutos que a tela passava parada.
  if (paraCriar.length > 0) {
    await prisma.prospect.createMany({ data: paraCriar, skipDuplicates: true });
  }
  if (paraAtualizar.length > 0) {
    await prisma.$transaction(paraAtualizar);
  }

  revalidatePath("/admin/prospeccao");
  return {
    categoria: categoria.nome,
    novos: paraCriar.length,
    atualizados: paraAtualizar.length,
    comEmail,
    falhou: false,
  };
}

/**
 * Visita o site de alguns prospects atrás do e-mail publicado.
 *
 * Trabalha em lote pequeno e devolve quantos ainda faltam: a tela chama de
 * novo até zerar, e assim uma fila de 100 sites atravessa várias execuções
 * curtas em vez de uma longa que estouraria o tempo da função.
 */
export async function enrichProspectEmailsAction(
  lote = 5
): Promise<{ processados: number; comEmail: number; restantes: number }> {
  await requireAdmin();

  const pendentes = await prisma.prospect.findMany({
    where: {
      email: null,
      emailCheckedAt: null,
      website: { not: null },
      status: { notIn: ["DESCARTADO", "CONTATADO", "RESPONDEU", "SEM_RESPOSTA"] },
    },
    orderBy: { distanceKm: "asc" },
    take: lote,
  });

  let comEmail = 0;

  for (const prospect of pendentes) {
    const email = escolherEmail(
      await buscarEmailNoSite(prospect.website!),
      prospect.website
    );
    if (email) comEmail++;
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { email, emailCheckedAt: new Date() },
    });
  }

  const restantes = await prisma.prospect.count({
    where: {
      email: null,
      emailCheckedAt: null,
      website: { not: null },
      status: { notIn: ["DESCARTADO", "CONTATADO", "RESPONDEU", "SEM_RESPOSTA"] },
    },
  });

  revalidatePath("/admin/prospeccao");
  return { processados: pendentes.length, comEmail, restantes };
}
