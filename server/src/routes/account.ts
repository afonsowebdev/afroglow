import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  customerSessionCookieOptions,
  loginRateLimit,
  CUSTOMER_SESSION_COOKIE,
  hashPassword,
  requireCustomer,
  signCustomerSession,
  verifyPassword,
} from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { isHosted } from '../lib/env.js'
import { currentResetCode, isValidResetCode } from '../lib/password-reset.js'
import { sendPasswordResetCodeEmail } from '../lib/resend.js'
import {
  changePasswordSchema,
  createTestimonialSchema,
  customerPushTokenSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  rescheduleBookingSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../lib/validation.js'

export const accountRouter = Router()

accountRouter.post('/login', loginRateLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email ou password inválidos.' })
    return
  }

  const { email, password } = parsed.data

  try {
    const customer = await prisma.customer.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
      res.status(401).json({ error: 'Credenciais incorretas.' })
      return
    }

    const token = signCustomerSession(customer.id)
    res.cookie(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions())
    res.json({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      sessionToken: token,
    })
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

// Keeps people from using the reset flow to spam an inbox or to guess codes.
const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tenta novamente mais tarde.' },
})
const resetPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tenta novamente dentro de alguns minutos.' },
})

accountRouter.patch('/me', requireCustomer, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Nome ou telemóvel inválidos.' })
    return
  }
  const customer = await prisma.customer.update({ where: { id: req.customerId }, data: parsed.data })
  res.json({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone })
})

accountRouter.post('/change-password', requireCustomer, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? 'Password inválida.',
    })
    return
  }
  const customer = await prisma.customer.findUnique({ where: { id: req.customerId } })
  if (!customer || !(await verifyPassword(parsed.data.currentPassword, customer.passwordHash))) {
    res.status(401).json({ error: 'A password atual está incorreta.' })
    return
  }
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  })
  res.status(204).end()
})

accountRouter.post('/forgot-password', forgotPasswordRateLimit, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email inválido.' })
    return
  }
  // Same answer whether or not the email exists, so this can't be used to find out who has an account.
  const answer = { message: 'Se existir uma conta com esse email, enviámos um código.' }
  try {
    const customer = await prisma.customer.findFirst({
      where: { email: { equals: parsed.data.email, mode: 'insensitive' } },
    })
    if (customer) {
      const code = currentResetCode(customer)
      try {
        await sendPasswordResetCodeEmail(customer.email, code)
      } catch (error) {
        console.error('[account] could not send reset email:', error)
        if (!isHosted) console.log(`[account] reset code (dev only) for ${customer.email}: ${code}`)
      }
    }
    res.json(answer)
  } catch (error) {
    console.error('[account] forgot-password failed:', error)
    res.status(500).json({ error: 'Erro ao pedir o código.' })
  }
})

accountRouter.post('/reset-password', resetPasswordRateLimit, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  const { email, code, newPassword } = parsed.data
  const customer = await prisma.customer.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
  if (!customer || !isValidResetCode(customer, code)) {
    res.status(400).json({ error: 'Código inválido ou expirado.' })
    return
  }
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await hashPassword(newPassword) },
  })
  res.status(204).end()
})

// Deleting an account removes the person's data but keeps the business's own booking
// history (counts/revenue): future bookings are cancelled and their slots reopened,
// every booking is stripped of name/phone/notes, testimonials are deleted, and the
// customer record itself is anonymised so the email can be reused.
accountRouter.post('/delete', requireCustomer, async (req, res) => {
  const parsed = deleteAccountSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Confirma com a tua password.' })
    return
  }
  const customer = await prisma.customer.findUnique({ where: { id: req.customerId } })
  if (!customer || !(await verifyPassword(parsed.data.password, customer.passwordHash))) {
    res.status(401).json({ error: 'Password incorreta.' })
    return
  }

  try {
    const lockedHash = await hashPassword(randomBytes(24).toString('hex'))
    await prisma.$transaction(async (tx) => {
      const live = await tx.booking.findMany({
        where: {
          customerId: customer.id,
          status: { in: ['PENDING', 'ACCEPTED'] },
          slot: { startsAt: { gte: new Date() } },
        },
        select: { id: true, slotId: true },
      })
      if (live.length > 0) {
        await tx.availabilitySlot.updateMany({
          where: { id: { in: live.map((b) => b.slotId) } },
          data: { status: 'OPEN' },
        })
        await tx.booking.updateMany({
          where: { id: { in: live.map((b) => b.id) } },
          data: { status: 'CANCELLED' },
        })
      }
      await tx.booking.updateMany({
        where: { customerId: customer.id },
        data: { customerName: 'Conta eliminada', customerPhone: '-', notes: null },
      })
      await tx.testimonial.deleteMany({ where: { customerId: customer.id } })
      await tx.customerPushToken.deleteMany({ where: { customerId: customer.id } })
      await tx.pendingRegistration.deleteMany({ where: { email: customer.email } })
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          name: 'Conta eliminada',
          email: `eliminada-${customer.id}@removed.invalid`,
          phone: '-',
          passwordHash: lockedHash,
        },
      })
    })
    res.clearCookie(CUSTOMER_SESSION_COOKIE, customerSessionCookieOptions())
    res.status(204).end()
  } catch (error) {
    console.error('[account] delete failed:', error)
    res.status(500).json({ error: 'Erro ao eliminar a conta.' })
  }
})

// The customer app registers its iPhone here so the business can notify about booking decisions.
accountRouter.post('/push-token', requireCustomer, async (req, res) => {
  const parsed = customerPushTokenSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Token inválido.' })
    return
  }
  await prisma.customerPushToken.upsert({
    where: { token: parsed.data.token },
    update: { customerId: req.customerId! },
    create: { token: parsed.data.token, customerId: req.customerId! },
  })
  res.status(204).end()
})

// Turning notifications off in the app (or logging out) forgets this device.
accountRouter.delete('/push-token', requireCustomer, async (req, res) => {
  const parsed = customerPushTokenSchema.safeParse(req.body)
  if (parsed.success) {
    await prisma.customerPushToken.deleteMany({ where: { token: parsed.data.token, customerId: req.customerId! } })
  }
  res.status(204).end()
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
