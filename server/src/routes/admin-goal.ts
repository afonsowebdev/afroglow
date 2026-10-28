import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../lib/auth.js'
import { requirePermission } from '../lib/permissions.js'
import { prisma } from '../lib/prisma.js'

/** The monthly revenue goal shown on the admin Início (in cents; 0 when not set). */
export const adminGoalRouter = Router()
adminGoalRouter.use(requireAdmin, requirePermission('estatisticas', 'marcacoes'))

adminGoalRouter.get('/', async (_req, res) => {
  try {
    const row = await prisma.dashboardGoal.findUnique({ where: { id: 'main' } })
    res.json({ monthlyCents: row?.monthlyCents ?? 0 })
  } catch (error) {
    // Table not migrated yet: no goal, instead of breaking the Início.
    console.error('[goal] read failed:', error)
    res.json({ monthlyCents: 0 })
  }
})

const goalSchema = z.object({ monthlyCents: z.number().int().min(0).max(100_000_000) })

adminGoalRouter.put('/', requirePermission('estatisticas'), async (req, res) => {
  const parsed = goalSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Indica um valor válido.' })
    return
  }
  const row = await prisma.dashboardGoal.upsert({
    where: { id: 'main' },
    create: { id: 'main', monthlyCents: parsed.data.monthlyCents },
    update: { monthlyCents: parsed.data.monthlyCents },
  })
  res.json({ monthlyCents: row.monthlyCents })
})
