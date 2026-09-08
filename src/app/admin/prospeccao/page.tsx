import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProspectCard from "@/components/dashboard/ProspectCard";
import ProspectSearchPanel from "@/components/dashboard/ProspectSearchPanel";
import ProspectBulkApprove from "@/components/dashboard/ProspectBulkApprove";
import {
  LIMITE_DIARIO_ENVIO,
  DIAS_PARA_FOLLOW_UP,
  mensagemWhatsAppProspect,
} from "@/lib/prospect";

export const metadata: Metadata = {
  title: "Prospecção",
  robots: { index: false, follow: false },
};

// A fila muda a cada aprovação e envio; renderizar do cache mostraria contato
// já enviado como pendente, que é o erro que faz mandar duas vezes.
export const dynamic = "force-dynamic";

// A consulta ao Overpass roda dentro desta função e pode levar dezenas de
// segundos num raio grande. O enriquecimento de e-mail é fatiado em lotes pelo
// painel justamente para não precisar de mais que isso.
export const maxDuration = 60;

const SECOES = [
  {
    status: "APROVADO",
    titulo: "Prontos pra enviar",
    ajuda: "Você já leu o texto. É só disparar.",
  },
  {
    status: "ENCONTRADO",
    titulo: "Aguardando sua leitura",
    ajuda: "Nada sai daqui sem você aprovar. Os mais perto vêm primeiro.",
  },
  {
    status: "CONTATADO",
    titulo: "Contatados",
    ajuda: "Marque o retorno pra saber o que funciona.",
  },
  { status: "RESPONDEU", titulo: "Responderam", ajuda: "" },
  { status: "SEM_RESPOSTA", titulo: "Sem resposta", ajuda: "" },
  { status: "DESCARTADO", titulo: "Descartados", ajuda: "" },
] as const;

export default async function ProspeccaoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const prospects = await prisma.prospect.findMany({
    orderBy: [{ distanceKm: "asc" }],
  });

  const professora = await prisma.teacherProfile.findFirst({
    where: { approved: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const pendentesDeEmail = await prisma.prospect.count({
    where: {
      email: null,
      emailCheckedAt: null,
      website: { not: null },
      status: { notIn: ["DESCARTADO", "CONTATADO", "RESPONDEU", "SEM_RESPOSTA"] },
    },
  });

  const porStatus = (status: string) =>
    prospects.filter((p) => p.status === status);

  const aguardandoEnvio = prospects.filter(
    (p) => p.status === "APROVADO" && p.email && !p.contactedAt
  ).length;
  const aprovaveis = prospects.filter(
    (p) => p.status === "ENCONTRADO" && p.email
  ).length;

  // A mensagem de WhatsApp é montada aqui, no servidor, porque depende do nome
  // e do número da professora — dado que não precisa viajar pro cliente.
  const whatsAppDe = (p: (typeof prospects)[number]) =>
    professora
      ? mensagemWhatsAppProspect({
          prospect: { name: p.name, kind: p.kind, distanceKm: p.distanceKm },
          professora: {
            nome: professora.user.name.split(" ")[0],
            whatsapp: professora.whatsapp,
          },
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://florescerkids.com.br",
        })
      : undefined;

  const total = prospects.length;
  const contatados = prospects.filter((p) => p.contactedAt).length;
  const responderam = porStatus("RESPONDEU").length;
  const semEmail = prospects.filter((p) => !p.email).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/admin"
        className="text-xs font-semibold text-accent-600 hover:underline"
      >
        ← Painel
      </Link>

      <h1 className="mt-2 font-serif-display text-3xl font-semibold text-primary-700">
        Prospecção de parceiros
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-primary-700/70">
        Escolas, creches e consultórios da região que atendem as mesmas
        famílias. Cada mensagem é escrita para a instituição específica e só sai
        depois que você lê e aprova.
      </p>

      <div className="mt-6">
        <ProspectSearchPanel pendentesDeEmail={pendentesDeEmail} />
      </div>

      <div className="mt-4 rounded-lg border border-primary-100 bg-white p-5">
        <h2 className="font-bold text-primary-700">Disparo automático</h2>
        <p className="mt-1 text-sm text-primary-700/70">
          Todo dia útil às 11h, o sistema envia até{" "}
          <strong className="text-primary-700">
            {LIMITE_DIARIO_ENVIO} primeiros contatos
          </strong>{" "}
          já aprovados, dos mais próximos para os mais distantes. Quem não
          responder em {DIAS_PARA_FOLLOW_UP} dias recebe um segundo e último
          e-mail, automaticamente.
        </p>
        <p className="mt-2 text-sm text-primary-700/70">
          {aguardandoEnvio > 0 ? (
            <>
              <strong className="text-primary-700">{aguardandoEnvio}</strong> na
              fila de envio — cerca de{" "}
              {Math.ceil(aguardandoEnvio / LIMITE_DIARIO_ENVIO)} dia(s) úteis
              para esvaziar.
            </>
          ) : (
            "Nada na fila de envio. Aprove mensagens abaixo para o disparo começar."
          )}
        </p>
        <p className="mt-3 text-xs text-primary-700/60">
          O ritmo é de reputação, não de capacidade: estes e-mails saem da mesma
          conta que manda confirmação de aula e redefinição de senha, e um pico
          de mensagens para desconhecidos é o que derruba a entrega das duas.
        </p>
        <ProspectBulkApprove pendentes={aprovaveis} />
      </div>

      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-primary-700/60">
          A fila está vazia. Use o botão acima para encontrar parceiros perto de
          Cotia.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { rotulo: "Na base", valor: total },
              { rotulo: "Contatados", valor: contatados },
              { rotulo: "Responderam", valor: responderam },
              { rotulo: "Sem e-mail", valor: semEmail },
            ].map((s) => (
              <div
                key={s.rotulo}
                className="rounded-lg border border-primary-100 bg-white p-4"
              >
                <p className="text-2xl font-bold text-primary-700">{s.valor}</p>
                <p className="text-xs text-primary-700/60">{s.rotulo}</p>
              </div>
            ))}
          </div>

          {contatados > 0 && responderam > 0 && (
            <p className="mt-3 text-xs text-primary-700/60">
              Taxa de resposta:{" "}
              <strong className="text-primary-700">
                {Math.round((responderam / contatados) * 100)}%
              </strong>{" "}
              — abaixo de 10% costuma ser sinal de que o texto está genérico
              demais.
            </p>
          )}

          {SECOES.map((secao) => {
            const lista = porStatus(secao.status);
            if (lista.length === 0) return null;
            return (
              <section key={secao.status} className="mt-10">
                <h2 className="text-xl font-bold text-primary-700">
                  {secao.titulo}{" "}
                  <span className="text-sm font-normal text-primary-700/50">
                    ({lista.length})
                  </span>
                </h2>
                {secao.ajuda && (
                  <p className="mt-1 text-sm text-primary-700/60">{secao.ajuda}</p>
                )}
                <div className="mt-4 space-y-3">
                  {lista.map((p) => (
                    <ProspectCard
                      key={p.id}
                      prospect={{ ...p, whatsAppMessage: whatsAppDe(p) }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
