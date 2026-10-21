import { Router } from 'express'
import { sendCustomerPush } from '../lib/apns.js'
import { requireAdmin } from '../lib/auth.js'
import { requirePermission } from '../lib/permissions.js'
import { prisma } from '../lib/prisma.js'
import { broadcastSchema } from '../lib/validation.js'

// Messages to the clients (a promotion, the studio closing early…): a notification on the iPhones that have the app,
// and a line under the bell on the website and in the app for everyone.
export const adminBroadcastsRouter = Router()
adminBroadcastsRouter.use(requireAdmin, requirePermission('notificacoes'))

/** Clients who can receive it: real accounts, not the ones added by hand or deleted. */
const reachable = {
  NOT: [{ email: { endsWith: '@manual.invalid' } }, { email: { endsWith: '@removed.invalid' } }],
}

adminBroadcastsRouter.get('/', async (_req, res) => {
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { admin: { select: { name: true, email: true } } },
  })
  res.json(broadcasts)
})

/** How many clients a message to everyone reaches, and how many of them get it on their iPhone. */
adminBroadcastsRouter.get('/audience', async (_req, res) => {
  const [total, withApp] = await Promise.all([
    prisma.customer.count({ where: reachable }),
    prisma.customer.count({ where: { ...reachable, pushTokens: { some: {} } } }),
  ])
  res.json({ total, withApp })
})

adminBroadcastsRouter.post('/', async (req, res) => {
  const parsed = broadcastSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  const { title, body, audience, customerIds } = parsed.data
  const customers = await prisma.customer.findMany({
    where: { ...reachable, ...(audience === 'SELECTED' ? { id: { in: customerIds } } : {}) },
    select: { id: true },
  })
  if (customers.length === 0) {
    res.status(400).json({ error: 'Não há clientes para receber esta mensagem.' })
    return
  }

  // A few at a time, so a big list doesn't open hundreds of connections to Apple at once.
  for (let i = 0; i < customers.length; i += 20) {
    await Promise.all(customers.slice(i, i + 20).map((c) => sendCustomerPush(c.id, title, body)))
  }

  const broadcast = await prisma.broadcast.create({
    data: { title, body, audience, recipientCount: customers.length, adminId: req.adminId },
    include: { admin: { select: { name: true, email: true } } },
  })
  res.status(201).json(broadcast)
})
