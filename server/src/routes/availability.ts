import { Router } from 'express'
import { requirePermission } from '../lib/permissions.js'
import { requireAdmin } from '../lib/auth.js'
import { currentClosures, isClosed } from '../lib/closures.js'
import { prisma } from '../lib/prisma.js'
import { createSlotSchema, createSlotsBatchSchema } from '../lib/validation.js'

export const availabilityRouter = Router()

availabilityRouter.get('/', async (req, res) => {
  // `?include=busy` also returns slots that are taken (status only, no personal data), so the app can show them as "Ocupado".
  const includeBusy = req.query.include === 'busy'
  const [slots, closures] = await Promise.all([
    prisma.availabilitySlot.findMany({
      where: { ...(includeBusy ? {} : { status: 'OPEN' as const }), startsAt: { gte: new Date() } },
      select: { id: true, startsAt: true, status: true, createdAt: true },
      orderBy: { startsAt: 'asc' },
    }),
    currentClosures(),
  ])
  // Closed days show nothing to book.
  res.json(slots.filter((slot) => !isClosed(slot.startsAt, closures)))
})

export const adminAvailabilityRouter = Router()
adminAvailabilityRouter.use(requireAdmin, requirePermission('marcacoes'))

adminAvailabilityRouter.get('/', async (_req, res) => {
  const slots = await prisma.availabilitySlot.findMany({ orderBy: { startsAt: 'asc' } })
  res.json(slots)
})

adminAvailabilityRouter.post('/', async (req, res) => {
  const parsed = createSlotSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Data/hora inválida.' })
    return
  }

  if (isClosed(new Date(parsed.data.startsAt), await currentClosures())) {
    res.status(409).json({ error: 'Esse dia está fechado. Reabre-o em Dias fechados para abrir horários.' })
    return
  }

  try {
    const slot = await prisma.availabilitySlot.create({
      data: { startsAt: new Date(parsed.data.startsAt) },
    })
    res.status(201).json(slot)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: 'Já existe uma vaga nesse horário.' })
      return
    }
    console.error('[availability] create failed:', error)
    res.status(500).json({ error: 'Erro ao criar vaga.' })
  }
})

adminAvailabilityRouter.post('/batch', async (req, res) => {
  const parsed = createSlotsBatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Lista de horários inválida.' })
    return
  }

  // Times on closed days are left out (and counted as skipped).
  const closures = await currentClosures()
  const wanted = parsed.data.startsAtList.filter((startsAt) => !isClosed(new Date(startsAt), closures))
  const results = await Promise.allSettled(
    wanted.map((startsAt) => prisma.availabilitySlot.create({ data: { startsAt: new Date(startsAt) } })),
  )

  const created = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof prisma.availabilitySlot.create>>> => r.status === 'fulfilled').map((r) => r.value)
  const skipped = parsed.data.startsAtList.length - created.length

  res.status(201).json({ created, skipped, closedSkipped: parsed.data.startsAtList.length - wanted.length })
})

adminAvailabilityRouter.delete('/:id', async (req, res) => {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id: req.params.id } })
  if (!slot) {
    res.status(404).json({ error: 'Vaga não encontrada.' })
    return
  }
  if (slot.status !== 'OPEN') {
    res.status(400).json({ error: 'Só é possível remover vagas ainda disponíveis.' })
    return
  }

  await prisma.availabilitySlot.delete({ where: { id: slot.id } })
  res.status(204).end()
})

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}
