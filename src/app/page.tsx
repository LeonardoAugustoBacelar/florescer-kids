import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCheck,
  CheckCircle2,
  Ear,
  Home as HomeIcon,
  LineChart,
  MessageCircle,
  Puzzle,
  School,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CLINIC_WHATSAPP } from "@/lib/whatsapp";
import WhatsAppInlineButton from "@/components/WhatsAppInlineButton";
import TeacherCard from "@/components/TeacherCard";
import RatingStars from "@/components/RatingStars";
import SectionMark from "@/components/SectionMark";
import JsonLd from "@/components/JsonLd";
import { buildOrganizationSchema } from "@/lib/structuredData";

const STOCK_PHOTOS = {
  hug: "https://images.unsplash.com/photo-1752652011858-302f08a6dc9f?auto=format&fit=crop&w=1200&q=80",
  homework:
    "https://images.unsplash.com/photo-1752652012034-b28eca1e2faa?auto=format&fit=crop&w=1200&q=80",
  couch:
    "https://images.unsplash.com/photo-1758598737810-7489fde716af?auto=format&fit=crop&w=1200&q=80",
};

const COLOR_STYLES = {
  accent: { bg: "bg-accent-100", text: "text-accent-600", dark: "text-accent-400" },
  warm: { bg: "bg-warm-100", text: "text-warm-600", dark: "text-warm-400" },
  sky: { bg: "bg-sky-100", text: "text-sky-600", dark: "text-sky-400" },
  sun: { bg: "bg-sun-100", text: "text-sun-600", dark: "text-sun-400" },
  grass: { bg: "bg-grass-100", text: "text-grass-600", dark: "text-grass-400" },
} as const;

const SERVICES: {
  title: string;
  description: string;
  icon: typeof Puzzle;
  color: keyof typeof COLOR_STYLES;
}[] = [
  {
    title: "Aulas individuais",
    description:
      "Encontros só entre a professora e o seu filho — sem roteiro pronto. Cada aula é montada em cima do que a criança precisa: birras frequentes, TDAH, TEA e dificuldade de concentração, ou alfabetização, leitura, escrita e matemática, sempre no ritmo dela.",
    icon: Puzzle,
    color: "accent",
  },
  {
    title: "Orientação para mães",
    description:
      "Você não precisa adivinhar sozinha o que fazer. A professora explica o que está por trás de cada comportamento ou dificuldade e te dá orientações práticas para aplicar entre uma aula e outra — porque a mudança acontece em casa, no dia a dia, não só durante a aula.",
    icon: MessageCircle,
    color: "warm",
  },
  {
    title: "Alfabetização e reforço escolar",
    description:
      "Alfabetização e letramento, leitura e escrita, matemática e auxílio nas tarefas de casa, com atenção, carinho e atividades adequadas ao ritmo de cada criança. Quando a escola liga por conflitos de comportamento, também alinhamos estratégias com professores e coordenação.",
    icon: School,
    color: "sky",
  },
  {
    title: "Acompanhamento contínuo",
    description:
      "Nada de aula avulsa que não leva a lugar nenhum. Agende aulas recorrentes e receba relatórios de evolução após cada encontro, para acompanhar de perto — e comemorar — cada progresso do seu filho com o tempo.",
    icon: TrendingUp,
    color: "sun",
  },
];

const TARGET_SITUATIONS = [
  "Seu filho tem crises de birra frequentes e você já não sabe mais como agir",
  "Ele foi diagnosticado com TDAH ou TEA e você quer apoio especializado no dia a dia",
  "Ele tem dificuldade para aprender a ler e escrever, mesmo com apoio em casa",
  "Ele trava nas tarefas escolares ou tem dificuldade em matemática",
  "A escola te chama com frequência por causa de conflitos de comportamento",
  "Ele mostra sinais de ansiedade, choro fácil ou dificuldade de se regular emocionalmente",
  "Você sente que está sozinha nessa rotina e gostaria de orientação de quem entende",
];

