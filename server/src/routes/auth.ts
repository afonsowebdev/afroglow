import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  hashPassword,
  loginRateLimit,
  requireAdmin,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from '../lib/auth.js'
import { isHosted } from '../lib/env.js'
import { isPermission, PERMISSIONS } from '../lib/permissions.js'
import { currentResetCode, isValidResetCode } from '../lib/password-reset.js'
import { prisma } from '../lib/prisma.js'
import { sendPasswordResetCodeEmail } from '../lib/resend.js'
import {
  adminChangePasswordSchema,
  adminProfileSchema,
  adminResetPasswordSchema,
  avatarSchema,
  forgotPasswordSchema,
  loginSchema,
} from '../lib/validation.js'

export const authRouter = Router()

authRouter.post('/login', loginRateLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email ou password inválidos.' })
    return
  }

  const { email, password } = parsed.data

  try {
    const admin = await prisma.admin.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      res.status(401).json({ error: 'Credenciais incorretas.' })
      return
    }

    const token = signSession(admin.id)
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions())
    res.json({ email: admin.email, sessionToken: token })
  } catch (error) {
    console.error('[auth] login failed:', error)
    res.status(500).json({ error: 'Erro ao iniciar sessão.' })
  }
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions())
  res.status(204).end()
})

/** The signed-in admin as the app needs it: who they are, what they may do and their own choices. */
function presentAdmin(admin: {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'STAFF'
  permissions: string[]
  notifyNewBookings: boolean
  avatarType: string | null
  avatarUpdatedAt: Date | null
  createdAt: Date
}) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    // Owners can do everything; the list spells it out so the app needs no special case.
    permissions: admin.role === 'OWNER' ? [...PERMISSIONS] : admin.permissions.filter(isPermission),
    notifyNewBookings: admin.notifyNewBookings,
    // Changes with every new photo, so the app knows when to fetch it again.
    avatarVersion: admin.avatarType && admin.avatarUpdatedAt ? admin.avatarUpdatedAt.getTime() : null,
    createdAt: admin.createdAt,
  }
}

const adminSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  permissions: true,
  notifyNewBookings: true,
  avatarType: true,
  avatarUpdatedAt: true,
  createdAt: true,
} as const

authRouter.get('/me', requireAdmin, async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.adminId }, select: adminSelect })
  if (!admin) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  res.json(presentAdmin(admin))
})

authRouter.patch('/me', requireAdmin, async (req, res) => {
  const parsed = adminProfileSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  const admin = await prisma.admin.update({ where: { id: req.adminId }, data: parsed.data, select: adminSelect })
  res.json(presentAdmin(admin))
})

// The admin's photo: a small square JPEG the app prepares, as for customers.
authRouter.put('/me/avatar', requireAdmin, async (req, res) => {
  const parsed = avatarSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Imagem inválida.' })
    return
  }
  const admin = await prisma.admin.update({
    where: { id: req.adminId },
    data: {
      avatar: Buffer.from(parsed.data.data, 'base64') as unknown as Uint8Array<ArrayBuffer>,
      avatarType: parsed.data.contentType,
      avatarUpdatedAt: new Date(),
    },
    select: adminSelect,
  })
  res.json(presentAdmin(admin))
})

authRouter.delete('/me/avatar', requireAdmin, async (req, res) => {
  const admin = await prisma.admin.update({
    where: { id: req.adminId },
    data: { avatar: null, avatarType: null, avatarUpdatedAt: null },
    select: adminSelect,
  })
  res.json(presentAdmin(admin))
})

// Any team member's photo, as a data URL (the app can't send its login header with an <img> request).
authRouter.get('/avatar/:adminId', requireAdmin, async (req, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.params.adminId },
    select: { avatar: true, avatarType: true },
  })
  res.json({
    dataUrl: admin?.avatar && admin.avatarType ? `data:${admin.avatarType};base64,${Buffer.from(admin.avatar).toString('base64')}` : null,
  })
})

authRouter.post('/change-password', requireAdmin, loginRateLimit, async (req, res) => {
  const parsed = adminChangePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'A nova password deve ter pelo menos 8 caracteres.' })
    return
  }
  const admin = await prisma.admin.findUnique({ where: { id: req.adminId } })
  if (!admin || !(await verifyPassword(parsed.data.currentPassword, admin.passwordHash))) {
    res.status(401).json({ error: 'Password atual incorreta.' })
    return
  }
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } })
  res.json({ ok: true })
})

// Forgotten password, as for customers: a 6-digit code by email (derived from the current password, so it works once
// and for about 15 minutes), then a new password. Rate limited so the flow can't be used to spam or guess codes.
const forgotRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Tenta novamente mais tarde.' },
})
const resetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tenta novamente dentro de alguns minutos.' },
})

authRouter.post('/forgot-password', forgotRateLimit, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email inválido.' })
    return
  }
  // Same answer whether or not the email is an admin's, so this can't be used to find the admin accounts.
  const answer = { message: 'Se esse email for de uma conta de admin, enviámos um código.' }
  try {
    const admin = await prisma.admin.findFirst({ where: { email: { equals: parsed.data.email, mode: 'insensitive' } } })
    if (admin) {
      const code = currentResetCode(admin)
      try {
        await sendPasswordResetCodeEmail(admin.email, code)
      } catch (error) {
        console.error('[auth] could not send admin reset email:', error)
        if (!isHosted) console.log(`[auth] admin reset code (dev only) for ${admin.email}: ${code}`)
      }
    }
    res.json(answer)
  } catch (error) {
    console.error('[auth] admin forgot-password failed:', error)
    res.status(500).json({ error: 'Erro ao pedir o código.' })
  }
})

authRouter.post('/reset-password', resetRateLimit, async (req, res) => {
  const parsed = adminResetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  const { email, code, newPassword } = parsed.data
  const admin = await prisma.admin.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
  if (!admin || !isValidResetCode(admin, code)) {
    res.status(400).json({ error: 'Código inválido ou expirado.' })
    return
  }
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(newPassword) } })
  res.status(204).end()
})
