import { combinations, priceKey } from '@/lib/pricing'
import type { Pricing } from '@/lib/types'

/** The price table as edited: option lists as typed, prices as typed (euros, comma or dot). */
export interface PricingDraft {
  on: boolean
  lengths: string
  partings: string
  prices: Record<string, string>
}

export const splitList = (text: string) =>
  text
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

export function draftFromPricing(pricing: Pricing | null | undefined): PricingDraft {
  if (!pricing) return { on: false, lengths: 'Curta, Média, Longa', partings: 'Grossas, Médias, Finas', prices: {} }
  return {
    on: true,
    lengths: pricing.lengths.join(', '),
    partings: pricing.partings.join(', '),
    prices: Object.fromEntries(Object.entries(pricing.prices).map(([k, cents]) => [k, (cents / 100).toFixed(2)])),
  }
}

/** The table to save, or an error to show; null pricing when the table is off. */
export function pricingFromDraft(draft: PricingDraft): { pricing: Pricing | null } | { error: string } {
  if (!draft.on) return { pricing: null }
  const lengths = splitList(draft.lengths)
  const partings = splitList(draft.partings)
  if (!lengths.length && !partings.length) return { error: 'Indica pelo menos um comprimento ou uma repartição.' }
  const prices: Record<string, number> = {}
  for (const [l, r] of combinations({ lengths, partings })) {
    const value = Number((draft.prices[priceKey(l, r)] ?? '').replace(',', '.'))
    if (!(draft.prices[priceKey(l, r)] ?? '').trim() || Number.isNaN(value) || value < 0) {
      return { error: `Falta o preço de ${[l, r].filter(Boolean).join(' · ')}.` }
    }
    prices[priceKey(l, r)] = Math.round(value * 100)
  }
  return { pricing: { lengths, partings, prices } }
}