const STEPS: {
  step: string;
  title: string;
  description: string;
  icon: typeof MessageCircle;
  color: keyof typeof COLOR_STYLES;
}[] = [
  {
    step: "1",
    title: "Conte sua história",
    description:
      "Fale com a gente pelo WhatsApp ou crie uma conta contando os desafios que você enfrenta com seu filho.",
    icon: MessageCircle,
    color: "accent",
  },
  {
    step: "2",
    title: "Conheça a Gilda",
    description:
      "Veja o perfil da Gilda, nossa professora especializada em comportamento infantil, e entenda como ela pode ajudar sua família.",
    icon: UserCheck,
    color: "warm",
  },
  {
    step: "3",
    title: "Agende as aulas",
    description:
      "Marque horários direto na plataforma, no dia e hora que funcionam para vocês.",
    icon: CalendarCheck,
    color: "sky",
  },
  {
    step: "4",
    title: "Acompanhe a evolução",
    description:
      "Receba retorno da professora após cada encontro e ajuste o plano conforme a criança avança.",
    icon: LineChart,
    color: "grass",
  },
];

const COMMITMENTS: {
  title: string;
  description: string;
  icon: typeof Ear;
  color: keyof typeof COLOR_STYLES;
}[] = [
  {
    title: "Escuta antes de qualquer coisa",
    description:
      "Antes de sugerir qualquer estratégia, ouvimos o que você já tentou e o que realmente acontece no dia a dia com seu filho.",
    icon: Ear,
    color: "sun",
  },
  {
    title: "Orientação também para você",
    description:
      "As aulas não são só com a criança — você recebe orientação prática de como agir em casa entre um encontro e outro.",
    icon: HomeIcon,
    color: "grass",
  },
  {
    title: "Contato direto e humano",
    description:
      "Sem burocracia: você fala com a professora pelo WhatsApp, no seu ritmo, sem depender de central de atendimento.",
    icon: MessageCircle,
    color: "accent",
  },
];

const HERO_CONVERSATION = [
  {
    from: "mae" as const,
    text: "Oi... meu filho tem crises de birra fortes e eu não sei mais o que fazer.",
  },
  {
    from: "gilda" as const,
    text: "Oi! Entendo. Vamos conversar com calma — me conta como costuma acontecer?",
  },
];

const BORDER_TOP = {
  accent: "border-t-accent-500",
  warm: "border-t-warm-500",
  sky: "border-t-sky-500",
  sun: "border-t-sun-500",
  grass: "border-t-grass-500",
} as const;

