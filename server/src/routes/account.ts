import { Router } from 'express'
import {
  customerSessionCookieOptions,
  CUSTOMER_SESSION_COOKIE,
  hashPassword,
  requireCustomer,
  signCustomerSession,
  verifyPassword,
} from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { createTestimonialSchema, customerRegisterSchema, loginSchema, rescheduleBookingSchema } from '../lib/validation.js'

export const accountRouter = Router()

accountRouter.post('/register', async (req, res) => {
  const parsed = customerRegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados de registo inválidos.' })
    return
  }

  const { name, email, phone, password } = parsed.data

  try {
    const existing = await prisma.customer.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'Já existe uma conta com este email.' })
      return
    }

    const passwordHash = await hashPassword(password)
    const customer = await prisma.customer.create({ data: { name, email, phone, passwordHash } })

    const token = signCustomerSession(customer.id)
    res.cookie(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions())
    res.status(201).json({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone })
  } catch (error) {
    console.error('[account] register failed:', error)
    res.status(500).json({ error: 'Erro ao criar conta.' })
  }
})

accountRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email ou password inválidos.' })
    return
  }

  const { email, password } = parsed.data

  try {
    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
      res.status(401).json({ error: 'Credenciais incorretas.' })
      return
    }

    const token = signCustomerSession(customer.id)
    res.cookie(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions())
    res.json({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone })
  } catch (error) {
    console.error('[account] login failed:', error)
    res.status(500).json({ error: 'Erro ao iniciar sessão.' })
  }
})

accountRouter.post('/logout', (_req, res) => {
  res.clearCookie(CUSTOMER_SESSION_COOKIE, customerSessionCookieOptions())
  res.status(204).end()
})

accountRouter.get('/me', requireCustomer, async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.customerId } })
  if (!customer) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  res.json({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone })
})

accountRouter.get('/bookings', requireCustomer, async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { customerId: req.customerId },
    include: { slot: true, service: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(bookings)
})

accountRouter.post('/bookings/:id/cancel', requireCustomer, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!booking || booking.customerId !== req.customerId) {
      res.status(404).json({ error: 'Marcação não encontrada.' })
      return
    }
    if (booking.status !== 'PENDING' && booking.status !== 'ACCEPTED') {
      res.status(400).json({ error: 'Esta marcação já não pode ser cancelada.' })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: 'OPEN' } })
      return tx.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } })
    })

    res.json(updated)
  } catch (error) {
    console.error('[account] cancel booking failed:', error)
    res.status(500).json({ error: 'Erro ao cancelar marcação.' })
  }
})

class SlotUnavailableError extends Error {}

accountRouter.post('/bookings/:id/reschedule', requireCustomer, async (req, res) => {
  const parsed = rescheduleBookingSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Horário inválido.' })
    return
  }

  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } })
    if (!booking || booking.customerId !== req.customerId) {
      res.status(404).json({ error: 'Marcação não encontrada.' })
      return
    }
    if (booking.status !== 'PENDING' && booking.status !== 'ACCEPTED') {
      res.status(400).json({ error: 'Esta marcação já não pode ser reagendada.' })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      const newSlot = await tx.availabilitySlot.findUnique({ where: { id: parsed.data.slotId } })
      if (!newSlot || newSlot.status !== 'OPEN') {
        throw new SlotUnavailableError()
      }

      await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: 'OPEN' } })
      await tx.availabilitySlot.update({ where: { id: newSlot.id }, data: { status: 'PENDING' } })
      // Reagendar volta a marcação a pendente — precisa de nova aprovação do
      // admin, tal como qualquer marcação nova.
      return tx.booking.update({ where: { id: booking.id }, data: { slotId: newSlot.id, status: 'PENDING' } })
    })

    res.json(updated)
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      res.status(409).json({ error: 'Este horário já não está disponível. Escolhe outro.' })
      return
    }
    console.error('[account] reschedule booking failed:', error)
    res.status(500).json({ error: 'Erro ao reagendar marcação.' })
  }
})

accountRouter.post('/testimonials', requireCustomer, async (req, res) => {
  const parsed = createTestimonialSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Testemunho inválido.' })
    return
  }

  try {
    const testimonial = await prisma.testimonial.create({
      data: { customerId: req.customerId!, content: parsed.data.content },
    })
    res.status(201).json(testimonial)
  } catch (error) {
    console.error('[account] create testimonial failed:', error)
    res.status(500).json({ error: 'Erro ao enviar testemunho.' })
  }
})
