import { Router } from 'express'
import { requirePermission } from '../lib/permissions.js'
import { randomBytes } from 'node:crypto'
import { hashPassword, requireAdmin, verifyPassword } from '../lib/auth.js'
import { removeCustomer } from '../lib/customer-removal.js'
import { prisma } from '../lib/prisma.js'
import { isPlaceholderEmail } from '../lib/resend.js'
import { customerNotesSchema, customerPhotoSchema, deleteCustomersSchema } from '../lib/validation.js'
import { bookingPrice } from '../lib/pricing.js'

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

// The list is also how a booking added by hand finds its client.
adminCustomersRouter.get('/', requirePermission('clientes', 'marcacoes'), async (_req, res) => {
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
        spentCents: done.reduce((sum, b) => sum + bookingPrice(b), 0),
        lastBookingAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
      }
    }),
  )
})

adminCustomersRouter.use(requirePermission('clientes'))

adminCustomersRouter.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      bookings: { include: { slot: true, service: true }, orderBy: { slot: { startsAt: 'desc' } } },
      photos: { select: { id: true, caption: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!customer) {
    res.status(404).json({ error: 'Cliente não encontrado.' })
    return
  }

  // The client's story in numbers: what she spent, how often she comes, what she likes.
  const now = Date.now()
  const done = customer.bookings.filter((b) => b.status === 'ACCEPTED' && b.slot.startsAt.getTime() < now)
  const spentCents = done.reduce((sum, b) => sum + bookingPrice(b), 0)
  const favourite = new Map<string, number>()
  for (const b of done) favourite.set(b.service.name, (favourite.get(b.service.name) ?? 0) + 1)
  const next = [...customer.bookings]
    .filter((b) => b.status === 'ACCEPTED' && b.slot.startsAt.getTime() >= now)
    .sort((a, b) => a.slot.startsAt.getTime() - b.slot.startsAt.getTime())[0]
  const visits = done.map((b) => b.slot.startsAt.getTime()).sort((a, b) => a - b)
  const gaps = visits.slice(1).map((t, i) => t - visits[i])

  res.json({
    ...present(customer),
    bookings: customer.bookings,
    photos: customer.photos,
    summary: {
      visits: done.length,
      spentCents,
      averageCents: done.length ? Math.round(spentCents / done.length) : 0,
      firstVisitAt: visits.length ? new Date(visits[0]).toISOString() : null,
      lastVisitAt: visits.length ? new Date(visits[visits.length - 1]).toISOString() : null,
      // Days between visits, on average (from two visits on).
      everyDays: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length / 86_400_000) : null,
      favouriteService: [...favourite.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      cancelled: customer.bookings.filter((b) => b.status === 'CANCELLED').length,
      nextBookingId: next?.id ?? null,
    },
  })
})

// Private photos of her hair: the list, one as a data URL (the app can't send its login header with an <img>),
// adding (already resized by the app) and removing.
adminCustomersRouter.get('/:id/photos/:photoId', async (req, res) => {
  const photo = await prisma.customerPhoto.findFirst({ where: { id: req.params.photoId, customerId: req.params.id } })
  if (!photo) {
    res.status(404).json({ error: 'Foto não encontrada.' })
    return
  }
  res.set('Cache-Control', 'private, max-age=31536000, immutable')
  res.json({ dataUrl: `data:${photo.contentType};base64,${Buffer.from(photo.data).toString('base64')}` })
})

adminCustomersRouter.post('/:id/photos', async (req, res) => {
  const parsed = customerPhotoSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Foto inválida (JPEG, PNG ou WebP, até cerca de 2 MB).' })
    return
  }
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!customer) {
    res.status(404).json({ error: 'Cliente não encontrado.' })
    return
  }
  const count = await prisma.customerPhoto.count({ where: { customerId: customer.id } })
  if (count >= 60) {
    res.status(400).json({ error: 'Máximo de 60 fotos por cliente. Apaga algumas antigas primeiro.' })
    return
  }
  const photo = await prisma.customerPhoto.create({
    data: {
      customerId: customer.id,
      contentType: parsed.data.contentType,
      data: Buffer.from(parsed.data.data, 'base64') as unknown as Uint8Array<ArrayBuffer>,
      caption: parsed.data.caption,
    },
    select: { id: true, caption: true, createdAt: true },
  })
  res.status(201).json(photo)
})

adminCustomersRouter.delete('/:id/photos/:photoId', async (req, res) => {
  await prisma.customerPhoto.deleteMany({ where: { id: req.params.photoId, customerId: req.params.id } })
  res.status(204).end()
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
