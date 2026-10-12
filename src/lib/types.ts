export interface Service {
  id: string
  name: string
  description: string
  durationLabel: string
  priceCents: number
  /** Prices by length and/or parting; when set, priceCents is the lowest ("a partir de"). See lib/pricing. */
  pricing?: Pricing | null
  /** False when hidden from booking (kept for the bookings already made with it). */
  active?: boolean
  createdAt: string
  /** Photos of the hairstyle, cover first. */
  images?: Array<{ id: string }>
}

export interface Pricing {
  lengths: string[]
  partings: string[]
  /** Cents per combination, keyed "length|parting" (an empty part where that list is empty). */
  prices: Record<string, number>
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
  /** The options chosen ("Longa · Finas") and the price they came to; null for bookings without options. */
  optionLabel?: string | null
  priceCents?: number | null
  /** The braiding-hair colour chosen, by code (lib/braid-colors). */
  colorCode?: string | null
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
  hasAvatar?: boolean
}

export type TestimonialStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface Testimonial {
  id: string
  content: string
  status: TestimonialStatus
  createdAt: string
  customer: { name: string }
  /** Public list: a version number when the author chose to show a photo. Admin list: whether they did. */
  photo?: number | boolean | null
}

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}
