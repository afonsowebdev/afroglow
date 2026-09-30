// Manual/local entry point for a single reminders pass — the web server
// (src/index.ts) runs this same logic on its own interval in production, so
// this script is only for testing it in isolation.
import { prisma } from '../lib/prisma.js'
import { sendDueBookingReminders } from '../lib/reminders.js'

sendDueBookingReminders()
  .catch((error) => {
    console.error('[reminders] execução falhou:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
