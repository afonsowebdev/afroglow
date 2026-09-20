import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

export const servicesRouter = Router()

servicesRouter.get('/', async (_req, res) => {
  const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } })
  res.json(services)
})
