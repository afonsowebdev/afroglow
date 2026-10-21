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
  /** Private photos of her hair, newest first (each fetched on its own as a data URL). */
  photos?: Array<{ id: string; caption: string; createdAt: string }>
  /** Her visits in numbers (servers before the client file came without it). */
  summary?: {
    visits: number
    spentCents: number
    averageCents: number
    firstVisitAt: string | null
    lastVisitAt: string | null
    everyDays: number | null
    favouriteService: string | null
    cancelled: number
    nextBookingId: string | null
  }
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
