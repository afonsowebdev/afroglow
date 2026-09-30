import { randomInt } from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  customerSessionCookieOptions,
  CUSTOMER_SESSION_COOKIE,
  hashPassword,
  signCustomerSession,
} from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { sendVerificationCodeEmail, sendWelcomeEmail } from '../lib/resend.js'
import { registerStartSchema, resendCodeSchema, verifyEmailSchema } from '../lib/validation.js'

export const registerRouter = Router()

const CODE_EXPIRY_MS = 15 * 60 * 1000
const MAX_VERIFY_ATTEMPTS = 3

const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tenta novamente mais tarde.' },
})

function generateCode() {
  return randomInt(100000, 1000000).toString()
}

registerRouter.post('/register', registerRateLimit, async (req, res) => {
  const parsed = registerStartSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados de registo inválidos.' })
    return
  }

  const { name, email, phone, password } = parsed.data

  try {
    await prisma.pendingRegistration.deleteMany({ where: { expiresAt: { lt: new Date() } } })

    const existingCustomer = await prisma.customer.findUnique({ where: { email } })
    if (existingCustomer) {
      res.status(409).json({ error: 'Já existe uma conta com este email.' })
      return
    }

    const passwordHash = await hashPassword(password)
    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS)

    await prisma.pendingRegistration.upsert({
      where: { email },
      update: { name, phone, passwordHash, code, attempts: 0, expiresAt },
      create: { email, name, phone, passwordHash, code, expiresAt },
    })

    await sendVerificationCodeEmail(email, code)

    res.status(201).json({ message: 'Código enviado. Verifica o teu email.' })
  } catch (error) {
    console.error('[register] start failed:', error)
    res.status(500).json({ error: 'Erro ao iniciar registo. Tenta novamente.' })
  }
})

registerRouter.post('/verify-email', async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Código inválido.' })
    return
  }

  const { email, code } = parsed.data

  try {
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } })
    if (!pending) {
      res.status(400).json({ error: 'Registo não encontrado. Regista-te novamente.' })
      return
    }

    if (pending.expiresAt < new Date()) {
      await prisma.pendingRegistration.delete({ where: { email } })
      res.status(400).json({ error: 'Código expirado. Pede um novo código.' })
      return
    }

    if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
      res.status(400).json({ error: 'Demasiadas tentativas. Pede um novo código.' })
      return
    }

    if (pending.code !== code) {
      await prisma.pendingRegistration.update({ where: { email }, data: { attempts: { increment: 1 } } })
      const attemptsLeft = MAX_VERIFY_ATTEMPTS - (pending.attempts + 1)
      res.status(400).json({
        error: attemptsLeft > 0 ? 'Código inválido.' : 'Código inválido. Pede um novo código.',
      })
      return
    }

    const customer = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: { name: pending.name, email: pending.email, phone: pending.phone, passwordHash: pending.passwordHash },
      })
      await tx.pendingRegistration.delete({ where: { email } })
      return customer
    })

    const token = signCustomerSession(customer.id)
    res.cookie(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions())
    await sendWelcomeEmail(customer.email, customer.name)
    res.status(201).json({ id: customer.id, name: customer.name, email: customer.email, phone: customer.phone })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Já existe uma conta com este email.' })
      return
    }
    console.error('[register] verify failed:', error)
    res.status(500).json({ error: 'Erro ao verificar código.' })
  }
})

registerRouter.post('/resend-code', registerRateLimit, async (req, res) => {
  const parsed = resendCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email inválido.' })
    return
  }

  const { email } = parsed.data

  try {
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } })
    if (!pending) {
      res.status(400).json({ error: 'Nenhum registo pendente para este email.' })
      return
    }

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS)
    await prisma.pendingRegistration.update({ where: { email }, data: { code, attempts: 0, expiresAt } })

    await sendVerificationCodeEmail(email, code)

    res.json({ message: 'Novo código enviado.' })
  } catch (error) {
    console.error('[register] resend failed:', error)
    res.status(500).json({ error: 'Erro ao reenviar código.' })
  }
})
