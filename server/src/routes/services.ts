import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { createServiceSchema, updateServiceSchema } from '../lib/validation.js'

export const servicesRouter = Router()

servicesRouter.get('/', async (_req, res) => {
  const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } })
  res.json(services)
})

export const adminServicesRouter = Router()
adminServicesRouter.use(requireAdmin)

adminServicesRouter.post('/', async (req, res) => {
  const parsed = createServiceSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados do serviço inválidos.' })
    return
  }

  try {
    const service = await prisma.service.create({ data: parsed.data })
    res.status(201).json(service)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ error: 'Já existe um serviço com esse nome.' })
      return
    }
    console.error('[services] create failed:', error)
    res.status(500).json({ error: 'Erro ao criar serviço.' })
  }
})

adminServicesRouter.patch('/:id', async (req, res) => {
  const parsed = updateServiceSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados do serviço inválidos.' })
    return
  }

  try {
    const service = await prisma.service.update({ where: { id: req.params.id }, data: parsed.data })
    res.json(service)
  } catch (error) {
    console.error('[services] update failed:', error)
    res.status(404).json({ error: 'Serviço não encontrado.' })
  }
})

// A service that still has live bookings (pending or accepted, for a time that
// has not passed yet) must not disappear from under the clients who booked it.
// A pending request whose slot is already in the past can never be fulfilled, so
// it counts as history instead of blocking the delete forever.
async function countServiceBookings(serviceId: string) {
  const bookings = await prisma.booking.findMany({
    where: { serviceId },
    select: { id: true, customerName: true, status: true, slot: { select: { startsAt: true } } },
    orderBy: { slot: { startsAt: 'asc' } },
  })
  const now = Date.now()
  const activeBookings = bookings
    .filter((b) => (b.status === 'PENDING' || b.status === 'ACCEPTED') && b.slot.startsAt.getTime() >= now)
    .map((b) => ({ id: b.id, customerName: b.customerName, status: b.status, startsAt: b.slot.startsAt }))
  return {
    total: bookings.length,
    active: activeBookings.length,
    history: bookings.length - activeBookings.length,
    activeBookings: activeBookings.slice(0, 10),
  }
}

adminServicesRouter.get('/:id/usage', async (req, res) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!service) {
    res.status(404).json({ error: 'Serviço não encontrado.' })
    return
  }
  res.json(await countServiceBookings(service.id))
})

adminServicesRouter.delete('/:id', async (req, res) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!service) {
    res.status(404).json({ error: 'Serviço não encontrado.' })
    return
  }

  const usage = await countServiceBookings(service.id)
  if (usage.active > 0) {
    res.status(409).json({
      error: `Este modelo tem ${usage.active} ${usage.active === 1 ? 'marcação ativa' : 'marcações ativas'}. Resolve-as primeiro (aceitar, recusar ou cancelar).`,
    })
    return
  }

  // Bookings reference the service (restrict), so the old history goes with it.
  await prisma.$transaction([
    prisma.booking.deleteMany({ where: { serviceId: service.id } }),
    prisma.service.delete({ where: { id: service.id } }),
  ])
  res.status(204).end()
})
