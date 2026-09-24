import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const notificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL
const resend = apiKey ? new Resend(apiKey) : null

interface BookingNotificationInput {
  customerName: string
  customerPhone: string
  serviceName: string
  priceCents: number
  startsAt: Date
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function formatDate(date: Date) {
  return date.toLocaleString('pt-PT', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Lisbon' })
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
      from: 'AFROGLOW <onboarding@resend.dev>',
      to: notificationEmail,
      subject: `Nova marcação: ${booking.serviceName}`,
      html: `
        <h2>Nova marcação pendente</h2>
        <p><strong>Serviço:</strong> ${booking.serviceName} (${formatPrice(booking.priceCents)})</p>
        <p><strong>Data:</strong> ${formatDate(booking.startsAt)}</p>
        <p><strong>Cliente:</strong> ${booking.customerName}, ${booking.customerPhone}</p>
        <p>Entra na área de admin para aceitar ou recusar este pedido.</p>
      `,
    })
  } catch (error) {
    console.error('[resend] Falha ao enviar notificação de marcação:', error)
  }
}
