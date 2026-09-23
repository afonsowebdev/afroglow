import bcrypt from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const rawSecret = process.env.JWT_SECRET
if (!rawSecret) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_SECRET: string = rawSecret

export const SESSION_COOKIE = 'admin_session'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signSession(adminId: string) {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '7d' })
}

export function sessionCookieOptions() {
  // In production the frontend (Vercel) and backend live on different
  // domains, so the session cookie must be sent cross-site — that requires
  // SameSite=None, which browsers only honor when the cookie is Secure too.
  // Locally both run on http://localhost, which is same-site, so Lax (and
  // no Secure, since there's no HTTPS in dev) works there instead.
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true as const,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_MS,
  }
}

declare global {
  namespace Express {
    interface Request {
      adminId?: string
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { adminId: string }
    req.adminId = payload.adminId
    next()
  } catch {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' })
  }
}
