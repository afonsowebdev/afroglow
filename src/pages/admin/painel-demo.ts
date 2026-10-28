import type { AvailabilitySlot, Booking, Service, Testimonial } from '@/lib/types'

/*
 * Sample data for the Painel's "Simulação": six months of a busy salon, the week ahead, a few requests waiting and
 * two testimonials, so every block and chart can be seen filled in. Built from a fixed seed (the same every time)
 * around today; nothing here is sent anywhere or saved.
 */

const NAMES = [
  'Ana Silva',
  'Marta Costa',
  'Inês Gomes',
  'Joana Mendes',
  'Carla Santos',
  'Beatriz Lopes',
  'Sofia Almeida',
  'Rita Fernandes',
  'Leonor Pinto',
  'Mariana Rocha',
  'Patrícia Dias',
  'Vanessa Teixeira',
  'Catarina Neves',
  'Daniela Sousa',
]

const SERVICES: Service[] = [
  { id: 'demo-box', name: 'Box Braids', description: '', durationLabel: '5 horas', priceCents: 9000, createdAt: '2026-01-01T00:00:00Z', images: [] },
  { id: 'demo-knot', name: 'Knotless', description: '', durationLabel: '6 horas', priceCents: 11000, createdAt: '2026-01-01T00:00:00Z', images: [] },
  { id: 'demo-twist', name: 'Twists', description: '', durationLabel: '4 horas', priceCents: 7500, createdAt: '2026-01-01T00:00:00Z', images: [] },
  { id: 'demo-cornrow', name: 'Cornrows', description: '', durationLabel: '2 horas', priceCents: 4500, createdAt: '2026-01-01T00:00:00Z', images: [] },
  { id: 'demo-retoque', name: 'Retoque', description: '', durationLabel: '1,5 horas', priceCents: 3000, createdAt: '2026-01-01T00:00:00Z', images: [] },
]
// How often each one is booked (Box Braids the most).
const WEIGHTS = [5, 3, 3, 2, 2]

function random(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export function painelDemo(now = new Date()) {
  const rand = random(42)
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]
  const service = () => {
    let roll = rand() * WEIGHTS.reduce((a, n) => a + n, 0)
    for (let i = 0; i < SERVICES.length; i++) if ((roll -= WEIGHTS[i]) < 0) return SERVICES[i]
    return SERVICES[0]
  }
  const bookings: Booking[] = []
  const slots: AvailabilitySlot[] = []
  let n = 0
  const add = (startsAt: Date, status: Booking['status'], createdDaysBefore = 4) => {
    const s = service()
    const name = pick(NAMES)
    const id = `demo-${n++}`
    const iso = startsAt.toISOString()
    const created = new Date(startsAt.getTime() - createdDaysBefore * 86_400_000).toISOString()
    const slot: AvailabilitySlot = { id: `${id}-slot`, startsAt: iso, status: status === 'PENDING' ? 'PENDING' : 'BOOKED', createdAt: created }
    bookings.push({
      id,
      slotId: slot.id,
      serviceId: s.id,
      // A few recent bookings come from first-time clients.
      customerId: startsAt.getTime() > now.getTime() - 40 * 86_400_000 && rand() < 0.18 ? `demo-new-${n}` : `demo-client-${NAMES.indexOf(name)}`,
      customerName: name,
      customerPhone: '+351 912 345 678',
      notes: null,
      status,
      createdAt: created,
      updatedAt: status === 'PENDING' ? created : new Date(startsAt.getTime() - 86_400_000).toISOString(),
      slot,
      service: s,
    })
  }
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(hour, 0, 0, 0)
    return d
  }

  // The last six months: busier as the months go on, with the odd cancellation.
  for (let day = -175; day <= 0; day++) {
    const weekday = at(day, 12).getDay()
    if (weekday === 0) continue
    const growth = 0.55 + ((day + 175) / 175) * 0.6
    const sessions = Math.round((weekday === 6 ? 3 : 2) * growth * (0.6 + rand() * 0.8))
    for (let k = 0; k < sessions; k++) {
      const hour = 9 + k * 3
      if (day === 0 && hour > now.getHours() + 3) continue
      add(at(day, hour), rand() < 0.08 ? 'CANCELLED' : 'ACCEPTED')
    }
  }
  // Today: one done, one going on now, one later.
  add(at(0, Math.max(now.getHours() - 4, 8)), 'ACCEPTED')
  const live = new Date(now.getTime() - 60 * 60_000)
  live.setMinutes(0, 0, 0)
  add(live, 'ACCEPTED')
  add(at(0, Math.min(now.getHours() + 2, 22)), 'ACCEPTED')
  // The week ahead, a few requests waiting, and open times.
  for (let day = 1; day <= 7; day++) {
    for (const hour of [9, 13, 17]) {
      const roll = rand()
      if (roll < 0.55) add(at(day, hour), 'ACCEPTED')
      else if (roll < 0.7) add(at(day, hour), 'PENDING', 1)
      else slots.push({ id: `demo-open-${day}-${hour}`, startsAt: at(day, hour).toISOString(), status: 'OPEN', createdAt: now.toISOString() })
    }
  }

  const testimonials: Testimonial[] = [
    { id: 'demo-t1', content: 'As tranças ficaram perfeitas, voltarei de certeza!', status: 'PENDING', createdAt: at(-1, 18).toISOString(), customer: { name: 'Marta Costa' } },
    { id: 'demo-t2', content: 'Atendimento incrível e muito cuidado com o cabelo.', status: 'PENDING', createdAt: at(-3, 11).toISOString(), customer: { name: 'Sofia Almeida' } },
    { id: 'demo-t3', content: 'Super profissional.', status: 'APPROVED', createdAt: at(-12, 15).toISOString(), customer: { name: 'Inês Gomes' } },
  ]

  return { bookings, slots, services: SERVICES, testimonials, goalCents: 300_000 }
}
