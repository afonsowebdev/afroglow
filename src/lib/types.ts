export interface Service {
  id: string
  name: string
  description: string
  durationLabel: string
  priceCents: number
  createdAt: string
  /** Photos of the hairstyle, cover first. */
  images?: Array<{ id: string }>
}

export type SlotStatus = 'OPEN' | 'PENDING' | 'BOOKED'

export interface AvailabilitySlot {
  id: string
  startsAt: string
  status: SlotStatus
  createdAt: string
}

export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

export interface Booking {
  id: string
  slotId: string
  serviceId: string
  customerId: string
  customerName: string
  customerPhone: string
  notes: string | null
  status: BookingStatus
  createdAt: string
  updatedAt: string
  slot: AvailabilitySlot
  service: Service
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
}

export type TestimonialStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Testimonial {
  id: string
  content: string
  status: TestimonialStatus
  createdAt: string
  customer: { name: string }
}

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}
