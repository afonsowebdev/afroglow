import { useState } from 'react'
import { motion } from 'motion/react'
import { bookingPrice } from '@/lib/pricing'
import { formatPrice, type Booking } from '@/lib/types'
import { group, plural, Section } from './admin-ui'

/*
 * Estatísticas, as answers to what the owner asks herself: how much did I make and am I growing; how did the last
 * months go; what sells; who are my clients; which days are busiest; where do I lose bookings. One month at a time,
 * chosen on top; worked out from the bookings themselves.
 */

const TZ = 'Europe/Lisbon'
const euros = (cents: number) => formatPrice(cents).replace(/,00/, '')
const monthKey = (iso: string | Date) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7)
function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + delta, 15)).toISOString().slice(0, 7)
}
const monthName = (key: string, style: 'long' | 'short' = 'long') =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', month: style }).replace('.', '')
const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
/** 0 = Monday … 6 = Sunday, in Lisbon. */
const weekdayIndex = (iso: string) => {
  const name = new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short' })
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(name)
}

const card = 'rounded-2xl border border-onyx/10 bg-white p-5 shadow-sm shadow-black/5'

export function StatsView({ bookings }: { bookings: Booking[] }) {
  const thisMonth = monthKey(new Date())
  const [month, setMonth] = useState(thisMonth)

  const confirmed = bookings.filter((b) => b.status === 'ACCEPTED')
  const of = (list: Booking[], key: string) => list.filter((b) => monthKey(b.slot.startsAt) === key)
  const revenueOf = (key: string) => of(confirmed, key).reduce((sum, b) => sum + bookingPrice(b), 0)

  const prev = shiftMonth(month, -1)
  const sessions = of(confirmed, month)
  const revenue = revenueOf(month)
  const revenuePrev = revenueOf(prev)
  const diff = revenue - revenuePrev
  const average = sessions.length ? Math.round(revenue / sessions.length / 100) * 100 : 0

  // The last six months up to the one chosen.
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
  const series = months.map((k) => ({ key: k, cents: revenueOf(k), count: of(confirmed, k).length }))
  const max = Math.max(1, ...series.map((m) => m.cents))

  // Hairstyles this month.
  const byService = new Map<string, { name: string; count: number; cents: number }>()
  for (const b of sessions) {
    const row = byService.get(b.serviceId) ?? { name: b.service.name, count: 0, cents: 0 }
    row.count += 1
    row.cents += bookingPrice(b)
    byService.set(b.serviceId, row)
  }
  const services = [...byService.values()].sort((a, b) => b.cents - a.cents)

  // Clients: new this month (first visit) and returning, and who spent most.
  const firstVisit = new Map<string, string>()
  for (const b of [...confirmed].sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))) {
    if (!firstVisit.has(b.customerId)) firstVisit.set(b.customerId, monthKey(b.slot.startsAt))
  }
  const clientsThisMonth = new Map<string, { name: string; cents: number; count: number }>()
  for (const b of sessions) {
    const row = clientsThisMonth.get(b.customerId) ?? { name: b.customerName, cents: 0, count: 0 }
    row.cents += bookingPrice(b)
    row.count += 1
    clientsThisMonth.set(b.customerId, row)
  }
  const newClients = [...clientsThisMonth.keys()].filter((id) => firstVisit.get(id) === month).length
  const returning = clientsThisMonth.size - newClients
  const topClients = [...clientsThisMonth.values()].sort((a, b) => b.cents - a.cents).slice(0, 3)

  // Busiest weekdays, over the three months up to the one chosen.
  const window3 = new Set([month, shiftMonth(month, -1), shiftMonth(month, -2)])
  const perWeekday = Array.from({ length: 7 }, () => 0)
  for (const b of confirmed) if (window3.has(monthKey(b.slot.startsAt))) perWeekday[weekdayIndex(b.slot.startsAt)] += 1
  const weekdayMax = Math.max(1, ...perWeekday)
  const busiest = perWeekday.indexOf(Math.max(...perWeekday))

  // Where bookings are lost, for sessions in the month.
  const all = of(bookings, month)
  const answered = all.filter((b) => b.status !== 'PENDING')
  const rejected = all.filter((b) => b.status === 'REJECTED').length
  const cancelled = all.filter((b) => b.status === 'CANCELLED').length
  const accepted = all.filter((b) => b.status === 'ACCEPTED' || b.status === 'CANCELLED').length
  const acceptance = answered.length ? Math.round((accepted / answered.length) * 100) : null
  const lostCents = all.filter((b) => b.status === 'CANCELLED').reduce((sum, b) => sum + bookingPrice(b), 0)

  return (
    <div className="mt-6 flex flex-col gap-8">
      {/* The month being looked at. */}
      <div className="flex items-center justify-between rounded-full border border-onyx/10 bg-white px-1.5 py-1 shadow-sm shadow-black/5">
        <button type="button" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))} className="flex size-10 items-center justify-center text-2xl text-onyx">
          <i className="bx bx-chevron-left" aria-hidden="true" />
        </button>
        <p className="font-subtitle text-base font-semibold text-onyx first-letter:uppercase">
          {monthName(month)} {month.slice(0, 4)}
        </p>
        <button
          type="button"
          aria-label="Mês seguinte"
          disabled={month >= thisMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="flex size-10 items-center justify-center text-2xl text-onyx disabled:opacity-25"
        >
          <i className="bx bx-chevron-right" aria-hidden="true" />
        </button>
      </div>

      {/* How much, and against the month before. */}
      <section className={card}>
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">Receita</p>
        <p className="mt-1 font-subtitle text-[40px] font-semibold lining-nums leading-tight tracking-tight text-onyx">{euros(revenue)}</p>
        <p className="mt-1 font-subtitle text-sm text-muted-dark">
          {revenuePrev === 0 ? (
            `Sem receita em ${monthName(prev)} para comparar.`
          ) : diff === 0 ? (
            `O mesmo que em ${monthName(prev)}.`
          ) : (
            <>
              <strong className={`font-semibold ${diff > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                {diff > 0 ? '+' : '−'}
                {euros(Math.abs(diff))}
              </strong>{' '}
              {diff > 0 ? 'do que' : 'que'} em {monthName(prev)}
            </>
          )}
        </p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-onyx/10 border-t border-onyx/10 pt-4">
          <div className="pr-3">
            <p className="font-subtitle text-xl font-semibold lining-nums text-onyx">{sessions.length}</p>
            <p className="font-subtitle text-xs text-muted-dark">{sessions.length === 1 ? 'sessão' : 'sessões'}</p>
          </div>
          <div className="pl-4">
            <p className="font-subtitle text-xl font-semibold lining-nums text-onyx">{sessions.length ? euros(average) : '—'}</p>
            <p className="font-subtitle text-xs text-muted-dark">em média por sessão</p>
          </div>
        </div>
      </section>

      {/* The last six months, one bar each; tap one to look at it. */}
      <Section title="Últimos 6 meses" note="Toca num mês para o ver em detalhe.">
        <div className={card}>
          <div className="flex h-40 items-end gap-2">
            {series.map((m, i) => {
              const on = m.key === month
              return (
                <button key={m.key} type="button" onClick={() => setMonth(m.key)} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className={`font-subtitle text-[10px] lining-nums ${on ? 'font-semibold text-onyx' : 'text-muted-dark'}`}>
                    {m.cents ? euros(m.cents) : ''}
                  </span>
                  <motion.span
                    className={`w-full rounded-lg ${on ? 'bg-onyx' : 'bg-onyx/15'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(3, (m.cents / max) * 100)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span className={`font-subtitle text-[11px] uppercase ${on ? 'font-semibold text-onyx' : 'text-muted-dark'}`}>{monthName(m.key, 'short')}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      {/* What sells. */}
      <Section title="Modelos">
        {services.length === 0 ? (
          <p className="rounded-2xl bg-onyx/[0.04] px-4 py-4 font-subtitle text-sm text-muted-dark">Sem sessões confirmadas neste mês.</p>
        ) : (
          <div className={group}>
            {services.map((s, i) => (
              <div key={s.name} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 font-subtitle">
                  <span className="min-w-0 truncate text-[15px] font-medium text-onyx">{s.name}</span>
                  <span className="shrink-0 text-sm font-semibold lining-nums text-onyx">{euros(s.cents)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-onyx/[0.08]">
                    <span className={`block h-full rounded-full ${i === 0 ? 'bg-onyx' : 'bg-onyx/45'}`} style={{ width: `${(s.cents / services[0].cents) * 100}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right font-subtitle text-xs text-muted-dark">{plural(s.count, 'sessão', 'sessões')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Who came. */}
      <Section title="Clientes">
        <div className="grid grid-cols-2 gap-3">
          {[
            [String(newClients), newClients === 1 ? 'cliente nova' : 'clientes novas'],
            [String(returning), returning === 1 ? 'voltou' : 'voltaram'],
          ].map(([value, text]) => (
            <div key={text} className={`${card} p-4`}>
              <p className="font-subtitle text-2xl font-semibold lining-nums text-onyx">{value}</p>
              <p className="font-subtitle text-xs text-muted-dark">{text}</p>
            </div>
          ))}
        </div>
        {topClients.length > 0 && (
          <div className={`${group} mt-3`}>
            {topClients.map((c, i) => (
              <div key={c.name + i} className="flex items-center gap-3.5 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-sm font-semibold text-white">
                  {c.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-subtitle text-[15px] font-medium text-onyx">{c.name}</span>
                  <span className="block font-subtitle text-xs text-muted-dark">{plural(c.count, 'sessão', 'sessões')}</span>
                </span>
                <span className="shrink-0 font-subtitle text-sm font-semibold lining-nums text-onyx">{euros(c.cents)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Which days are busiest: helps to choose the opening times. */}
      <Section
        title="Dias com mais trabalho"
        note={perWeekday.some(Boolean) ? `${WEEKDAYS[busiest]} é o dia com mais sessões (últimos 3 meses).` : undefined}
      >
        <div className={group}>
          {WEEKDAYS.map((day, i) => (
            <div key={day} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-20 shrink-0 font-subtitle text-sm text-onyx">{day}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-onyx/[0.08]">
                <span className={`block h-full rounded-full ${i === busiest && perWeekday[i] ? 'bg-onyx' : 'bg-onyx/40'}`} style={{ width: `${(perWeekday[i] / weekdayMax) * 100}%` }} />
              </span>
              <span className="w-6 shrink-0 text-right font-subtitle text-sm lining-nums text-muted-dark">{perWeekday[i]}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Where bookings are lost. */}
      <Section title="Pedidos e cancelamentos">
        <div className={group}>
          {[
            ['bx bx-check-circle', 'Pedidos aceites', acceptance === null ? '—' : `${acceptance}%`],
            ['bx bx-block', 'Recusados', String(rejected)],
            ['bx bx-calendar-x', 'Cancelados', cancelled ? `${cancelled} · ${euros(lostCents)}` : '0'],
          ].map(([icon, text, value]) => (
            <div key={text} className="flex items-center gap-3 px-4 py-3">
              <i className={`${icon} text-lg text-onyx/60`} aria-hidden="true" />
              <span className="flex-1 font-subtitle text-[15px] text-onyx">{text}</span>
              <span className="font-subtitle text-[15px] lining-nums text-muted-dark">{value}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
