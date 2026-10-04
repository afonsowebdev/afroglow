import { Router } from 'express'
import { requireAdmin } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { isPlaceholderEmail } from '../lib/resend.js'
import { customerNotesSchema } from '../lib/validation.js'

export const adminCustomersRouter = Router()
adminCustomersRouter.use(requireAdmin)

function present(customer: { id: string; name: string; email: string; phone: string; adminNotes: string; createdAt: Date }) {
  const placeholder = isPlaceholderEmail(customer.email)
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    adminNotes: customer.adminNotes,
    createdAt: customer.createdAt,
    // Clients added by hand have no real email / account.
    email: placeholder ? null : customer.email,
    hasAccount: !customer.email.endsWith('@manual.invalid'),
  }
}

adminCustomersRouter.get('/', async (_req, res) => {
  const customers = await prisma.customer.findMany({
    where: { NOT: { email: { endsWith: '@removed.invalid' } } },
    include: { bookings: { include: { slot: true, service: true } } },
    orderBy: { createdAt: 'desc' },
  })

  res.json(
    customers.map((customer) => {
      const done = customer.bookings.filter((b) => b.status === 'ACCEPTED')
      const times = customer.bookings.map((b) => b.slot.startsAt.getTime())
      return {
        ...present(customer),
        bookingCount: done.length,
        spentCents: done.reduce((sum, b) => sum + b.service.priceCents, 0),
        lastBookingAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
      }
    }),
  )
})

adminCustomersRouter.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { bookings: { include: { slot: true, service: true }, orderBy: { createdAt: 'desc' } } },
  })
  if (!customer) {
    res.status(404).json({ error: 'Cliente não encontrado.' })
    return
  }
  res.json({ ...present(customer), bookings: customer.bookings })
})

adminCustomersRouter.patch('/:id/notes', async (req, res) => {
  const parsed = customerNotesSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Notas inválidas (máximo 1000 caracteres).' })
    return
  }
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: parsed.data })
    res.json(present(customer))
  } catch {
    res.status(404).json({ error: 'Cliente não encontrado.' })
  }
})
