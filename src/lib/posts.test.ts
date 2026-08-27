import { describe, expect, it } from "vitest";
import { getAllPostsMeta, getPost, getPostSlugs } from "./posts";

// Roda contra os arquivos reais em content/posts — a intenção é justamente
// essa: um artigo publicado sem título, sem data ou com frontmatter quebrado
// derruba o teste antes de derrubar a listagem e o sitemap em produção.

describe("artigos publicados", () => {
  const posts = getAllPostsMeta();

  it("existe pelo menos um artigo", () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it("todo artigo tem título, descrição e data válida", () => {
    for (const post of posts) {
      expect(post.title.length, `título de ${post.slug}`).toBeGreaterThan(0);
      expect(post.description.length, `descrição de ${post.slug}`).toBeGreaterThan(0);
      expect(post.publishedAt, `data de ${post.slug}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("a descrição cabe no limite que o Google costuma exibir", () => {
    for (const post of posts) {
      expect(post.description.length, `descrição de ${post.slug}`).toBeLessThanOrEqual(200);
    }
  });

  it("não há slugs repetidos", () => {
    const slugs = posts.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("vem ordenado do mais recente para o mais antigo", () => {
    const dates = posts.map((post) => post.publishedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it("cada slug listado tem conteúdo renderizável", async () => {
    for (const slug of getPostSlugs()) {
      const post = await getPost(slug);
      expect(post, slug).not.toBeNull();
      expect(post!.contentHtml).toContain("<p>");
    }
  });

  it("devolve null para um artigo que não existe", async () => {
    expect(await getPost("artigo-que-nao-existe")).toBeNull();
  });
});
