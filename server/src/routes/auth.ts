import { Router } from 'express'
import { requireAdmin, SESSION_COOKIE, sessionCookieOptions, signSession, verifyPassword } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { loginSchema } from '../lib/validation.js'

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email ou password inválidos.' })
    return
  }

  const { email, password } = parsed.data

  try {
    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      res.status(401).json({ error: 'Credenciais incorretas.' })
      return
    }

    const token = signSession(admin.id)
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions())
    res.json({ email: admin.email })
  } catch (error) {
    console.error('[auth] login failed:', error)
    res.status(500).json({ error: 'Erro ao iniciar sessão.' })
  }
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions())
  res.status(204).end()
})

authRouter.get('/me', requireAdmin, async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.adminId } })
  if (!admin) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  res.json({ email: admin.email })
})
