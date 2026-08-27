import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getAllPostsMeta } from "@/lib/posts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const teachers = await prisma.teacherProfile.findMany({
    where: { approved: true },
    select: { id: true, createdAt: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/professoras`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/horarios`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/domicilio`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/cadastro`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/termos`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${siteUrl}/privacidade`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const teacherRoutes: MetadataRoute.Sitemap = teachers.map((teacher) => ({
    url: `${siteUrl}/professoras/${teacher.id}`,
    lastModified: teacher.createdAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = getAllPostsMeta().map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.updatedAt ?? post.publishedAt}T00:00:00.000Z`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...teacherRoutes];
}
