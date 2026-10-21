import type { NextFunction, Request, Response } from 'express'

/**
 * What a team member (STAFF) can be allowed to do in the admin app. Owners can do everything, managing the team
 * included.
 */
export const PERMISSIONS = [
  'marcacoes', // requests, agenda, opening times and closed days
  'clientes', // clients, their notes and photos
  'catalogo', // hairstyles, prices, promotions and the portfolio
  'testemunhos',
  'estatisticas',
  'notificacoes', // messages to the clients
  'definicoes', // the business's contacts, address, hours and policies
] as const

export type Permission = (typeof PERMISSIONS)[number]

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}

export function can(admin: { role: string; permissions: string[] }, permission: Permission) {
  return admin.role === 'OWNER' || admin.permissions.includes(permission)
}

/** After requireAdmin: lets the request through when the admin has any of these permissions. */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = req.admin
    if (!admin || !permissions.some((p) => can(admin, p))) {
      res.status(403).json({ error: 'Não tens permissão para isto. Fala com a dona da conta.' })
      return
    }
    next()
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.admin?.role !== 'OWNER') {
    res.status(403).json({ error: 'Só a dona da conta pode fazer isto.' })
    return
  }
  next()
}
