// O envio da prospecção, num lugar só.
//
// Compartilhado entre o botão da tela e o cron de disparo automático. Ficar
// num módulo só não é organização: é a garantia de que o caminho automático
// passa exatamente pelas mesmas travas do manual. Duas cópias da regra viram,
// mais cedo ou mais tarde, duas regras diferentes — e a que estiver errada é a
// que manda e-mail duas vezes.

import { prisma } from "./prisma";
import { sendProspeccaoEmail } from "./email";
import { redigirFollowUp } from "./prospect";

async function replyToDaProfessora(): Promise<string | undefined> {
  const professora = await prisma.teacherProfile.findFirst({
    where: { approved: true },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return professora?.notificationEmail ?? professora?.user.email;
}

export class EnvioRecusado extends Error {}

/**
 * Envia o primeiro contato de um prospect.
 *
 * As travas, todas por um motivo já visto acontecer:
 *
 * 1. Exige status APROVADO. É o portão de leitura humana: nem a tela nem o
 *    cron mandam nada que alguém não tenha aberto e aprovado antes.
 * 2. Exige `contactedAt` vazio. Duplo clique, aba reaberta ou duas execuções
 *    do cron não mandam o mesmo e-mail duas vezes — apresentar-se duas vezes
 *    para a mesma escola custa a parceria.
 * 3. Marca `contactedAt` ANTES de enviar. Se o envio estourar no meio, o
 *    registro já está travado: melhor investigar um envio incerto do que
 *    arriscar mandar de novo.
 */
export async function enviarPrimeiroContato(prospectId: string): Promise<void> {
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });

  if (!prospect) throw new EnvioRecusado("Prospect não encontrado");
  if (!prospect.email) {
    throw new EnvioRecusado("Sem e-mail — o contato aqui é por telefone");
  }
  if (prospect.status !== "APROVADO") {
    throw new EnvioRecusado("Aprove o texto antes de enviar");
  }
  if (prospect.contactedAt) throw new EnvioRecusado("Este contato já foi enviado");
  if (!prospect.draftSubject || !prospect.draftBody) {
    throw new EnvioRecusado("Rascunho vazio");
  }

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: "CONTATADO", contactedAt: new Date() },
  });

  await sendProspeccaoEmail(prospect.email, {
    subject: prospect.draftSubject,
    body: prospect.draftBody,
    replyTo: await replyToDaProfessora(),
  });
}

/**
 * Envia o segundo toque.
 *
 * Mesma ordem de gravar-antes-de-enviar, e mesma razão: o caso ruim tem que
 * ser "não recebeu a insistência", nunca "recebeu duas".
 */
export async function enviarFollowUp(prospectId: string): Promise<void> {
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });

  if (!prospect?.email) throw new EnvioRecusado("Sem e-mail");
  if (prospect.status !== "CONTATADO") throw new EnvioRecusado("Ainda não contatado");
  if (prospect.followUpAt) throw new EnvioRecusado("Follow-up já enviado");

  const professora = await prisma.teacherProfile.findFirst({
    where: { approved: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  if (!professora) throw new EnvioRecusado("Nenhuma professora aprovada");

  const { subject, body } = redigirFollowUp({
    prospect: {
      name: prospect.name,
      kind: prospect.kind,
      distanceKm: prospect.distanceKm,
    },
    professora: {
      nome: professora.user.name.split(" ")[0],
      whatsapp: professora.whatsapp,
    },
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://florescerkids.com.br",
  });

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { followUpAt: new Date() },
  });

  await sendProspeccaoEmail(prospect.email, {
    subject,
    body,
    replyTo: professora.notificationEmail ?? professora.user.email,
  });
}
