import { describe, expect, it } from "vitest";
import {
  buildFaqSchema,
  buildOrganizationSchema,
  buildTeacherPageSchema,
  type ReviewForSchema,
  type TeacherForSchema,
} from "./structuredData";

const TEACHER: TeacherForSchema = {
  id: "prof1",
  bio: "Pedagoga e psicopedagoga com mais de 15 anos de experiência.",
  specialties: "TDAH, TEA, birras,  ansiedade infantil ",
  credentials: "Pedagoga e psicopedagoga",
  photoUrl: "/images/gilda.jpg",
  pricePerHour: 60,
  offersDomicilio: true,
  pricePerHourDomicilio: 90,
  user: { name: "Gilda Bacelar" },
};

const REVIEWS: ReviewForSchema[] = [
  {
    rating: 5,
    comment: "Meu filho mudou muito.",
    createdAt: new Date("2026-08-10T00:00:00.000Z"),
    mae: { name: "Ana" },
  },
  {
    rating: 4,
    comment: null,
    createdAt: new Date("2026-08-11T00:00:00.000Z"),
    mae: { name: "Bia" },
  },
];

describe("buildTeacherPageSchema", () => {
  it("descreve a professora com especialidades separadas e limpas", () => {
    const schema = buildTeacherPageSchema(TEACHER, REVIEWS);
    expect(schema["@type"]).toBe("Person");
    expect(schema.name).toBe("Gilda Bacelar");
    expect(schema.knowsAbout).toEqual([
      "TDAH",
      "TEA",
      "birras",
      "ansiedade infantil",
    ]);
  });

  it("transforma a foto relativa em URL absoluta", () => {
    const schema = buildTeacherPageSchema(TEACHER, REVIEWS);
    expect(schema.image).toMatch(/^https?:\/\/.+\/images\/gilda\.jpg$/);
  });

  it("calcula a nota média a partir das avaliações", () => {
    const schema = buildTeacherPageSchema(TEACHER, REVIEWS) as {
      aggregateRating: { ratingValue: number; reviewCount: number };
    };
    expect(schema.aggregateRating.ratingValue).toBe(4.5);
    expect(schema.aggregateRating.reviewCount).toBe(2);
  });

  it("omite a nota quando não há avaliação nenhuma", () => {
    // AggregateRating zerado é marcação inválida pro Google — pior que ausente.
    const schema = buildTeacherPageSchema(TEACHER, []);
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toBeUndefined();
  });

  it("publica só as avaliações que têm comentário", () => {
    const schema = buildTeacherPageSchema(TEACHER, REVIEWS) as {
      review: { reviewBody: string }[];
    };
    expect(schema.review).toHaveLength(1);
    expect(schema.review[0].reviewBody).toBe("Meu filho mudou muito.");
  });

  it("anuncia as duas modalidades quando a professora atende a domicílio", () => {
    const schema = buildTeacherPageSchema(TEACHER, REVIEWS) as {
      makesOffer: { price: number }[];
    };
    expect(schema.makesOffer.map((offer) => offer.price)).toEqual([60, 90]);
  });

  it("anuncia só o online quando não há atendimento a domicílio", () => {
    const schema = buildTeacherPageSchema(
      { ...TEACHER, offersDomicilio: false, pricePerHourDomicilio: null },
      REVIEWS
    ) as { makesOffer: unknown[] };
    expect(schema.makesOffer).toHaveLength(1);
  });
});

describe("buildOrganizationSchema", () => {
  it("funciona mesmo sem professora cadastrada", () => {
    const schema = buildOrganizationSchema();
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema.employee).toBeUndefined();
  });

  it("inclui a professora como profissional da organização", () => {
    const schema = buildOrganizationSchema(TEACHER, REVIEWS) as {
      employee: { name: string };
    };
    expect(schema.employee.name).toBe("Gilda Bacelar");
  });
});

describe("buildFaqSchema", () => {
  it("converte as perguntas da página no formato FAQPage", () => {
    const schema = buildFaqSchema([
      { question: "Como funciona o pagamento?", answer: "Por PIX." },
    ]) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity[0].name).toBe("Como funciona o pagamento?");
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe("Por PIX.");
  });
});
