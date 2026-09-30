import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const notificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL
const resend = apiKey ? new Resend(apiKey) : null

const FROM_NOREPLY = 'Afroglow <noreply@afroglow.pt>'
const REPLY_TO_RESERVAS = 'reservas@afroglow.pt'
const REPLY_TO_GERAL = 'geral@afroglow.pt'
const LOGO_URL = 'https://afroglow.pt/images/email-icon.png'
const WORDMARK_URL = 'https://afroglow.pt/images/email-wordmark.png'

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function formatDate(date: Date) {
  return date.toLocaleString('pt-PT', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Lisbon' })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function emailLayout(bodyHtml: string) {
  return `
    <!doctype html>
    <html lang="pt">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style="margin:0; padding:0; background-color:#FFFFFF; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF; padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <img
                      src="${LOGO_URL}"
                      width="44"
                      height="44"
                      alt="Afroglow"
                      style="display:block; margin:0 auto 10px; border-radius:10px;"
                    />
                    <img
                      src="${WORDMARK_URL}"
                      width="169"
                      height="28"
                      alt="AFROGLOW"
                      style="display:block; margin:0 auto;"
                    />
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#FFFFFF; border:1px solid #EDE3CC; border-radius:14px; padding:32px 28px; color:#1A1008;">
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:22px; color:#9C8A72; font-size:12px;">
                    © Afroglow · afroglow.pt
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function detailRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:6px 0; color:#6B5B47; font-size:14px;">${label}</td>
      <td align="right" style="padding:6px 0; color:#1A1008; font-size:14px; font-weight:600;">${value}</td>
    </tr>
  `
}

function bookingDetailsTable(booking: {
  serviceName: string
  startsAt: Date
  durationLabel: string
  priceCents: number
}) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0; border-top:1px solid #EDE3CC; border-bottom:1px solid #EDE3CC;">
      ${detailRow('Serviço', escapeHtml(booking.serviceName))}
      ${detailRow('Data', escapeHtml(formatDate(booking.startsAt)))}
      ${detailRow('Duração', escapeHtml(booking.durationLabel))}
      ${detailRow('Preço', escapeHtml(formatPrice(booking.priceCents)))}
    </table>
  `
}

interface BookingEmailInput {
  serviceName: string
  startsAt: Date
  durationLabel: string
  priceCents: number
}

export async function sendBookingConfirmationEmail(to: string, booking: BookingEmailInput) {
  if (!resend) {
    console.warn('[resend] Email de confirmação de marcação ignorado: RESEND_API_KEY não configurada.')
    return
  }

  try {
    await resend.emails.send({
      from: FROM_NOREPLY,
      to,
      replyTo: REPLY_TO_RESERVAS,
      subject: 'Recebemos o teu pedido de marcação — Afroglow',
      html: emailLayout(`
        <h1 style="margin:0 0 12px; font-size:22px; color:#1A1008;">Pedido de marcação recebido</h1>
        <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#6B5B47;">
          Obrigada pelo teu pedido! Assim que for aceite, vais receber outro email de confirmação.
        </p>
        ${bookingDetailsTable(booking)}
      `),
    })
  } catch (error) {
    console.error('[resend] Falha ao enviar confirmação de marcação:', error)
  }
}

interface BookingNotificationInput extends BookingEmailInput {
  customerName: string
  customerPhone: string
}

export async function sendBookingNotification(booking: BookingNotificationInput) {
  if (!resend || !notificationEmail) {
    console.warn(
      '[resend] Notificação por email ignorada: RESEND_API_KEY ou ADMIN_NOTIFICATION_EMAIL não configurados.',
    )
    return
  }

  try {
    await resend.emails.send({
      from: FROM_NOREPLY,
      to: notificationEmail,
      subject: `Nova marcação: ${booking.serviceName}`,
      html: emailLayout(`
        <h1 style="margin:0 0 12px; font-size:22px; color:#1A1008;">Nova marcação pendente</h1>
        <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#6B5B47;">
          <strong style="color:#1A1008;">Cliente:</strong> ${escapeHtml(booking.customerName)}<br/>
          <strong style="color:#1A1008;">Telefone:</strong> ${escapeHtml(booking.customerPhone)}
        </p>
        ${bookingDetailsTable(booking)}
        <p style="margin:20px 0 0; font-size:14px; color:#6B5B47;">
          Entra na área de admin para aceitar ou recusar este pedido.
        </p>
      `),
    })
  } catch (error) {
    console.error('[resend] Falha ao enviar notificação de marcação:', error)
  }
}

export async function sendBookingAcceptedEmail(to: string, booking: BookingEmailInput) {
  if (!resend) {
    console.warn('[resend] Email de marcação aceite ignorado: RESEND_API_KEY não configurada.')
    return
  }

  try {
    await resend.emails.send({
      from: FROM_NOREPLY,
      to,
      replyTo: REPLY_TO_RESERVAS,
      subject: 'A tua marcação foi aceite — Afroglow',
      html: emailLayout(`
        <h1 style="margin:0 0 12px; font-size:22px; color:#1A1008;">Marcação confirmada</h1>
        <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#6B5B47;">
          A tua marcação foi aceite. Contamos contigo!
        </p>
        ${bookingDetailsTable(booking)}
        <p style="margin:20px 0 0; font-size:14px; color:#6B5B47;">
          Se precisares de reagendar ou cancelar, faz login na tua conta em afroglow.pt.
        </p>
      `),
    })
  } catch (error) {
    console.error('[resend] Falha ao enviar email de marcação aceite:', error)
  }
}

export async function sendBookingRejectedEmail(
  to: string,
  booking: Pick<BookingEmailInput, 'serviceName' | 'startsAt'>,
) {
  if (!resend) {
    console.warn('[resend] Email de marcação rejeitada ignorado: RESEND_API_KEY não configurada.')
    return
  }

  try {
    await resend.emails.send({
      from: FROM_NOREPLY,
      to,
      replyTo: REPLY_TO_RESERVAS,
      subject: 'Sobre o teu pedido de marcação — Afroglow',
      html: emailLayout(`
        <h1 style="margin:0 0 12px; font-size:22px; color:#1A1008;">Não foi desta vez</h1>
        <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#6B5B47;">
          Infelizmente a data que escolheste para <strong style="color:#1A1008;">${escapeHtml(booking.serviceName)}</strong>
          (${escapeHtml(formatDate(booking.startsAt))}) já não está disponível.
          Entra na tua conta e escolhe outro horário — temos todo o gosto em receber-te.
        </p>
      `),
    })
  } catch (error) {
    console.error('[resend] Falha ao enviar email de marcação rejeitada:', error)
  }
}

export async function sendBookingReminderEmail(to: string, booking: BookingEmailInput) {
  if (!resend) {
    console.warn('[resend] Lembrete de marcação ignorado: RESEND_API_KEY não configurada.')
    return
  }

  try {
    await resend.emails.send({
      from: FROM_NOREPLY,
      to,
      replyTo: REPLY_TO_RESERVAS,
      subject: 'Lembrete: a tua marcação é daqui a 2 dias — Afroglow',
      html: emailLayout(`
        <h1 style="margin:0 0 12px; font-size:22px; color:#1A1008;">Não te esqueças da tua marcação</h1>
        <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#6B5B47;">
          Isto é só um lembrete de que tens uma marcação a chegar. Até já!
        </p>
        ${bookingDetailsTable(booking)}
      `),
    })
  } catch (error) {
    console.error('[resend] Falha ao enviar lembrete de marcação:', error)
  }
}

export async function sendVerificationCodeEmail(to: string, code: string) {
  if (!resend) {
    throw new Error('RESEND_API_KEY não configurada.')
  }

  await resend.emails.send({
    from: FROM_NOREPLY,
    to,
    replyTo: REPLY_TO_GERAL,
    subject: 'O teu código de verificação Afroglow',
    html: emailLayout(`
      <h1 style="margin:0 0 12px; font-size:22px; color:#1A1008;">Confirma o teu email</h1>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#6B5B47;">
        O teu código de verificação é:
      </p>
      <p style="margin:0 0 20px; text-align:center; font-size:36px; letter-spacing:8px; font-weight:700; color:#8C6A24;">
        ${escapeHtml(code)}
      </p>
      <p style="margin:0 0 8px; font-size:14px; color:#6B5B47;">
        Este código expira em 15 minutos.
      </p>
      <p style="margin:0; font-size:14px; color:#6B5B47;">
        Se não criaste esta conta, ignora este email.
      </p>
    `),
  })
}
