import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { bookingPush } from '../lib/booking-push.js'
import { lisbonDateKey, slotsInPeriod } from '../lib/closures.js'
import { requirePermission } from '../lib/permissions.js'
import { bookingServiceName } from '../lib/pricing.js'
import { prisma } from '../lib/prisma.js'
import { sendBookingRejectedEmail } from '../lib/resend.js'
import { closedPeriodSchema } from '../lib/validation.js'

// Days the studio is closed: holidays, days off. Closing removes the free times on those days, hides any that are
// left, keeps new ones from being opened, and can cancel the bookings already made (telling the clients).
export const adminClosuresRouter = Router()
adminClosuresRouter.use(requireAdmin, requirePermission('marcacoes'))

adminClosuresRouter.get('/', async (_req, res) => {
  // The current and coming ones, and the last few that are over.
  const today = lisbonDateKey(new Date())
  const [current, past] = await Promise.all([
    prisma.closedPeriod.findMany({ where: { endDate: { gte: today } }, orderBy: { startDate: 'asc' } }),
    prisma.closedPeriod.findMany({ where: { endDate: { lt: today } }, orderBy: { endDate: 'desc' }, take: 5 }),
  ])
  res.json({ current, past })
})

/** What closing those days would touch, before confirming. */
adminClosuresRouter.get('/preview', async (req, res) => {
  const startDate = String(req.query.start ?? '')
  const endDate = String(req.query.end ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
    res.status(400).json({ error: 'Datas inválidas.' })
    return
  }
  const slots = await slotsInPeriod(startDate, endDate)
  const bookings = slots.flatMap((s) => s.bookings)
  res.json({
    openSlots: slots.filter((s) => s.status === 'OPEN').length,
    bookings: bookings.map((b) => ({
      id: b.id,
      customerName: b.customerName,
      serviceName: b.service.name,
      status: b.status,
      startsAt: b.slot.startsAt,
    })),
  })
})

adminClosuresRouter.post('/', async (req, res) => {
  const parsed = closedPeriodSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  const { startDate, endDate, reason, bookings: handling, message } = parsed.data
  const slots = await slotsInPeriod(startDate, endDate)
  const affected = slots.flatMap((s) => s.bookings)
  const toCancel = handling === 'CANCEL' ? affected : []

  const period = await prisma.$transaction(async (tx) => {
    const period = await tx.closedPeriod.create({ data: { startDate, endDate, reason } })
    for (const booking of toCancel) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: booking.status === 'PENDING' ? 'REJECTED' : 'CANCELLED' },
      })
      await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: 'OPEN' } })
    }
    // Free times with no history go; the ones with old bookings attached stay (hidden while the days are closed).
    await tx.availabilitySlot.deleteMany({
      where: { id: { in: slots.map((s) => s.id) }, status: 'OPEN', bookings: { none: {} } },
    })
    return period
  })

  // The clients hear about it the same way as any other refused or cancelled booking.
  const note = message || (reason ? `O estúdio está fechado nesse dia (${reason}).` : 'O estúdio está fechado nesse dia.')
  for (const booking of toCancel) {
    if (booking.status === 'PENDING') {
      await sendBookingRejectedEmail(booking.customer.email, { serviceName: bookingServiceName(booking), startsAt: booking.slot.startsAt }, note)
      await bookingPush.rejected(booking, note)
    } else {
      await bookingPush.cancelled(booking, note)
    }
  }

  res.status(201).json({
    period,
    removedSlots: slots.filter((s) => s.status === 'OPEN' && s.bookings.length === 0).length,
    cancelledBookings: toCancel.length,
    keptBookings: affected.length - toCancel.length,
  })
})

// Opens the days again. The times that were removed don't come back on their own: open them in Horários.
adminClosuresRouter.delete('/:id', async (req, res) => {
  await prisma.closedPeriod.deleteMany({ where: { id: req.params.id } })
  res.status(204).end()
})
