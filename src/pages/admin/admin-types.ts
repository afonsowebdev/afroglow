import type { Booking } from '@/lib/types'

export interface AdminCustomer {
  id: string
  name: string
  phone: string
  /** Null for clients added by hand (no account). */
  email: string | null
  hasAccount: boolean
  adminNotes: string
  reminderChannel: 'EMAIL' | 'PHONE'
  createdAt: string
  bookingCount: number
  spentCents: number
  lastBookingAt: string | null
}

export type AdminCustomerDetail = Omit<AdminCustomer, 'bookingCount' | 'spentCents' | 'lastBookingAt'> & {
  bookings: Booking[]
}

export interface AdminStats {
  currentMonth: string
  months: Array<{ key: string; bookings: number; revenueCents: number }>
  topServices: Array<{ name: string; count: number; revenueCents: number }>
  totals: { accepted: number; cancelled: number; rejected: number; pending: number; cancellationRate: number }
  clients: { total: number; newThisMonth: number; returning: number }
}

export const STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Confirmada',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}
