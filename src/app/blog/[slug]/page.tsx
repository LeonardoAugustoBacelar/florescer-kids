import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getAllPostsMeta, getPost, getPostSlugs } from "@/lib/posts";
import JsonLd from "@/components/JsonLd";
import { buildArticleSchema } from "@/lib/structuredData";
import SectionMark from "@/components/SectionMark";

// Os artigos são arquivos no repositório: dá pra gerar todos no build, sem
// consultar nada em tempo de requisição.
export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: "Artigo não encontrado" };

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      url: `/blog/${post.slug}`,
    },
  };
}

function formatPublishedAt(publishedAt: string): string {
  return new Date(`${publishedAt}T00:00:00.000Z`).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const others = getAllPostsMeta()
    .filter((item) => item.slug !== post.slug)
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <JsonLd data={buildArticleSchema(post)} />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700/70 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos os artigos
      </Link>

      <h1 className="mt-6 font-serif-display text-3xl font-semibold leading-tight text-primary-700 sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em] text-primary-700/50">
        {formatPublishedAt(post.publishedAt)} · {post.readingMinutes} min de
        leitura
      </p>
      <SectionMark color="warm" align="left" />

      <div
        className="post-content mt-8"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <div className="mt-12 rounded-lg border border-accent-100 bg-accent-100/40 p-6">
        <p className="font-serif-display text-lg font-semibold text-primary-700">
          Quer conversar sobre o caso do seu filho?
        </p>
        <p className="mt-2 text-sm text-primary-700/80">
          A Gilda é pedagoga e psicopedagoga, com mais de 15 anos acompanhando
          crianças com dificuldades de comportamento e aprendizagem. O
          atendimento é online ou a domicílio.
        </p>
        <Link
          href="/professoras"
          className="btn-press group mt-4 inline-flex items-center gap-2 rounded-md bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          Conhecer o trabalho dela
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {others.length > 0 && (
        <div className="mt-12">
          <h2 className="font-serif-display text-xl font-semibold text-primary-700">
            Continue lendo
          </h2>
          <div className="mt-4 space-y-3">
            {others.map((item) => (
              <Link
                key={item.slug}
                href={`/blog/${item.slug}`}
                className="block rounded-lg border border-primary-100 bg-white p-4 transition-colors hover:border-primary-400"
              >
                <p className="font-semibold text-primary-700">{item.title}</p>
                <p className="mt-1 text-sm text-primary-700/70">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
