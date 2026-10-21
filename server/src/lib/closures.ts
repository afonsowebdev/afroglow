import { prisma } from './prisma.js'

/** A moment's day in Lisbon, "YYYY-MM-DD", the way closed days are stored. */
export function lisbonDateKey(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' })
}

/** The closed periods that end today or later (the only ones that still matter for booking). */
export function currentClosures() {
  return prisma.closedPeriod.findMany({
    where: { endDate: { gte: lisbonDateKey(new Date()) } },
    orderBy: { startDate: 'asc' },
  })
}

/** Whether a moment falls on a closed day. */
export function isClosed(date: Date, closures: Array<{ startDate: string; endDate: string }>) {
  const key = lisbonDateKey(date)
  return closures.some((c) => c.startDate <= key && key <= c.endDate)
}

/**
 * The slots and bookings on the days of a closed period. Slots are stored in UTC, so the search window is a day
 * wider on each side and then narrowed to the Lisbon days.
 */
export async function slotsInPeriod(startDate: string, endDate: string) {
  const from = new Date(`${startDate}T00:00:00Z`)
  from.setUTCDate(from.getUTCDate() - 1)
  const to = new Date(`${endDate}T00:00:00Z`)
  to.setUTCDate(to.getUTCDate() + 2)
  const slots = await prisma.availabilitySlot.findMany({
    where: { startsAt: { gte: from, lt: to } },
    include: {
      bookings: {
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
        include: { service: true, customer: true, slot: true },
      },
    },
    orderBy: { startsAt: 'asc' },
  })
  return slots.filter((s) => {
    const key = lisbonDateKey(s.startsAt)
    return startDate <= key && key <= endDate
  })
}
