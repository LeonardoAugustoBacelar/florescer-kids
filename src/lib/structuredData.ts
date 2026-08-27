// Montagem dos schemas (schema.org) que descrevem o site para buscadores.
//
// A ideia é traduzir pro Google o que a página já diz para a mãe: que existe
// uma professora específica, com especialidades específicas, atendendo numa
// região específica, por um preço, com avaliações reais. Isso alimenta tanto o
// entendimento da busca comum quanto os resultados enriquecidos (estrelas,
// perguntas frequentes) — que o Google decide exibir ou não, mas nunca exibe
// sem a marcação existir.

import { summarizeRatings } from "@/lib/reviews";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const ORGANIZATION_ID = `${siteUrl}/#organizacao`;

const ORGANIZATION_DESCRIPTION =
  "Aulas particulares e orientação para mães, com professora especializada em comportamento infantil e pedagogia — TDAH, TEA, birras, ansiedade, alfabetização e reforço escolar. Atendimento online e a domicílio.";

type RatingSource = { rating: number };

export type TeacherForSchema = {
  id: string;
  bio: string;
  specialties: string;
  credentials: string | null;
  photoUrl: string | null;
  pricePerHour: number;
  offersDomicilio: boolean;
  pricePerHourDomicilio: number | null;
  user: { name: string };
};

export type ReviewForSchema = {
  rating: number;
  comment: string | null;
  createdAt: Date;
  mae: { name: string };
};

/** "TDAH, TEA, birras" -> ["TDAH", "TEA", "birras"] */
function splitSpecialties(specialties: string): string[] {
  return specialties
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAggregateRating(reviews: RatingSource[]) {
  const { average, count } = summarizeRatings(reviews);
  // Sem nenhuma avaliação não se declara nota: o Google trata AggregateRating
  // zerado como marcação inválida, e marcação inválida vale menos que nenhuma.
  if (count === 0) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: Number(average.toFixed(1)),
    reviewCount: count,
    bestRating: 5,
    worstRating: 1,
  };
}

function absoluteUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** A professora como entidade: é ela que é avaliada e quem presta o serviço. */
export function buildTeacherSchema(
  teacher: TeacherForSchema,
  reviews: ReviewForSchema[] = []
): Record<string, unknown> {
  const offers: Record<string, unknown>[] = [
    {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: teacher.pricePerHour,
      itemOffered: {
        "@type": "Service",
        name: "Aula particular online",
        serviceType: "Aula particular por videochamada",
      },
    },
  ];

  if (teacher.offersDomicilio && teacher.pricePerHourDomicilio !== null) {
    offers.push({
      "@type": "Offer",
      priceCurrency: "BRL",
      price: teacher.pricePerHourDomicilio,
      itemOffered: {
        "@type": "Service",
        name: "Aula particular a domicílio",
        serviceType: "Aula particular presencial",
        areaServed: { "@type": "City", name: "Cotia" },
      },
    });
  }

  return {
    "@type": "Person",
    "@id": `${siteUrl}/professoras/${teacher.id}#professora`,
    name: teacher.user.name,
    url: `${siteUrl}/professoras/${teacher.id}`,
    jobTitle: "Pedagoga e psicopedagoga",
    description: teacher.bio,
    image: absoluteUrl(teacher.photoUrl),
    knowsAbout: splitSpecialties(teacher.specialties),
    ...(teacher.credentials ? { hasCredential: teacher.credentials } : {}),
    worksFor: { "@id": ORGANIZATION_ID },
    makesOffer: offers,
    ...(buildAggregateRating(reviews)
      ? { aggregateRating: buildAggregateRating(reviews) }
      : {}),
    // Só avaliações com comentário viram Review: nota solta sem texto não
    // acrescenta nada pra quem lê o resultado da busca.
    ...(reviews.some((review) => review.comment)
      ? {
          review: reviews
            .filter((review) => review.comment)
            .map((review) => ({
              "@type": "Review",
              author: { "@type": "Person", name: review.mae.name },
              datePublished: review.createdAt.toISOString().slice(0, 10),
              reviewBody: review.comment,
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating,
                bestRating: 5,
                worstRating: 1,
              },
            })),
        }
      : {}),
  };
}

/** O negócio em si — usado na home, onde a busca aterrissa primeiro. */
export function buildOrganizationSchema(
  teacher?: TeacherForSchema,
  reviews: ReviewForSchema[] = []
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "ProfessionalService"],
    "@id": ORGANIZATION_ID,
    name: "Florescer Kids",
    url: siteUrl,
    description: ORGANIZATION_DESCRIPTION,
    availableLanguage: "pt-BR",
    areaServed: [
      {
        "@type": "City",
        name: "Cotia",
        containedInPlace: { "@type": "State", name: "São Paulo" },
      },
      { "@type": "Country", name: "Brasil" },
    ],
    ...(teacher
      ? {
          knowsAbout: splitSpecialties(teacher.specialties),
          employee: buildTeacherSchema(teacher, reviews),
        }
      : {}),
  };
}

/** Página da professora: a entidade principal é ela, dentro do site. */
export function buildTeacherPageSchema(
  teacher: TeacherForSchema,
  reviews: ReviewForSchema[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    ...buildTeacherSchema(teacher, reviews),
  };
}

/** Perguntas frequentes — as que já estão escritas nas páginas. */
export function buildFaqSchema(
  items: readonly { question: string; answer: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
