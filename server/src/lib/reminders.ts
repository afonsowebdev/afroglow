import { bookingPush } from './booking-push.js'
import { prisma } from './prisma.js'
import { isPlaceholderEmail, sendBookingReminderEmail } from './resend.js'
import { sendSms } from './sms.js'

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000

export async function sendDueBookingReminders() {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS)

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'ACCEPTED',
      reminderSentAt: null,
      slot: { startsAt: { gte: now, lte: windowEnd } },
    },
    include: { slot: true, service: true, customer: true },
  })

  if (bookings.length === 0) return

  console.log(`[reminders] ${bookings.length} marcação(ões) a lembrar.`)

  for (const booking of bookings) {
    try {
      // The customer chooses where the reminder goes (email or text message). Clients added by hand have no real
      // email, so theirs always goes by text. A text that cannot be sent falls back to email when there is one.
      const hasEmail = !isPlaceholderEmail(booking.customer.email)
      const wantsPhone = booking.customer.reminderChannel === 'PHONE' || !hasEmail
      const when = booking.slot.startsAt.toLocaleString('pt-PT', {
        timeZone: 'Europe/Lisbon',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
      const texted =
        wantsPhone &&
        (await sendSms(
          booking.customer.phone,
          `AFROGLOW: lembrete da tua sessão de ${booking.service.name}, ${when}. Até já!`,
        ))
      if (hasEmail && !texted) {
        await sendBookingReminderEmail(booking.customer.email, {
          serviceName: booking.service.name,
          priceCents: booking.service.priceCents,
          startsAt: booking.slot.startsAt,
          durationLabel: booking.service.durationLabel,
        })
      }
      await bookingPush.reminder(booking)
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } })
      console.log(`[reminders] enviado para ${booking.customer.email} (booking ${booking.id})`)
    } catch (error) {
      console.error(`[reminders] falha ao enviar lembrete para booking ${booking.id}:`, error)
    }
  }
}
