/** What a team member can be allowed to do (the server checks the same list). Owners can do everything. */
export type Permission = 'marcacoes' | 'clientes' | 'catalogo' | 'testemunhos' | 'estatisticas' | 'notificacoes' | 'definicoes'

export const PERMISSION_INFO: Record<Permission, { label: string; hint: string }> = {
  marcacoes: { label: 'Marcações', hint: 'Pedidos, agenda, horários e dias fechados' },
  clientes: { label: 'Clientes', hint: 'Fichas, notas e fotos das clientes' },
  catalogo: { label: 'Serviços e portfólio', hint: 'Modelos, preços, promoções e fotos do trabalho' },
  testemunhos: { label: 'Testemunhos', hint: 'Aprovar o que as clientes escrevem' },
  estatisticas: { label: 'Estatísticas', hint: 'Receita, sessões e clientes' },
  notificacoes: { label: 'Notificar clientes', hint: 'Enviar mensagens a todas ou a algumas' },
  definicoes: { label: 'Definições do negócio', hint: 'Contactos, morada, horário e cancelamento' },
}

export const PERMISSIONS = Object.keys(PERMISSION_INFO) as Permission[]

/** The signed-in admin, as /auth/me returns it. */
export interface AdminMe {
  id: string
  email: string
  name: string
  role: 'OWNER' | 'STAFF'
  permissions: Permission[]
  notifyNewBookings: boolean
  avatarVersion: number | null
  createdAt: string
}

/** A server from before the team came back with the email only: then it is the owner, with everything. */
export function fullMe(who: Partial<AdminMe> & { email: string }): AdminMe {
  return {
    id: '',
    name: '',
    role: 'OWNER',
    notifyNewBookings: true,
    avatarVersion: null,
    createdAt: new Date().toISOString(),
    ...who,
    permissions: who.permissions ?? [...PERMISSIONS],
  }
}
