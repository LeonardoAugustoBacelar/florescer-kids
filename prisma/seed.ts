import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const REMOVED_TEACHER_EMAILS = [
  "fernanda@criancasemfoco.com.br",
  "juliana@criancasemfoco.com.br",
  "patricia@criancasemfoco.com.br",
];

const GILDA = {
  name: "Gilda Bacelar",
  email: "gilda@florescerkids.com.br",
  phone: "11970406208",
  whatsapp: "5511970406208",
  photoUrl: "/images/gilda.jpg",
  specialties:
    "TDAH, TEA, birras, ansiedade infantil, dificuldades escolares e regulação emocional, Alfabetização e letramento, Leitura e escrita, Matemática, Auxílio nas tarefas escolares, Desenvolvimento da autonomia e da confiança",
  credentials:
    "Pedagoga e psicopedagoga · Mais de 15 anos de experiência em alfabetização, reforço escolar e apoio comportamental infantil (TDAH, TEA e regulação emocional)",
  bio: `Pedagoga e psicopedagoga com mais de 15 anos de experiência, Gilda acredita que cada criança aprende e se desenvolve no seu próprio tempo. Por isso, toda aula é construída a partir da realidade específica da sua família — nunca de um roteiro pronto.

No apoio comportamental, ela trabalha com crianças que têm crises de birra frequentes, dificuldade de concentração (TDAH), características do espectro autista (TEA) ou sinais de ansiedade. Antes de qualquer estratégia, ela escuta o que você já tentou e o que realmente acontece no dia a dia — e te orienta sobre como agir em casa, entre um encontro e outro.

No apoio pedagógico, ela acompanha o processo de alfabetização e letramento, leitura e escrita, matemática e as tarefas escolares, com atividades adequadas ao ritmo de cada criança. O objetivo não é só o conteúdo: é fortalecer, aos poucos, a autonomia e a confiança da criança nos próprios estudos.

Cada aula é adaptada à realidade da família, sempre com orientação direta para a mãe sobre como agir no dia a dia.`,
  pricePerHour: 60,
  notificationEmail: "gildaatividades@gmail.com",
  offersDomicilio: true,
  pricePerHourDomicilio: 90,
};

// Contas de demonstração (mãe e admin) só nascem quando pedidas de propósito.
// Uma conta ADMIN com senha previsível dá acesso ao painel que aprova
// professoras, lê todas as reservas e vê endereço de família — não é coisa que
// possa aparecer num banco de produção por descuido de um comando.
const CREATE_DEMO_ACCOUNTS = process.env.SEED_DEMO_ACCOUNTS === "true";

async function main() {
  // Sem senha fixa no repositório: ou vem do ambiente, ou é sorteada e
  // impressa uma única vez aqui. Assim não existe credencial que qualquer
  // pessoa com acesso ao código já saiba de antemão.
  const seedPassword =
    process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  await prisma.user.deleteMany({
    where: { email: { in: REMOVED_TEACHER_EMAILS } },
  });

  const existingGilda = await prisma.user.findUnique({
    where: { email: GILDA.email },
  });

  if (!existingGilda) {
    await prisma.user.create({
      data: {
        name: GILDA.name,
        email: GILDA.email,
        phone: GILDA.phone,
        password: passwordHash,
        role: "PROFESSORA",
        teacherProfile: {
          create: {
            bio: GILDA.bio,
            specialties: GILDA.specialties,
            credentials: GILDA.credentials,
            whatsapp: GILDA.whatsapp,
            pricePerHour: GILDA.pricePerHour,
            photoUrl: GILDA.photoUrl,
            notificationEmail: GILDA.notificationEmail,
            offersDomicilio: GILDA.offersDomicilio,
            pricePerHourDomicilio: GILDA.pricePerHourDomicilio,
          },
        },
      },
    });
  }

  if (CREATE_DEMO_ACCOUNTS) {
    const maeEmail = "mae.exemplo@florescerkids.com.br";
    const existingMae = await prisma.user.findUnique({ where: { email: maeEmail } });
    if (!existingMae) {
      await prisma.user.create({
        data: {
          name: "Mãe Exemplo",
          email: maeEmail,
          phone: "11955554444",
          password: passwordHash,
          role: "MAE",
        },
      });
    }

    const adminEmail = "admin@florescerkids.com.br";
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (!existingAdmin) {
      await prisma.user.create({
        data: {
          name: "Administração",
          email: adminEmail,
          phone: "11900000000",
          password: passwordHash,
          role: "ADMIN",
        },
      });
    }
  }

  console.log("Seed concluído.");
  console.log(`  Professora: ${GILDA.email}`);
  if (CREATE_DEMO_ACCOUNTS) {
    console.log("  Mãe (demo): mae.exemplo@florescerkids.com.br");
    console.log("  Admin (demo): admin@florescerkids.com.br");
  } else {
    console.log(
      "  Contas de demonstração não criadas. Para criá-las em um banco de"
    );
    console.log("  desenvolvimento, rode com SEED_DEMO_ACCOUNTS=true.");
  }
  if (!process.env.SEED_PASSWORD) {
    console.log("");
    console.log(`  Senha sorteada para as contas criadas agora: ${seedPassword}`);
    console.log("  Anote: ela não é gravada em lugar nenhum e não se repete.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
