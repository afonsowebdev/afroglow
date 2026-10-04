import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'

export const adminStatsRouter = Router()
adminStatsRouter.use(requireAdmin)

// Months are Lisbon-local, like everywhere else in the admin.
function lisbonMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit' }).formatToParts(date)
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}`
}

adminStatsRouter.get('/', async (_req, res) => {
  const [bookings, customers] = await Promise.all([
    prisma.booking.findMany({ include: { slot: true, service: true } }),
    prisma.customer.findMany({
      where: { NOT: { email: { endsWith: '@removed.invalid' } } },
      select: { id: true, createdAt: true },
    }),
  ])

  const now = new Date()
  const currentKey = lisbonMonthKey(now)

  // Last 6 months, oldest first.
  const monthKeys: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15))
    monthKeys.push(lisbonMonthKey(d))
  }
  const months = monthKeys.map((key) => ({ key, bookings: 0, revenueCents: 0 }))

  const accepted = bookings.filter((b) => b.status === 'ACCEPTED')
  for (const booking of accepted) {
    const row = months.find((m) => m.key === lisbonMonthKey(booking.slot.startsAt))
    if (row) {
      row.bookings += 1
      row.revenueCents += booking.service.priceCents
    }
  }

  const byService = new Map<string, { name: string; count: number; revenueCents: number }>()
  for (const booking of accepted) {
    const row = byService.get(booking.serviceId) ?? { name: booking.service.name, count: 0, revenueCents: 0 }
    row.count += 1
    row.revenueCents += booking.service.priceCents
    byService.set(booking.serviceId, row)
  }

  const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length
  const acceptedPerCustomer = new Map<string, number>()
  for (const booking of accepted) {
    acceptedPerCustomer.set(booking.customerId, (acceptedPerCustomer.get(booking.customerId) ?? 0) + 1)
  }

  res.json({
    currentMonth: currentKey,
    months,
    topServices: [...byService.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    totals: {
      accepted: accepted.length,
      cancelled,
      rejected: bookings.filter((b) => b.status === 'REJECTED').length,
      pending: bookings.filter((b) => b.status === 'PENDING').length,
      // Share of confirmed-or-cancelled bookings that ended up cancelled.
      cancellationRate: accepted.length + cancelled > 0 ? cancelled / (accepted.length + cancelled) : 0,
    },
    clients: {
      total: customers.length,
      newThisMonth: customers.filter((c) => lisbonMonthKey(c.createdAt) === currentKey).length,
      returning: [...acceptedPerCustomer.values()].filter((n) => n >= 2).length,
    },
  })
})
