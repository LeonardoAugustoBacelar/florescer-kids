# Florescer Kids

Plataforma que conecta mães a professoras especializadas em **comportamento infantil e pedagogia** — aulas particulares (TDAH, TEA, birras, ansiedade, alfabetização, reforço escolar), com agendamento online ou a domicílio, pagamento por PIX e contato direto por WhatsApp.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss) ![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma) ![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel) ![Sentry](https://img.shields.io/badge/monitoring-Sentry-362d59?logo=sentry)

![Página inicial do Florescer Kids](docs/screenshot-home.png)

## Sobre o projeto

Mães que enfrentam desafios de comportamento ou aprendizagem com os filhos costumam pesquisar ajuda sozinhas, à noite, cansadas, sem saber por onde começar. O Florescer Kids existe para tornar esse primeiro passo simples: a mãe conhece o perfil de uma professora especializada, vê especialidades, formação, avaliações reais de outras famílias e preço, e já sai agendando uma aula — online ou presencial — ou falando direto no WhatsApp, sem formulário longo, sem espera.

O modelo é intencionalmente enxuto: cada professora tem um perfil completo (bio, formação, especialidades, foto), a mãe agenda diretamente num horário fixo de atendimento e paga a aula via PIX, direto para a professora. Um painel de administração permite acompanhar reservas e aprovar novas professoras.

## Funcionalidades

- **Perfis de professoras** com bio, formação/credenciais, foto, tags de especialidade coloridas por categoria e avaliações reais de mães
- **Atendimento online**, por videochamada (Google Meet) — seg-sex a partir das 17h, fins de semana a partir das 14h, no máximo 3 aulas/dia
- **Atendimento a domicílio** (área de serviço restrita), com a família escolhendo a direção (professora vai até a família, ou a família vai até a professora) — máximo 1 atendimento/dia, endereço tratado como dado sensível (só visível entre as duas partes, nunca público)
- **Bloqueio de dias** pela professora (viagem, feriado, imprevisto) — o dia some da disponibilidade automaticamente
- **Agendamento de aulas** com verificação de horário disponível em tempo real e um índice único no banco que impede duas reservas no mesmo horário mesmo em caso de corrida entre requisições simultâneas
- **Pagamento por PIX**: QR code (BR Code) e chave gerados dinamicamente, com o valor certo pra cada modalidade
- **Nota pós-aula**: a professora registra o que trabalhou depois de concluir uma aula, visível pra mãe no painel dela
- **Avaliações**: mães avaliam a aula (1–5 estrelas + comentário) depois de concluída
- **Contato direto por WhatsApp** (click-to-chat) — botão flutuante, por professora e por aula agendada
- **E-mails transacionais**: aviso pra professora a cada novo agendamento, lembrete no dia anterior a cada aula confirmada, redefinição de senha
- **Painel da mãe**: aulas agendadas, cancelamento, histórico, contador de aulas com a professora
- **Painel da professora**: perfil, agenda (pendentes/confirmadas/histórico), resumo de ganhos previstos e avaliação média, dicas rotativas
- **Painel de administração**: aprovação de professoras, visão geral das reservas
- **Rate limiting** em login, cadastro e recuperação de senha (proteção contra força bruta)
- **Monitoramento de erros em produção** (Sentry) — cliente, servidor e edge
- **SEO completo**: metadata por página, Open Graph dinâmico, sitemap, robots.txt
- **Identidade visual própria**: paleta editorial com cores por categoria de especialidade, tipografia serifada + mono, animações discretas de scroll

## Tecnologias

| Camada | Stack |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript |
| Estilo | Tailwind CSS v4, tipografia via `next/font` (Source Serif 4 + Geist) |
| Banco de dados | PostgreSQL via [Neon](https://neon.tech), [Prisma ORM v7](https://www.prisma.io) (`@prisma/adapter-neon`) |
| Autenticação | [NextAuth v5](https://authjs.dev) (credenciais e-mail/senha, papéis mãe / professora / admin) |
| Pagamentos | PIX (BR Code gerado com [`qrcode`](https://www.npmjs.com/package/qrcode), sem intermediário) |
| E-mail | SMTP do Gmail via [Nodemailer](https://nodemailer.com) — avisos, lembretes e redefinição de senha |
| Monitoramento | [Sentry](https://sentry.io) (`@sentry/nextjs`) — captura de erros em cliente, servidor e edge |
| Deploy | [Vercel](https://vercel.com) (deploy automático a cada push em `main`) |

## Como rodar localmente

Você precisa de um banco Postgres (o mais simples é criar um projeto grátis no [Neon](https://neon.tech) — veja o passo a passo completo na seção de deploy abaixo).

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL e as demais variáveis (veja a tabela abaixo)
npx prisma migrate dev --name init   # cria as tabelas no banco
SEED_DEMO_ACCOUNTS=true npm run db:seed   # cria a professora + contas de demonstração
npm run dev
```

Acesse http://localhost:3000. O seed imprime no terminal os e-mails criados e **uma senha sorteada na hora** — anote, porque ela não é gravada em lugar nenhum e muda a cada execução. Para escolher a senha em vez de sortear, use `SEED_PASSWORD=...`.

As contas de demonstração (mãe e admin) só são criadas com `SEED_DEMO_ACCOUNTS=true`, e existem só para desenvolvimento: uma conta ADMIN dá acesso ao painel que aprova professoras e lê todas as reservas, então ela não deve existir num banco de produção. Sem essa variável, o seed cria apenas o perfil da professora.

## Variáveis de ambiente (`.env`)

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Connection string do Postgres (Neon) |
| `AUTH_SECRET` | Chave usada pelo NextAuth para assinar sessões — gere com `openssl rand -base64 32` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número de WhatsApp da equipe (DDI+DDD, só dígitos) usado no botão flutuante do site |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site, usada nos e-mails e no metadata de SEO |
| `GMAIL_USER` | Conta do Gmail usada para enviar e-mails transacionais via SMTP |
| `GMAIL_APP_PASSWORD` | Senha de app do Gmail (gerada em myaccount.google.com/apppasswords, não é a senha normal da conta) |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN do projeto no Sentry, para captura de erros em produção (opcional em dev) |
| `CRON_SECRET` | Token que protege a rota do cron de lembretes de aula (`/api/cron/booking-reminders`) |

## Estrutura principal

- `src/app/page.tsx` — landing page (hero, serviços, professoras em destaque, avaliações)
- `src/app/professoras` — listagem e perfil da professora, com agendamento online, PIX e avaliações
- `src/app/horarios` — disponibilidade dos próximos dias (atendimento online) e informações de pagamento por PIX
- `src/app/domicilio` — atendimento presencial: área de serviço, escolha de direção, agenda própria e FAQ
- `src/app/cadastro`, `src/app/login`, `src/app/esqueci-senha` — conta (mãe ou professora), login e recuperação de senha
- `src/app/dashboard` — painel: mães veem aulas agendadas; professoras editam perfil, gerenciam a agenda e bloqueiam dias
- `src/app/admin` — aprovação de professoras e visão geral das reservas
- `src/app/api/cron/booking-reminders` — envia lembrete por e-mail no dia anterior a cada aula confirmada
- `src/lib/schedule.ts` — regras fixas de horário (online e a domicílio, cada uma com seu limite diário)
- `src/lib/pix.ts` — geração do payload PIX (BR Code) e do QR code, com valor configurável
- `src/lib/email.ts` — envio de e-mails transacionais (Nodemailer/Gmail)
- `src/lib/rateLimit.ts` + `src/lib/clientIp.ts` — rate limiting baseado em banco, sem dependência externa
- `src/lib/actions` — Server Actions (cadastro, login, agendamento, avaliação, perfil, bloqueio de dias, admin)
- `src/components` — componentes de UI compartilhados (`SpecialtyTags`, `SectionMark`, `PixPaymentInfo`, `RatingStars`, `TeacherCard`, formulários)
- `src/instrumentation.ts` + `sentry.*.config.ts` — configuração do Sentry
- `prisma/schema.prisma` — modelos `User`, `TeacherProfile`, `Booking` (com modalidade online/domicílio), `BlockedDate`, `Review`, `RateLimitAttempt`
- `prisma/seed.ts` — dados de exemplo

## Sobre a integração com WhatsApp

A integração é via **click-to-chat** (`https://wa.me/<número>?text=...`), que não exige aprovação da Meta nem tem custo — funciona com qualquer número comum. Aparece em vários pontos: botão flutuante em todas as páginas, botão no perfil de cada professora (com mensagem pré-preenchida) e botão em cada aula agendada no painel da mãe.

Se no futuro for necessário automatizar respostas ou confirmações, é possível evoluir para a **WhatsApp Business API** (Meta Cloud API ou provedores como Twilio/Z-API), mas isso exige aprovação de conta business e tem custo por mensagem.

## Como configurar o pagamento por PIX

Não há integração com gateway de pagamento: o site gera um QR code (BR Code) e mostra a chave PIX da professora, e o pagamento é feito manualmente, fora da plataforma — a mãe agenda a aula, paga direto para a professora e o agendamento é confirmado por confiança (sem verificação automática de pagamento).

Os dados do recebedor (chave PIX, nome e cidade — exigidos pelo padrão do Banco Central) ficam em `PIX_CONFIG`, no topo de `src/lib/pix.ts`. O valor mostrado no QR code varia conforme a modalidade — vem do preço configurado no perfil de cada professora (`pricePerHour` para online, `pricePerHourDomicilio` para atendimento a domicílio).

As regras de horário (dias/horas de atendimento e limite de aulas por dia, para cada modalidade) ficam em `src/lib/schedule.ts`.

## Deploy (passo a passo)

### 1. Banco de dados (Neon)

Crie uma conta em https://neon.tech, crie um projeto (região São Paulo/`sa-east-1` se disponível) e copie a connection string para `DATABASE_URL`.

### 2. GitHub

```bash
git remote add origin https://github.com/SEU-USUARIO/florescer-kids.git
git branch -M main
git push -u origin main
```

### 3. Vercel

1. Importe o repositório em https://vercel.com (Add New → Project)
2. A Vercel detecta Next.js automaticamente
3. Antes do primeiro deploy, adicione todas as variáveis da tabela acima em **Environment Variables**
4. Clique em **Deploy**

Depois do primeiro deploy, um domínio próprio pode ser configurado em **Project Settings → Domains**.

### 4. Depois do deploy

- Configure o cron de lembretes (`vercel.json` já define o schedule) e garanta que `CRON_SECRET` está setado
- Crie um projeto Next.js em https://sentry.io e adicione `NEXT_PUBLIC_SENTRY_DSN` para monitoramento de erros
- Todo `git push` em `main` publica uma nova versão automaticamente

## Roadmap

- Testes automatizados e CI (lint/build/test a cada push)
- Analytics de conversão
