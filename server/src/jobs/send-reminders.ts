// Standalone script, not part of the web server — meant to run as a
// recurring Cron Job (e.g. on Render) so it keeps working across web
// service restarts/deploys instead of relying on an in-process timer.
import { PrismaClient } from '@prisma/client'
import { sendBookingReminderEmail } from '../lib/resend.js'

const prisma = new PrismaClient()

const REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000

async function main() {
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

  console.log(`[reminders] ${bookings.length} marcação(ões) a lembrar.`)

  for (const booking of bookings) {
    try {
      await sendBookingReminderEmail(booking.customer.email, {
        serviceName: booking.service.name,
        priceCents: booking.service.priceCents,
        startsAt: booking.slot.startsAt,
        durationLabel: booking.service.durationLabel,
      })
      await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } })
      console.log(`[reminders] enviado para ${booking.customer.email} (booking ${booking.id})`)
    } catch (error) {
      console.error(`[reminders] falha ao enviar lembrete para booking ${booking.id}:`, error)
    }
  }
}

main()
  .catch((error) => {
    console.error('[reminders] execução falhou:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
