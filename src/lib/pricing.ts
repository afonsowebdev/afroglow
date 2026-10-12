import { formatPrice, type Booking, type Pricing, type Service } from '@/lib/types'
import { colorLabel } from '@/lib/braid-colors'

/*
 * Prices by length and/or parting (see the server's lib/pricing.ts). A hairstyle with a price table has its
 * options picked when booking; its own priceCents is the lowest ("a partir de").
 */

export const priceKey = (length: string, parting: string) => `${length}|${parting}`

/** The lengths and partings to choose from, and whether the service has a table at all. */
export function optionsOf(service: Pick<Service, 'pricing'>) {
  const p = service.pricing
  return { lengths: p?.lengths ?? [], partings: p?.partings ?? [], hasOptions: Boolean(p) }
}

/** Whether the chosen options are enough to get a price (every list that exists has a choice). */
export function choiceComplete(service: Pick<Service, 'pricing'>, length: string | null, parting: string | null) {
  const { lengths, partings } = optionsOf(service)
  return (lengths.length === 0 || Boolean(length)) && (partings.length === 0 || Boolean(parting))
}

/** The price for a choice; the service's single price when it has no table; null while incomplete. */
export function priceFor(service: Pick<Service, 'pricing' | 'priceCents'>, length: string | null, parting: string | null) {
  const p = service.pricing
  if (!p) return service.priceCents
  if (!choiceComplete(service, length, parting)) return null
  const price = p.prices[priceKey(p.lengths.length ? length ?? '' : '', p.partings.length ? parting ?? '' : '')]
  return typeof price === 'number' ? price : null
}

/** "Longa · Finas", or null when nothing applies. */
export function choiceLabel(length: string | null, parting: string | null) {
  return [length, parting].filter(Boolean).join(' · ') || null
}

/** "40,00 €", or "a partir de 25,00 €" for a hairstyle priced by options. */
export function servicePriceLabel(service: Pick<Service, 'pricing' | 'priceCents'>) {
  return service.pricing ? `a partir de ${formatPrice(service.priceCents)}` : formatPrice(service.priceCents)
}

/** What a booking cost: its own price when it was booked with options, the service's otherwise. */
export const bookingPrice = (b: Pick<Booking, 'priceCents' | 'service'>) => b.priceCents ?? b.service.priceCents

/** "Box Braids · Finas · Cor 27 (Loiro)", or just the name. */
export const bookingName = (b: Pick<Booking, 'optionLabel' | 'colorCode' | 'service'>) =>
  [b.service.name, b.optionLabel, colorLabel(b.colorCode)].filter(Boolean).join(' · ')

/** "Finas · Cor 27 (Loiro)": what was chosen for a booking, or null. */
export const bookingExtras = (b: Pick<Booking, 'optionLabel' | 'colorCode'>) =>
  [b.optionLabel, colorLabel(b.colorCode)].filter(Boolean).join(' · ') || null

/** Every length × parting pair of a table (an empty string where a list is empty). */
export function combinations(p: Pick<Pricing, 'lengths' | 'partings'>) {
  const lengths = p.lengths.length ? p.lengths : ['']
  const partings = p.partings.length ? p.partings : ['']
  return lengths.flatMap((length) => partings.map((parting) => [length, parting] as const))
}
