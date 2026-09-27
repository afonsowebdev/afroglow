import { Router } from 'express'
import { sendTestPushAndReport } from '../lib/apns.js'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { registerPushTokenSchema } from '../lib/validation.js'

export const pushRouter = Router()
pushRouter.use(requireAdmin)

// TEMPORARY — diagnostic only, remove once push notifications are confirmed
// working reliably in production. Reports Apple's actual response instead of
// only logging server-side, since we don't have direct log access.
pushRouter.get('/test', async (_req, res) => {
  const report = await sendTestPushAndReport()
  res.json(report)
})

pushRouter.post('/', async (req, res) => {
  const parsed = registerPushTokenSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Token inválido.' })
    return
  }

  try {
    await prisma.pushToken.upsert({
      where: { token: parsed.data.token },
      update: { adminId: req.adminId! },
      create: { token: parsed.data.token, adminId: req.adminId! },
    })
    res.status(204).end()
  } catch (error) {
    console.error('[push] failed to register token:', error)
    res.status(500).json({ error: 'Erro ao registar o token.' })
  }
})
