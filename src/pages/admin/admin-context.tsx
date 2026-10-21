import { createContext, useContext } from 'react'
import type { AvailabilitySlot, Booking, Service, Testimonial } from '@/lib/types'

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

/** The screens the app can show; each tab keeps its own stack of them, as on the iPhone. */
export type RouteName =
  | 'home'
  | 'requests'
  | 'agenda'
  | 'customers'
  | 'more'
  | 'customer'
  | 'services'
  | 'promotions'
  | 'portfolio'
  | 'testimonials'
  | 'stats'
  | 'settings'
  | 'profile'
  | 'security'
  | 'team'
  | 'closures'
  | 'broadcast'

export interface Route {
  name: RouteName
  /** e.g. the client's id for 'customer'. */
  id?: string
}

export type TabId = 'home' | 'agenda' | 'requests' | 'customers' | 'more'

export interface AdminContextValue {
  me: AdminMe
  setMe: (me: AdminMe) => void
  /** The signed-in admin's own photo (a data URL), once loaded. */
  avatar: string | null
  setAvatar: (dataUrl: string | null) => void
  can: (permission: Permission) => boolean
  isOwner: boolean
  bookings: Booking[]
  slots: AvailabilitySlot[]
  services: Service[]
  testimonials: Testimonial[]
  /** Fetches everything again (silently keeps the screen as it is while it loads). */
  reload: () => Promise<void>
  push: (route: Route) => void
  pop: () => void
  goTab: (tab: TabId, route?: Route) => void
  /** Opens the sheet to add a booking by hand, for a client or for anyone. */
  newBooking: (customer?: { id: string; name: string; phone: string } | null, startsAt?: string) => void
  logout: () => void
}

export const AdminContext = createContext<AdminContextValue | null>(null)

export function useAdmin() {
  const value = useContext(AdminContext)
  if (!value) throw new Error('useAdmin outside the admin app')
  return value
}
