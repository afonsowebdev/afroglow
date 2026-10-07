import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { hashPassword, requireAdmin, verifyPassword } from '../lib/auth.js'
import { removeCustomer } from '../lib/customer-removal.js'
import { prisma } from '../lib/prisma.js'
import { isPlaceholderEmail } from '../lib/resend.js'
import { customerNotesSchema, deleteCustomersSchema } from '../lib/validation.js'

export const adminCustomersRouter = Router()
adminCustomersRouter.use(requireAdmin)

function present(customer: {
  id: string
  name: string
  email: string
  phone: string
  adminNotes: string
  reminderChannel: string
  createdAt: Date
}) {
  const placeholder = isPlaceholderEmail(customer.email)
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    adminNotes: customer.adminNotes,
    // Clients added by hand have no real email, so their reminder always goes by text message.
    reminderChannel: placeholder ? 'PHONE' : customer.reminderChannel,
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

// Deletes one or many customers. Always asks for the admin's own password.
adminCustomersRouter.post('/delete', async (req, res) => {
  const parsed = deleteCustomersSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Escolhe os clientes e confirma com a tua password.' })
    return
  }
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.adminId } })
    if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
      res.status(401).json({ error: 'Password incorreta.' })
      return
    }
    const customers = await prisma.customer.findMany({
      where: { id: { in: parsed.data.ids }, NOT: { email: { endsWith: '@removed.invalid' } } },
      select: { id: true, email: true },
    })
    const lockedHash = await hashPassword(randomBytes(24).toString('hex'))
    await prisma.$transaction(
      async (tx) => {
        for (const customer of customers) await removeCustomer(tx, customer, lockedHash)
      },
      { timeout: 60_000 },
    )
    res.json({ deleted: customers.length })
  } catch (error) {
    console.error('[admin-customers] delete failed:', error)
    res.status(500).json({ error: 'Erro ao eliminar clientes.' })
  }
})
