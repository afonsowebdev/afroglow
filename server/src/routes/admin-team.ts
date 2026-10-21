import { Router } from 'express'
import { hashPassword, requireAdmin } from '../lib/auth.js'
import { isPermission, requireOwner } from '../lib/permissions.js'
import { prisma } from '../lib/prisma.js'
import { createTeamMemberSchema, teamPasswordSchema, updateTeamMemberSchema } from '../lib/validation.js'

// The people who can open the admin app. Only owners manage it; there is always at least one owner.
export const adminTeamRouter = Router()
adminTeamRouter.use(requireAdmin, requireOwner)

const memberSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  permissions: true,
  avatarType: true,
  avatarUpdatedAt: true,
  createdAt: true,
} as const

type Member = {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'STAFF'
  permissions: string[]
  avatarType: string | null
  avatarUpdatedAt: Date | null
  createdAt: Date
}

function present(member: Member) {
  return {
    id: member.id,
    email: member.email,
    name: member.name,
    role: member.role,
    permissions: member.permissions.filter(isPermission),
    avatarVersion: member.avatarType && member.avatarUpdatedAt ? member.avatarUpdatedAt.getTime() : null,
    createdAt: member.createdAt,
  }
}

adminTeamRouter.get('/', async (_req, res) => {
  const members = await prisma.admin.findMany({ select: memberSelect, orderBy: { createdAt: 'asc' } })
  res.json(members.map(present))
})

adminTeamRouter.post('/', async (req, res) => {
  const parsed = createTeamMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' })
    return
  }
  const { name, email, password, role, permissions } = parsed.data
  const taken = await prisma.admin.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
  if (taken) {
    res.status(409).json({ error: 'Já existe alguém na equipa com esse email.' })
    return
  }
  const member = await prisma.admin.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role,
      permissions: role === 'OWNER' ? [] : permissions.filter(isPermission),
    },
    select: memberSelect,
  })
  res.status(201).json(present(member))
})

/** Whether taking `id` out of the owners would leave the account without one. */
async function isLastOwner(id: string) {
  const owners = await prisma.admin.findMany({ where: { role: 'OWNER' }, select: { id: true } })
  return owners.length === 1 && owners[0].id === id
}

adminTeamRouter.patch('/:id', async (req, res) => {
  const parsed = updateTeamMemberSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos.' })
    return
  }
  const member = await prisma.admin.findUnique({ where: { id: req.params.id }, select: { id: true, role: true } })
  if (!member) {
    res.status(404).json({ error: 'Pessoa não encontrada.' })
    return
  }
  if (parsed.data.role === 'STAFF' && member.role === 'OWNER' && (await isLastOwner(member.id))) {
    res.status(400).json({ error: 'Tem de haver sempre pelo menos uma dona da conta.' })
    return
  }
  const { permissions, ...rest } = parsed.data
  const updated = await prisma.admin.update({
    where: { id: member.id },
    data: { ...rest, ...(permissions ? { permissions: permissions.filter(isPermission) } : {}) },
    select: memberSelect,
  })
  res.json(present(updated))
})

// Sets a new password for a team member who forgot theirs (they can change it afterwards in Segurança).
adminTeamRouter.post('/:id/password', async (req, res) => {
  const parsed = teamPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Password inválida.' })
    return
  }
  try {
    await prisma.admin.update({ where: { id: req.params.id }, data: { passwordHash: await hashPassword(parsed.data.password) } })
    res.status(204).end()
  } catch {
    res.status(404).json({ error: 'Pessoa não encontrada.' })
  }
})

adminTeamRouter.delete('/:id', async (req, res) => {
  if (req.params.id === req.adminId) {
    res.status(400).json({ error: 'Não te podes remover a ti própria.' })
    return
  }
  const member = await prisma.admin.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!member) {
    res.status(404).json({ error: 'Pessoa não encontrada.' })
    return
  }
  if (await isLastOwner(member.id)) {
    res.status(400).json({ error: 'Tem de haver sempre pelo menos uma dona da conta.' })
    return
  }
  // Their iPhones' push tokens go with them (cascade); messages they sent stay, without their name.
  await prisma.admin.delete({ where: { id: member.id } })
  res.status(204).end()
})
