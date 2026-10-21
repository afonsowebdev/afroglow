import { prisma } from './prisma.js'
import { readPricing } from './pricing.js'

type Promo = { id: string; title: string; percentOff: number; serviceId: string | null; endsAt: Date }

/** The promotions running right now. */
export function runningPromotions(now = new Date()) {
  return prisma.promotion.findMany({
    where: { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
    select: { id: true, title: true, percentOff: true, serviceId: true, endsAt: true },
  })
}

/** The best running discount for a hairstyle: its own or one for every hairstyle, whichever is bigger. */
export function promotionFor(serviceId: string, promos: Promo[]) {
  return promos
    .filter((p) => p.serviceId === null || p.serviceId === serviceId)
    .sort((a, b) => b.percentOff - a.percentOff)[0] ?? null
}

/** A price with the discount taken off, to the cent. */
export function discounted(cents: number, percentOff: number) {
  return Math.round((cents * (100 - percentOff)) / 100)
}

/**
 * A hairstyle as customers see it while a promotion runs: its price and every price in its table discounted, and
 * the promotion itself (with the price before) for apps that show it.
 */
export function withPromotion<T extends { id: string; priceCents: number; pricing: unknown }>(service: T, promos: Promo[]) {
  const promo = promotionFor(service.id, promos)
  if (!promo) return { ...service, promotion: null }
  const pricing = readPricing(service.pricing)
  return {
    ...service,
    priceCents: discounted(service.priceCents, promo.percentOff),
    pricing: pricing
      ? {
          ...pricing,
          prices: Object.fromEntries(
            Object.entries(pricing.prices).map(([key, cents]) => [key, discounted(cents, promo.percentOff)]),
          ),
        }
      : service.pricing,
    promotion: {
      id: promo.id,
      title: promo.title,
      percentOff: promo.percentOff,
      endsAt: promo.endsAt,
      originalPriceCents: service.priceCents,
    },
  }
}
