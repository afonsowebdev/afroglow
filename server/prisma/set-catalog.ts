/*
 * The hairstyle catalogue as defined by the business (October 2026). Run once with `npm run set-catalog`.
 *
 * - Boho, Fulani, Island Twist and Twist (sem caixas): Curta 40 €, Média 50 €, Longa e fina 60 €. All included.
 * - Box Braids: by parting. Grossas and Médias 50 €, Finas 60 €.
 * - Tranças Nagô (the former Cornrows): by parting. Grossas 25 €, Médias 30 €, Finas 35 €.
 * - Every other hairstyle leaves the booking list: deleted when it has no bookings, hidden otherwise.
 * - The current photos are removed (the business adds its own).
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PARTINGS = ['Grossas', 'Médias', 'Finas']

// As the business defined it: three sizes, the longest one also fine.
const bySize = {
  lengths: ['Curta', 'Média', 'Longa e fina'],
  partings: [],
  prices: { 'Curta|': 4000, 'Média|': 5000, 'Longa e fina|': 6000 },
}

const CATALOG = [
  {
    name: 'Boho Braids',
    match: ['Boho Braids'],
    description: 'Tranças com madeixas soltas e onduladas, um visual leve e natural. Tudo incluído.',
    durationLabel: '4–6h',
    pricing: bySize,
  },
  {
    name: 'Fulani Braids',
    match: ['Fulani Braids'],
    description: 'Tranças com padrão central e contas decorativas. Tudo incluído.',
    durationLabel: '2–4h',
    pricing: bySize,
  },
  {
    name: 'Tranças Nagô',
    match: ['Tranças Nagô', 'Cornrows'],
    description: 'Tranças rentes ao couro cabeludo, em padrões variados. Tudo incluído.',
    durationLabel: '1–3h',
    pricing: { lengths: [], partings: PARTINGS, prices: { '|Grossas': 2500, '|Médias': 3000, '|Finas': 3500 } },
  },
  {
    name: 'Box Braids',
    match: ['Box Braids'],
    description: 'Tranças quadradas protetoras, clássicas e versáteis. Tudo incluído.',
    durationLabel: '3–5h',
    pricing: { lengths: [], partings: PARTINGS, prices: { '|Grossas': 5000, '|Médias': 5000, '|Finas': 6000 } },
  },
  {
    name: 'Island Twist',
    match: ['Island Twist'],
    description: 'Twists com pontas cacheadas, leves e com movimento. Tudo incluído.',
    durationLabel: '4–6h',
    pricing: bySize,
  },
  {
    name: 'Twist (sem caixas)',
    match: ['Twist (sem caixas)', 'Twist'],
    description: 'Twists sem caixas marcadas, para um acabamento mais natural. Tudo incluído.',
    durationLabel: '3–5h',
    pricing: bySize,
  },
]

const lowest = (prices: Record<string, number>) => Math.min(...Object.values(prices))

async function main() {
  const existing = await prisma.service.findMany({ include: { _count: { select: { bookings: true } } } })
  const kept = new Set<string>()
  // Spread over consecutive seconds so the list keeps the order above (it is sorted by creation).
  const base = new Date('2026-01-01T00:00:00Z').getTime()

  for (const [index, item] of CATALOG.entries()) {
    const found = existing.find((s) => item.match.includes(s.name))
    const data = {
      name: item.name,
      description: item.description,
      durationLabel: item.durationLabel,
      pricing: item.pricing,
      priceCents: lowest(item.pricing.prices),
      active: true,
      createdAt: new Date(base + index * 1000),
    }
    const service = found
      ? await prisma.service.update({ where: { id: found.id }, data })
      : await prisma.service.create({ data })
    kept.add(service.id)
    console.log(`${found ? 'atualizado' : 'criado'}: ${service.name} (a partir de ${service.priceCents / 100} €)`)
  }

  for (const service of existing.filter((s) => !kept.has(s.id))) {
    if (service._count.bookings === 0) {
      await prisma.service.delete({ where: { id: service.id } })
      console.log(`eliminado: ${service.name}`)
    } else {
      await prisma.service.update({ where: { id: service.id }, data: { active: false } })
      console.log(`escondido (tem ${service._count.bookings} marcação/ões): ${service.name}`)
    }
  }

  // Photos are the business's own from now on: only cleared when asked (`-- --clear-photos`).
  if (process.argv.includes('--clear-photos')) {
    const photos = await prisma.serviceImage.deleteMany({ where: { serviceId: { in: [...kept] } } })
    console.log(`fotos removidas: ${photos.count}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
