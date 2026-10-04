import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { businessSettingsSchema } from '../lib/validation.js'

const EMPTY = {
  whatsappNumber: '',
  phone: '',
  address: '',
  mapUrl: '',
  openingHours: [] as Array<{ days: string; hours: string }>,
  cancellationPolicy: '',
}

async function readSettings() {
  let row
  try {
    row = await prisma.businessSettings.findUnique({ where: { id: 'main' } })
  } catch (error) {
    // Table not migrated yet: behave as "nothing filled in" instead of breaking the site.
    console.error('[settings] read failed:', error)
    return EMPTY
  }
  if (!row) return EMPTY
  const { id: _id, updatedAt: _updatedAt, ...rest } = row
  return rest
}

export const settingsRouter = Router()

settingsRouter.get('/', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60')
  res.json(await readSettings())
})

export const adminSettingsRouter = Router()
adminSettingsRouter.use(requireAdmin)

adminSettingsRouter.put('/', async (req, res) => {
  const parsed = businessSettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados inválidos.' })
    return
  }
  await prisma.businessSettings.upsert({
    where: { id: 'main' },
    create: { id: 'main', ...parsed.data },
    update: parsed.data,
  })
  res.json(await readSettings())
})
