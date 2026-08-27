import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getAllPostsMeta } from "@/lib/posts";
import SectionMark from "@/components/SectionMark";

export const metadata: Metadata = {
  title: "Artigos para mães",
  description:
    "Textos sobre comportamento infantil, dificuldades escolares, alfabetização e rotina de estudos — escritos por quem acompanha crianças há mais de 15 anos.",
};

function formatPublishedAt(publishedAt: string): string {
  return new Date(`${publishedAt}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function BlogPage() {
  const posts = getAllPostsMeta();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-serif-display text-3xl font-semibold text-primary-700">
        Artigos para mães
      </h1>
      <SectionMark color="warm" align="left" />
      <p className="mt-2 max-w-2xl text-primary-700/80">
        Nem toda dúvida precisa virar consulta. Aqui ficam textos sobre o que
        aparece no dia a dia — comportamento, dificuldade de aprender, rotina
        de estudos — escritos pela Gilda a partir do que ela vê nos
        atendimentos.
      </p>

      {posts.length === 0 ? (
        <p className="mt-10 text-primary-700/70">
          Nenhum artigo publicado ainda.
        </p>
      ) : (
        <div className="mt-10 space-y-6">
          {posts.map((post, index) => (
            <article
              key={post.slug}
              data-reveal
              style={{ "--reveal-delay": `${(index % 6) * 60}ms` } as React.CSSProperties}
              className="rounded-lg border border-primary-100 bg-white p-6 transition-colors hover:border-primary-400"
            >
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-primary-700/50">
                {formatPublishedAt(post.publishedAt)} · {post.readingMinutes} min
                de leitura
              </p>
              <h2 className="mt-3 font-serif-display text-xl font-semibold text-primary-700">
                <Link href={`/blog/${post.slug}`} className="hover:underline">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-primary-700/80">
                {post.description}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:text-accent-500"
              >
                Ler artigo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
