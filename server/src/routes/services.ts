import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { updateServiceSchema } from '../lib/validation.js'

export const servicesRouter = Router()

servicesRouter.get('/', async (_req, res) => {
  const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } })
  res.json(services)
})

export const adminServicesRouter = Router()
adminServicesRouter.use(requireAdmin)

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
