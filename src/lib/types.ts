export interface Service {
  id: string
  name: string
  description: string
  durationLabel: string
  priceCents: number
  createdAt: string
}

export type SlotStatus = 'OPEN' | 'PENDING' | 'BOOKED'

export interface AvailabilitySlot {
  id: string
  startsAt: string
  status: SlotStatus
  createdAt: string
}

export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface Booking {
  id: string
  slotId: string
  serviceId: string
  customerName: string
  customerPhone: string
  notes: string | null
  status: BookingStatus
  createdAt: string
  updatedAt: string
  slot: AvailabilitySlot
  service: Service
}

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}
