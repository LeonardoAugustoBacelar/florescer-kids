// Blog: os artigos são arquivos markdown em `content/posts`, versionados no
// git junto com o código. A escolha é deliberada — a Gilda revisa texto puro,
// sem editor nem painel, e cada revisão dela fica no histórico como qualquer
// outra mudança do projeto.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const POSTS_DIRECTORY = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  tags: string[];
  readingMinutes: number;
};

export type Post = PostMeta & { contentHtml: string };

/** ~200 palavras por minuto, arredondado pra cima. Serve pra ambientar a leitora. */
function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function parseMeta(slug: string, raw: string): { meta: PostMeta; body: string } {
  const { data, content } = matter(raw);

  const missing = ["title", "description", "publishedAt"].filter(
    (field) => !data[field]
  );
  // Falha alto e cedo: um artigo sem título ou data quebra a listagem, o
  // sitemap e o compartilhamento — melhor derrubar o build que publicar torto.
  if (missing.length > 0) {
    throw new Error(
      `Artigo "${slug}" está sem os campos obrigatórios: ${missing.join(", ")}`
    );
  }

  return {
    meta: {
      slug,
      title: String(data.title),
      description: String(data.description),
      publishedAt: String(data.publishedAt),
      ...(data.updatedAt ? { updatedAt: String(data.updatedAt) } : {}),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      readingMinutes: estimateReadingMinutes(content),
    },
    body: content,
  };
}

function readPostFile(slug: string): { meta: PostMeta; body: string } {
  const fullPath = path.join(POSTS_DIRECTORY, `${slug}.md`);
  return parseMeta(slug, fs.readFileSync(fullPath, "utf8"));
}

/** Todos os artigos, do mais recente pro mais antigo. */
export function getAllPostsMeta(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIRECTORY)) return [];

  return fs
    .readdirSync(POSTS_DIRECTORY)
    .filter((file) => file.endsWith(".md"))
    .map((file) => readPostFile(file.replace(/\.md$/, "")).meta)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIRECTORY)) return [];
  return fs
    .readdirSync(POSTS_DIRECTORY)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

export async function getPost(slug: string): Promise<Post | null> {
  const fullPath = path.join(POSTS_DIRECTORY, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const { meta, body } = readPostFile(slug);
  const processed = await remark().use(html).process(body);

  return { ...meta, contentHtml: processed.toString() };
}
