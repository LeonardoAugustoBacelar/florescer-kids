/**
 * Busca parceiros institucionais na região e monta a fila de primeiro contato.
 *
 * O caminho normal é o botão "Buscar agora" em /admin/prospeccao. Este script
 * faz o mesmo pelo terminal, útil pra rodar em lote grande sem depender de uma
 * aba aberta, ou pra agendar depois.
 *
 *   npx tsx scripts/prospectar.ts                      # raio padrão, todos os tipos
 *   npx tsx scripts/prospectar.ts --raio=15            # só 15km
 *   npx tsx scripts/prospectar.ts --tipos=ESCOLA_INFANTIL,CRECHE
 *   npx tsx scripts/prospectar.ts --dry                # mostra sem gravar
 *
 * Os dados vêm do OpenStreetMap (Overpass API): sem chave, sem cadastro e sem
 * cota. O script NÃO envia nada — só enche a fila em /admin/prospeccao, onde
 * cada mensagem é lida e aprovada antes de sair. Rodar de novo atualiza as
 * fichas que já existem e preserva status, rascunho editado e anotações.
 */

import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { buscarOverpass } from "../src/lib/overpass";
import { buscarEmailNoSite } from "../src/lib/siteEmail";
import {
  BASE,
  RAIO_PADRAO_KM,
  classificar,
  distanciaKm,
  ehRedePublica,
  escolherEmail,
  redigirPrimeiroContato,
  valeContatar,
  type PlaceBruto,
  type ProspectKind,
} from "../src/lib/prospect";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function arg(nome: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];
}

const RAIO_KM = Number(arg("raio") ?? RAIO_PADRAO_KM);
const DRY = process.argv.includes("--dry");
const TIPOS = new Set(
  arg("tipos")?.split(",") ?? [
    "ESCOLA_INFANTIL",
    "CRECHE",
    "CLINICA_PEDIATRICA",
    "PSICOLOGIA",
    "FONOAUDIOLOGIA",
  ]
);

async function main() {
  const professora = await prisma.teacherProfile.findFirst({
    where: { approved: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  if (!professora) {
    console.error("Nenhuma professora aprovada no banco — o e-mail sairia sem assinatura.");
    process.exit(1);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://florescerkids.com.br";
  console.log(
    `Buscando no OpenStreetMap em ${RAIO_KM}km de Cotia${DRY ? " · DRY RUN" : ""}\n`
  );

  const { places: encontrados, falhas } = await buscarOverpass({
    centro: BASE,
    raioKm: RAIO_KM,
  });
  console.log(`${encontrados.length} instituições com nome no raio.`);
  if (falhas.length > 0) {
    console.log(`(categorias que o servidor recusou desta vez: ${falhas.join(", ")})`);
  }

  const unicos = new Map<string, { place: PlaceBruto; kind: ProspectKind }>();
  for (const place of encontrados) {
    if (!valeContatar(place, RAIO_KM)) continue;
    const kind = classificar(place.name, place.types);
    if (kind === "OUTRO" || !TIPOS.has(kind)) continue;
    unicos.set(place.placeId, { place, kind });
  }

  console.log(`${unicos.size} contatáveis e do tipo pedido. Completando e-mails...\n`);

  let novos = 0;
  let atualizados = 0;
  let comEmail = 0;

  for (const { place, kind } of unicos.values()) {
    const distancia = distanciaKm(BASE, place.location);

    // Ficha do OSM que já traz e-mail dispensa a visita ao site — que é a
    // parte lenta. Só quem não tem é que puxa a página.
    let email = place.email ?? null;
    if (!email && place.website) {
      email = escolherEmail(await buscarEmailNoSite(place.website), place.website);
    }
    if (email) comEmail++;

    const { subject, body } = redigirPrimeiroContato({
      prospect: { name: place.name, kind, distanceKm: distancia },
      professora: {
        nome: professora.user.name.split(" ")[0],
        whatsapp: professora.whatsapp,
      },
      siteUrl,
    });

    const marca = email ? "✉" : place.phone ? "☎" : " ";
    const rede = ehRedePublica(place.name) ? " [pública]" : "";
    console.log(
      `  ${marca} ${place.name}${rede} — ${distancia.toFixed(1)}km — ${email ?? place.phone ?? "sem contato"}`
    );

    if (DRY) continue;

    const existente = await prisma.prospect.findUnique({
      where: { placeId: place.placeId },
      select: { id: true },
    });

    await prisma.prospect.upsert({
      where: { placeId: place.placeId },
      create: {
        placeId: place.placeId,
        kind,
        name: place.name,
        address: place.address,
        distanceKm: distancia,
        phone: place.phone,
        website: place.website,
        email,
        emailCheckedAt: place.website || email ? new Date() : null,
        draftSubject: subject,
        draftBody: body,
      },
      update: {
        name: place.name,
        address: place.address,
        distanceKm: distancia,
        phone: place.phone,
        website: place.website,
        ...(email ? { email, emailCheckedAt: new Date() } : {}),
      },
    });

    if (existente) atualizados++;
    else novos++;
  }

  console.log(`\n${novos} novos · ${atualizados} atualizados · ${comEmail} com e-mail`);
  console.log(
    DRY ? "\nDRY RUN — nada foi gravado." : "\nFila pronta em /admin/prospeccao para revisão."
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
