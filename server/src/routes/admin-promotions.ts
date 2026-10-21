import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { requirePermission } from '../lib/permissions.js'
import { prisma } from '../lib/prisma.js'
import { promotionSchema } from '../lib/validation.js'

// Discounts on one hairstyle or on all of them, for a while. The public services list applies them (lib/promotions).
export const adminPromotionsRouter = Router()
adminPromotionsRouter.use(requireAdmin, requirePermission('catalogo'))

const include = { service: { select: { id: true, name: true } } } as const

adminPromotionsRouter.get('/', async (_req, res) => {
  const promotions = await prisma.promotion.findMany({ include, orderBy: [{ endsAt: 'desc' }] })
  res.json(promotions)
})

async function checkService(serviceId: string | null) {
  if (!serviceId) return true
  return Boolean(await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } }))
}

adminPromotionsRouter.post('/', async (req, res) => {
  const parsed = promotionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  if (!(await checkService(parsed.data.serviceId))) {
    res.status(404).json({ error: 'Modelo não encontrado.' })
    return
  }
  const promotion = await prisma.promotion.create({
    data: { ...parsed.data, startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt) },
    include,
  })
  res.status(201).json(promotion)
})

adminPromotionsRouter.put('/:id', async (req, res) => {
  const parsed = promotionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  if (!(await checkService(parsed.data.serviceId))) {
    res.status(404).json({ error: 'Modelo não encontrado.' })
    return
  }
  try {
    const promotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: { ...parsed.data, startsAt: new Date(parsed.data.startsAt), endsAt: new Date(parsed.data.endsAt) },
      include,
    })
    res.json(promotion)
  } catch {
    res.status(404).json({ error: 'Promoção não encontrada.' })
  }
})

// Pausing or resuming without touching the rest.
adminPromotionsRouter.patch('/:id/active', async (req, res) => {
  if (typeof req.body?.active !== 'boolean') {
    res.status(400).json({ error: 'Dados inválidos.' })
    return
  }
  try {
    const promotion = await prisma.promotion.update({ where: { id: req.params.id }, data: { active: req.body.active }, include })
    res.json(promotion)
  } catch {
    res.status(404).json({ error: 'Promoção não encontrada.' })
  }
})

adminPromotionsRouter.delete('/:id', async (req, res) => {
  // Bookings made during it keep the price they were made with.
  await prisma.promotion.deleteMany({ where: { id: req.params.id } })
  res.status(204).end()
})
