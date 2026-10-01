import bcrypt from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import { isHosted } from './env.js'

const rawSecret = process.env.JWT_SECRET
if (!rawSecret) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_SECRET: string = rawSecret

export const SESSION_COOKIE = 'admin_session'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const CUSTOMER_SESSION_COOKIE = 'customer_session'
const CUSTOMER_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function signSession(adminId: string) {
  return jwt.sign({ adminId }, JWT_SECRET, { expiresIn: '7d' })
}

export function signCustomerSession(customerId: string) {
  return jwt.sign({ customerId }, JWT_SECRET, { expiresIn: '30d' })
}

export function sessionCookieOptions(maxAgeMs: number = SESSION_MAX_AGE_MS) {
  // In production the frontend (Vercel) and backend live on different
  // domains, so the session cookie must be sent cross-site — that requires
  // SameSite=None, which browsers only honor when the cookie is Secure too.
  // Locally both run on http://localhost, which is same-site, so Lax (and
  // no Secure, since there's no HTTPS in dev) works there instead.
  const isProduction = isHosted
  return {
    httpOnly: true as const,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    secure: isProduction,
    maxAge: maxAgeMs,
  }
}

export function customerSessionCookieOptions() {
  return sessionCookieOptions(CUSTOMER_SESSION_MAX_AGE_MS)
}

declare global {
  namespace Express {
    interface Request {
      adminId?: string
      customerId?: string
    }
  }
}

// The cookie is the primary carrier, but the frontend and API live on
// different sites, and browsers that block third-party cookies (Safari/ITP,
// in-app browsers, Chrome with tracking protection) silently drop it — which
// logs people out on reload and makes requests fail with "Não autenticado".
// The same JWT is therefore also accepted as a Bearer token. Both candidates
// are tried so a stale cookie can't shadow a valid Bearer token.
function tokenCandidates(req: Request, cookieName: string) {
  const candidates: string[] = []
  const cookieToken = req.cookies?.[cookieName]
  if (cookieToken) candidates.push(cookieToken as string)
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) candidates.push(header.slice('Bearer '.length))
  return candidates
}

function verifyFirstValid<T>(tokens: string[]): T | null {
  for (const token of tokens) {
    try {
      return jwt.verify(token, JWT_SECRET) as T
    } catch {
      // try the next candidate
    }
  }
  return null
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const tokens = tokenCandidates(req, SESSION_COOKIE)
  if (tokens.length === 0) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  const payload = verifyFirstValid<{ adminId?: string }>(tokens)
  if (!payload?.adminId) {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' })
    return
  }
  req.adminId = payload.adminId
  next()
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const tokens = tokenCandidates(req, CUSTOMER_SESSION_COOKIE)
  if (tokens.length === 0) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }
  const payload = verifyFirstValid<{ customerId?: string }>(tokens)
  if (!payload?.customerId) {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' })
    return
  }
  req.customerId = payload.customerId
  next()
}

// Throttles credential guessing on the login endpoints (per client IP).
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas tentativas. Tenta novamente dentro de alguns minutos.' },
})
