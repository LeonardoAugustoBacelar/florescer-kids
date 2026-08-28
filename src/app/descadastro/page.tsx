import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isValidUnsubscribeToken } from "@/lib/unsubscribe";
import SectionMark from "@/components/SectionMark";

export const metadata: Metadata = {
  title: "Descadastro",
  robots: { index: false, follow: false },
};

export default async function DescadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string }>;
}) {
  const { u: userId, t: token } = await searchParams;

  const valid =
    typeof userId === "string" &&
    typeof token === "string" &&
    isValidUnsubscribeToken(userId, token);

  if (valid) {
    // updateMany em vez de update: se o id não existir mais, isso não estoura
    // — e a página responde a mesma coisa de qualquer jeito, sem revelar se
    // aquele id corresponde a uma conta de verdade.
    await prisma.user.updateMany({
      where: { id: userId, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-serif-display text-3xl font-semibold text-primary-700">
        {valid ? "Pronto, você foi descadastrada" : "Link inválido"}
      </h1>
      <SectionMark color="accent" align="left" />

      {valid ? (
        <>
          <p className="mt-4 text-primary-700/80">
            Você não vai mais receber nossos e-mails de acompanhamento — nem
            convites, nem lembretes de retomar, nada disso.
          </p>
          <p className="mt-3 text-sm text-primary-700/70">
            Você vai continuar recebendo apenas o essencial da sua conta: aviso
            de aula agendada, lembrete da aula que você marcou e redefinição de
            senha. Isso faz parte do serviço, não é divulgação — e some junto
            se você excluir a conta.
          </p>
        </>
      ) : (
        <p className="mt-4 text-primary-700/80">
          Este link de descadastro não é válido ou está incompleto. Se você
          chegou aqui por um e-mail nosso, tente clicar no link novamente, ou
          fale com a gente pelo WhatsApp que resolvemos na hora.
        </p>
      )}

      <Link
        href="/"
        className="btn-press mt-8 inline-flex rounded-md bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
