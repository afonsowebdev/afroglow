import bcrypt from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'

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
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
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

// TEMPORARY: set SKIP_ADMIN_AUTH=true in server/.env to bypass login entirely while
// developing. This removes ALL protection from /api/admin/* — never leave this on
// outside your own machine. Set it back to false (or delete the line) when done.
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (process.env.SKIP_ADMIN_AUTH === 'true') {
    try {
      const admin = await prisma.admin.findFirst()
      if (admin) {
        req.adminId = admin.id
        next()
        return
      }
    } catch (error) {
      console.error('[auth] SKIP_ADMIN_AUTH lookup failed:', error)
    }
  }

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
