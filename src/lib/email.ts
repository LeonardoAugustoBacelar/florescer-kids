import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER ?? "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? "";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: `Florescer Kids <${GMAIL_USER}>`,
    to,
    subject: "Redefinir sua senha — Florescer Kids",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #18181b;">Redefinir sua senha</h2>
        <p>Recebemos um pedido para redefinir a senha da sua conta no Florescer Kids.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block; background:#18181b; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Criar nova senha
          </a>
        </p>
        <p>Este link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail.</p>
      </div>
    `,
  });
}

const MODALITY_LABELS: Record<string, string> = {
  ONLINE: "Online (videochamada)",
  DOMICILIO_CASA_ALUNO: "A domicílio — você vai até a família",
  DOMICILIO_CASA_PROFESSORA: "A domicílio — a família vem até você",
};

export async function sendNewBookingNotificationEmail(
  to: string,
  data: {
    maeName: string;
    childName: string;
    date: string;
    startTime: string;
    endTime: string;
    modality: string;
    address?: string | null;
  }
) {
  const modalityLabel = MODALITY_LABELS[data.modality] ?? data.modality;

  await transporter.sendMail({
    from: `Florescer Kids <${GMAIL_USER}>`,
    to,
    subject: `Nova aula agendada: ${data.childName} em ${data.date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #18181b;">Nova solicitação de aula</h2>
        <p><strong>${data.maeName}</strong> agendou uma aula para <strong>${data.childName}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Data</td>
            <td style="padding: 6px 0;"><strong>${data.date}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Horário</td>
            <td style="padding: 6px 0;"><strong>${data.startTime} às ${data.endTime}</strong></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #71717a;">Modalidade</td>
            <td style="padding: 6px 0;"><strong>${modalityLabel}</strong></td>
          </tr>
          ${
            data.address
              ? `<tr>
                  <td style="padding: 6px 0; color: #71717a;">Endereço</td>
                  <td style="padding: 6px 0;"><strong>${data.address}</strong></td>
                </tr>`
              : ""
          }
        </table>
        <p>Entre em "Minha área" no site para confirmar ou recusar.</p>
      </div>
    `,
  });
}

export async function sendBookingReminderEmail(
  to: string,
  data: {
    childName: string;
    teacherName: string;
    date: string;
    startTime: string;
    whatsappUrl: string;
    videoCallLink?: string | null;
  }
) {
  await transporter.sendMail({
    from: `Florescer Kids <${GMAIL_USER}>`,
    to,
    subject: `Lembrete: aula de ${data.childName} amanhã às ${data.startTime}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #18181b;">Sua aula é amanhã</h2>
        <p>
          Passando para lembrar que ${data.childName} tem aula (online) com
          <strong>${data.teacherName}</strong> amanhã, dia ${data.date}, às
          <strong>${data.startTime}</strong>.
        </p>
        ${
          data.videoCallLink
            ? `<p>
                <a href="${data.videoCallLink}" style="display:inline-block; background:#2f6f6b; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
                  Entrar na videochamada
                </a>
              </p>`
            : ""
        }
        <p>
          <a href="${data.whatsappUrl}" style="display:inline-block; background:#18181b; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Falar com a professora
          </a>
        </p>
      </div>
    `,
  });
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Layout dos e-mails de relacionamento (não transacionais).
 *
 * O rodapé com descadastro não é enfeite: sem saída fácil, quem não quer mais
 * receber marca como spam, e isso derruba a entrega de todos os outros e-mails
 * do domínio — inclusive os de redefinição de senha, que precisam chegar.
 */
function relationshipLayout({
  title,
  body,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
      <h2 style="color: #18181b; font-size: 20px;">${title}</h2>
      ${body}
      <p style="margin: 28px 0;">
        <a href="${ctaUrl}" style="display:inline-block; background:#2f6f6b; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
          ${ctaLabel}
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0 16px;" />
      <p style="font-size: 12px; color: #71717a; line-height: 1.5;">
        Você recebeu este e-mail porque tem uma conta no Florescer Kids.
        <a href="${unsubscribeUrl}" style="color: #71717a;">Não quero mais receber estes e-mails</a>.
      </p>
    </div>
  `;
}

async function sendRelationshipEmail(
  to: string,
  subject: string,
  options: Parameters<typeof relationshipLayout>[0]
) {
  await transporter.sendMail({
    from: `Florescer Kids <${GMAIL_USER}>`,
    to,
    subject,
    html: relationshipLayout(options),
  });
}

