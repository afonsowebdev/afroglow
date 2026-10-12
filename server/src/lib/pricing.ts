import { z } from 'zod'
import { colorLabel } from './braid-colors.js'

/*
 * Prices by length and/or parting for a hairstyle. Either list may be empty (e.g. cornrows priced by parting
 * only). `prices` holds one entry per combination, keyed "length|parting" (an empty part when that list is
 * empty). The service's own priceCents is kept as the lowest of these, shown as "a partir de".
 */

const optionList = z.array(z.string().trim().min(1).max(30)).max(6)

export const pricingSchema = z
  .object({
    lengths: optionList,
    partings: optionList,
    prices: z.record(z.string().max(70), z.number().int().min(0).max(100000)),
  })
  .refine((p) => p.lengths.length > 0 || p.partings.length > 0, 'Indica pelo menos um comprimento ou uma repartição.')
  .refine(
    (p) => combinations(p).every(([length, parting]) => typeof p.prices[priceKey(length, parting)] === 'number'),
    'Falta o preço de alguma combinação.',
  )

export type Pricing = z.infer<typeof pricingSchema>

export const priceKey = (length: string, parting: string) => `${length}|${parting}`

/** Every length × parting pair the pricing allows (an empty string where a list is empty). */
export function combinations(p: { lengths: string[]; partings: string[] }) {
  const lengths = p.lengths.length ? p.lengths : ['']
  const partings = p.partings.length ? p.partings : ['']
  return lengths.flatMap((length) => partings.map((parting) => [length, parting] as const))
}

/** The lowest price of a pricing table: the "a partir de" price stored on the service. */
export function lowestPrice(p: Pricing) {
  return Math.min(...combinations(p).map(([l, r]) => p.prices[priceKey(l, r)]))
}

/** Reads a service's stored pricing; null when it has none or it no longer parses. */
export function readPricing(value: unknown): Pricing | null {
  const parsed = pricingSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/**
 * The price and label for the options a customer chose. Null when the choice doesn't match the service's
 * pricing (a missing or unknown option). A service without pricing has a single price and no label.
 */
export function resolveChoice(
  service: { priceCents: number; pricing: unknown },
  length?: string,
  parting?: string,
): { priceCents: number; optionLabel: string | null } | null {
  const pricing = readPricing(service.pricing)
  if (!pricing) return { priceCents: service.priceCents, optionLabel: null }
  const l = pricing.lengths.length ? length ?? '' : ''
  const r = pricing.partings.length ? parting ?? '' : ''
  if (pricing.lengths.length && !pricing.lengths.includes(l)) return null
  if (pricing.partings.length && !pricing.partings.includes(r)) return null
  const price = pricing.prices[priceKey(l, r)]
  if (typeof price !== 'number') return null
  return { priceCents: price, optionLabel: [l, r].filter(Boolean).join(' · ') }
}

/** What a booking cost and how it is named: its own choice when it has one, the service's otherwise. */
export function bookingPrice(b: { priceCents: number | null; service: { priceCents: number } }) {
  return b.priceCents ?? b.service.priceCents
}

/** "Box Braids (Finas · Cor 27 (Loiro))": the hairstyle with what was chosen for it. */
export function bookingServiceName(b: { optionLabel: string | null; colorCode?: string | null; service: { name: string } }) {
  const extras = [b.optionLabel, colorLabel(b.colorCode)].filter(Boolean).join(' · ')
  return extras ? `${b.service.name} (${extras})` : b.service.name
}