export default async function HomePage() {
  const teachers = await prisma.teacherProfile.findMany({
    where: { approved: true },
    include: {
      user: true,
      reviews: { include: { mae: { select: { name: true } } } },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  const featuredReviews = await prisma.review.findMany({
    where: { comment: { not: null } },
    include: { mae: true, teacher: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const heroWhatsAppMessage =
    "Olá! Vim pelo site e gostaria de entender como funciona o acompanhamento para meu filho(a).";

  return (
    <div>
      <JsonLd
        data={buildOrganizationSchema(teachers[0], teachers[0]?.reviews ?? [])}
      />
      {/* Hero */}
      <section className="border-b border-primary-100 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent-600">
              Para mães que precisam de apoio de verdade
            </span>
            <h1 className="mt-5 font-serif-display text-4xl font-semibold leading-[1.1] tracking-tight text-primary-700 sm:text-5xl">
              Ajudamos seu filho a lidar com os desafios de comportamento
              e a avançar nos estudos
            </h1>
            <p className="mt-5 text-lg text-primary-500">
              Conectamos mães à Gilda, professora especializada em
              comportamento infantil e pedagogia, com aulas individuais de
              alfabetização, reforço escolar, orientação para a família e
              acompanhamento contínuo — tudo começando por uma conversa no
              WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <WhatsAppInlineButton
                phone={CLINIC_WHATSAPP}
                message={heroWhatsAppMessage}
                label="Falar no WhatsApp agora"
                className="btn-press px-6 py-3 text-base"
              />
              <Link
                href="/professoras"
                className="btn-press group inline-flex items-center gap-2 rounded-md border border-primary-100 px-6 py-3 font-semibold text-primary-700 transition-colors hover:bg-primary-50"
              >
                Conhecer a professora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="relative h-64 overflow-hidden rounded-lg shadow-sm sm:h-72">
              <Image
                src={STOCK_PHOTOS.hug}
                alt="Mãe abraçando a filha com carinho"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="relative -mt-8 ml-6 mr-2 rounded-lg border border-primary-100 bg-white p-5 shadow-sm sm:ml-10">
              <div className="flex items-center gap-2.5 border-b border-primary-100 pb-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">
                  G
                </span>
                <div>
                  <p className="text-sm font-bold text-primary-700">
                    Gilda Bacelar
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wide text-accent-600">
                    responde no WhatsApp
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {HERO_CONVERSATION.map((message) => (
                  <div
                    key={message.text}
                    className={
                      message.from === "gilda"
                        ? "ml-auto max-w-[85%] rounded-lg rounded-br-none bg-accent-100 px-3.5 py-2.5 text-sm text-primary-700"
                        : "max-w-[85%] rounded-lg rounded-bl-none bg-primary-50 px-3.5 py-2.5 text-sm text-primary-700"
                    }
                  >
                    {message.text}
                  </div>
                ))}
                <div className="flex items-center justify-end gap-1 pr-1 text-accent-500">
                  <span className="font-mono text-[10px] text-primary-400">09:41</span>
                  <CheckCheck className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2
          data-reveal
          className="text-center font-serif-display text-3xl font-semibold text-primary-700"
        >
          Como funciona
        </h2>
        <SectionMark color="accent" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              data-reveal
              style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
              className="rounded-lg border border-primary-100 bg-white p-6 transition hover:shadow-sm"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-md ${COLOR_STYLES[step.color].bg} ${COLOR_STYLES[step.color].text}`}
              >
                <step.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-600">
                Passo {step.step}
              </p>
              <p className="mt-1 font-bold text-primary-700">{step.title}</p>
              <p className="mt-2 text-sm text-primary-700/80">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="bg-primary-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            data-reveal
            className="text-center font-serif-display text-3xl font-semibold text-primary-700"
          >
            Nossos serviços
          </h2>
          <SectionMark color="warm" />
          <p
            data-reveal
            className="mx-auto mt-4 max-w-2xl text-center text-primary-700/80"
          >
            Sabemos que você chegou até aqui depois de tentar de tudo. Por
            isso, cada serviço foi pensado para apoiar você e o seu filho —
            não só durante a aula, mas na rotina real da sua casa.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {SERVICES.map((service, index) => (
              <div
                key={service.title}
                data-reveal
                style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
                className={`flex gap-4 rounded-lg border-x border-b border-primary-100 border-t-4 bg-white p-6 transition hover:shadow-sm ${BORDER_TOP[service.color]}`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${COLOR_STYLES[service.color].bg} ${COLOR_STYLES[service.color].text}`}
                >
                  <service.icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-bold text-primary-700">
                    {service.title}
                  </p>
                  <p className="mt-1 text-sm text-primary-700/80">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div
            data-reveal
            className="relative order-2 h-72 overflow-hidden rounded-lg shadow-sm sm:h-96 md:order-1"
          >
            <Image
              src={STOCK_PHOTOS.homework}
              alt="Mãe ajudando a filha com a lição de casa"
              fill
              className="object-cover"
            />
          </div>
          <div className="order-1 md:order-2" data-reveal>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-warm-600">
              Para quem é o Florescer Kids
            </span>
            <h2 className="mt-3 font-serif-display text-3xl font-semibold text-primary-700">
              Se você se identifica com alguma dessas situações,
              estamos aqui para ajudar
            </h2>
            <SectionMark color="warm" align="left" />
            <ul className="mt-6 space-y-3">
              {TARGET_SITUATIONS.map((situation) => (
                <li key={situation} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-warm-500" />
                  <span className="text-sm text-primary-700/90 sm:text-base">
                    {situation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Professora em destaque */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif-display text-3xl font-semibold text-primary-700">
              Nossa professora
            </h2>
            <SectionMark color="sky" align="left" />
          </div>
          <Link
            href="/professoras"
            className="group inline-flex items-center gap-1 font-semibold text-accent-600 hover:underline"
          >
            Ver perfil completo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {teachers.length === 0 ? (
          <p className="mt-8 text-primary-700/70">
            Em breve mais informações estarão disponíveis por aqui.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher, index) => (
              <TeacherCard key={teacher.id} teacher={teacher} index={index} />
            ))}
          </div>
        )}
      </section>

      {/* Avaliações reais */}
      {featuredReviews.length > 0 && (
        <section className="bg-primary-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              data-reveal
              className="text-center font-serif-display text-3xl font-semibold text-primary-700"
            >
              O que as famílias dizem
            </h2>
            <SectionMark color="grass" />
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {featuredReviews.map((review, index) => (
                <div
                  key={review.id}
                  data-reveal
                  style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
                  className="rounded-lg border border-primary-100 bg-white p-6"
                >
                  <RatingStars average={review.rating} count={1} hideLabel />
                  <p className="mt-3 text-sm text-primary-700/90">
                    &quot;{review.comment}&quot;
                  </p>
                  <p className="mt-4 text-sm font-semibold text-primary-700">
                    {review.mae.name}
                  </p>
                  <p className="text-xs text-primary-700/60">
                    aula com {review.teacher.user.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Compromisso */}
      <section id="depoimentos" className="bg-primary-700 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 data-reveal className="text-center font-serif-display text-3xl font-semibold text-white">
            Nosso compromisso com sua família
          </h2>
          <SectionMark color="sun" />
          <div className="mt-10 grid items-center gap-10 md:grid-cols-2">
            <div
              data-reveal
              className="relative h-72 overflow-hidden rounded-lg sm:h-80"
            >
              <Image
                src={STOCK_PHOTOS.couch}
                alt="Mãe e filho sorrindo juntos em casa"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-5">
              {COMMITMENTS.map((item, index) => (
                <div
                  key={item.title}
                  data-reveal
                  style={{ "--reveal-delay": `${index * 80}ms` } as CSSProperties}
                  className="flex gap-4 rounded-lg border border-white/10 bg-white/5 p-6 text-primary-50"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/10 ${COLOR_STYLES[item.color].dark}`}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className={`font-semibold ${COLOR_STYLES[item.color].dark}`}>
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section
        data-reveal
        className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6"
      >
        <h2 className="font-serif-display text-3xl font-semibold text-primary-700">
          Não precisa enfrentar isso sozinha
        </h2>
        <SectionMark color="accent" />
        <p className="mt-4 text-primary-700/80">
          Fale com a Gilda agora mesmo pelo WhatsApp ou crie sua conta para
          agendar uma aula com ela.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <WhatsAppInlineButton
            phone={CLINIC_WHATSAPP}
            message={heroWhatsAppMessage}
            className="btn-press px-6 py-3 text-base"
          />
          <Link
            href="/cadastro"
            className="btn-press inline-flex items-center gap-2 rounded-md bg-primary-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Criar minha conta
          </Link>
          <Link
            href="/horarios"
            className="btn-press group inline-flex items-center gap-2 rounded-md border border-primary-100 px-6 py-3 font-semibold text-primary-700 transition-colors hover:bg-primary-50"
          >
            Ver horários
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
