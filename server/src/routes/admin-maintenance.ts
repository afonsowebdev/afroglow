import { Router } from 'express'
import { requireAdmin, verifyPassword } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { clearMonthSchema } from '../lib/validation.js'

export const adminMaintenanceRouter = Router()
adminMaintenanceRouter.use(requireAdmin)

// Slots are stored in UTC but the admin thinks in Lisbon-local months, so a
// slot's month membership is resolved via Intl rather than a raw UTC range
// (which would misclassify times near midnight during the DST transition).
function getLisbonYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  const year = Number(parts.find((p) => p.type === 'year')!.value)
  const month = Number(parts.find((p) => p.type === 'month')!.value)
  return { year, month }
}

function parseMonthParams(req: import('express').Request, res: import('express').Response) {
  const year = Number(req.params.year)
  const month = Number(req.params.month)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ error: 'Mês inválido.' })
    return null
  }
  return { year, month }
}

async function findSlotIdsInMonth(year: number, month: number) {
  const slots = await prisma.availabilitySlot.findMany({ select: { id: true, startsAt: true } })
  return slots
    .filter((slot) => {
      const { year: y, month: m } = getLisbonYearMonth(slot.startsAt)
      return y === year && m === month
    })
    .map((slot) => slot.id)
}

adminMaintenanceRouter.get('/months/:year/:month/summary', async (req, res) => {
  const parsedMonth = parseMonthParams(req, res)
  if (!parsedMonth) return

  const slotIds = await findSlotIdsInMonth(parsedMonth.year, parsedMonth.month)
  const bookingCount = slotIds.length ? await prisma.booking.count({ where: { slotId: { in: slotIds } } }) : 0

  res.json({ slotCount: slotIds.length, bookingCount })
})

adminMaintenanceRouter.post('/months/:year/:month/clear', async (req, res) => {
  const parsedMonth = parseMonthParams(req, res)
  if (!parsedMonth) return

  const parsed = clearMonthSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Password em falta.' })
    return
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.adminId } })
    if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
      res.status(401).json({ error: 'Password incorreta.' })
      return
    }

    const slotIds = await findSlotIdsInMonth(parsedMonth.year, parsedMonth.month)
    if (slotIds.length === 0) {
      res.json({ deletedBookings: 0, deletedSlots: 0 })
      return
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedBookings = await tx.booking.deleteMany({ where: { slotId: { in: slotIds } } })
      const deletedSlots = await tx.availabilitySlot.deleteMany({ where: { id: { in: slotIds } } })
      return { deletedBookings: deletedBookings.count, deletedSlots: deletedSlots.count }
    })

    res.json(result)
  } catch (error) {
    console.error('[admin-maintenance] clear month failed:', error)
    res.status(500).json({ error: 'Erro ao limpar dados do mês.' })
  }
})
