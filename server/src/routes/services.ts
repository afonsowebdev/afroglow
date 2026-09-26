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