/** Criou conta e não chegou a agendar. */
export async function sendCadastroSemAgendamentoEmail(
  to: string,
  data: { name: string; unsubscribeUrl: string }
) {
  await sendRelationshipEmail(to, "Ficou com alguma dúvida?", {
    title: `Oi, ${data.name}`,
    body: `
      <p>Vi que você criou sua conta no Florescer Kids mas ainda não marcou
      uma aula. Isso é comum — muita mãe chega aqui sem saber direito se o
      que está acontecendo com o filho é caso pra buscar ajuda.</p>
      <p>Se for o seu caso, não precisa decidir nada agora. A primeira
      conversa com a Gilda serve justamente pra entender o que já foi
      tentado e o que está acontecendo de verdade.</p>
    `,
    ctaLabel: "Ver horários disponíveis",
    ctaUrl: `${SITE_URL}/horarios`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

/** Aula concluída sem avaliação. */
export async function sendPedidoAvaliacaoEmail(
  to: string,
  data: { name: string; childName: string; unsubscribeUrl: string }
) {
  await sendRelationshipEmail(to, "Como foi a aula?", {
    title: `Oi, ${data.name}`,
    body: `
      <p>A aula do ${data.childName} já aconteceu. Se puder, conte em duas
      linhas como foi — a avaliação aparece no site e ajuda outras mães que
      estão na mesma dúvida que você estava.</p>
      <p>Leva menos de um minuto e faz muita diferença.</p>
    `,
    ctaLabel: "Avaliar a aula",
    ctaUrl: `${SITE_URL}/dashboard`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

/** Avaliou com 5 estrelas — momento certo pra pedir indicação. */
export async function sendConviteIndicacaoEmail(
  to: string,
  data: { name: string; unsubscribeUrl: string }
) {
  await sendRelationshipEmail(to, "Conhece alguma mãe passando por isso?", {
    title: `Obrigada pela avaliação, ${data.name}`,
    body: `
      <p>Fico muito feliz que a experiência tenha sido boa.</p>
      <p>Se você conhece outra mãe passando pelo que você passou —
      dificuldade na escola, birras, criança que não para quieta — mandar
      o site pra ela pode encurtar um caminho que você já andou sozinha.</p>
    `,
    ctaLabel: "Compartilhar o site",
    ctaUrl: SITE_URL,
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

/** Sumiu depois da última aula. */
export async function sendReengajamentoEmail(
  to: string,
  data: { name: string; childName: string; unsubscribeUrl: string }
) {
  await sendRelationshipEmail(to, `Como está o ${data.childName}?`, {
    title: `Oi, ${data.name}`,
    body: `
      <p>Faz um tempo desde a última aula do ${data.childName}. Passei pra
      saber como ele está — se as coisas melhoraram, se apareceu alguma
      dificuldade nova, ou se simplesmente a rotina apertou.</p>
      <p>Se fizer sentido retomar, é só escolher um horário. Se não, também
      está tudo bem: fico feliz em saber que vocês estão indo bem.</p>
    `,
    ctaLabel: "Ver horários",
    ctaUrl: `${SITE_URL}/horarios`,
    unsubscribeUrl: data.unsubscribeUrl,
  });
}

/** Reserva parada esperando confirmação — o gargalo está na professora. */
export async function sendReservaPendenteProfessoraEmail(
  to: string,
  data: { maeName: string; childName: string; date: string; startTime: string }
) {
  await transporter.sendMail({
    from: `Florescer Kids <${GMAIL_USER}>`,
    to,
    subject: `Aula aguardando confirmação: ${data.childName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #18181b;">
        <h2 style="font-size: 20px;">Uma aula está esperando sua confirmação</h2>
        <p><strong>${data.maeName}</strong> agendou uma aula para
        <strong>${data.childName}</strong> em ${data.date}, às
        ${data.startTime}, e ainda não foi confirmada.</p>
        <p>Enquanto está pendente, a mãe fica sem saber se a aula vai
        acontecer — e é aí que muita gente desiste.</p>
        <p style="margin: 28px 0;">
          <a href="${SITE_URL}/dashboard" style="display:inline-block; background:#2f6f6b; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Abrir minha agenda
          </a>
        </p>
      </div>
    `,
  });
}
