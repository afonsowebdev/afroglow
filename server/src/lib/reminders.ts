import { bookingPush } from './booking-push.js'
import { prisma } from './prisma.js'
import { sendBookingReminderEmail } from './resend.js'

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
      await sendBookingReminderEmail(booking.customer.email, {
        serviceName: booking.service.name,
        priceCents: booking.service.priceCents,
        startsAt: booking.slot.startsAt,
        durationLabel: booking.service.durationLabel,
      })
      await bookingPush.reminder(booking)
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } })
      console.log(`[reminders] enviado para ${booking.customer.email} (booking ${booking.id})`)
    } catch (error) {
      console.error(`[reminders] falha ao enviar lembrete para booking ${booking.id}:`, error)
    }
  }
}
