import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { createSlotSchema, createSlotsBatchSchema } from '../lib/validation.js'

export const availabilityRouter = Router()

availabilityRouter.get('/', async (_req, res) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: { status: 'OPEN', startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
  })
  res.json(slots)
})

export const adminAvailabilityRouter = Router()
adminAvailabilityRouter.use(requireAdmin)

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

  const results = await Promise.allSettled(
    parsed.data.startsAtList.map((startsAt) => prisma.availabilitySlot.create({ data: { startsAt: new Date(startsAt) } })),
  )

  const created = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof prisma.availabilitySlot.create>>> => r.status === 'fulfilled').map((r) => r.value)
  const skipped = results.length - created.length

  res.status(201).json({ created, skipped })
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
