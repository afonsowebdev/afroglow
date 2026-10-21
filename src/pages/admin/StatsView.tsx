import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/types'
import type { AdminStats } from '@/pages/admin/admin-types'
import { MonthBarsCard } from './MonthBarsCard'

const RING = 2 * Math.PI * 52

export function StatsView() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get<AdminStats>('/admin/stats')
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  if (error) return <p className="mt-8 font-subtitle text-red-700">Não foi possível carregar as estatísticas.</p>
  if (!stats) return <p className="mt-8 font-subtitle text-muted-dark">A carregar...</p>

  const current = stats.months.find((m) => m.key === stats.currentMonth)
  const previous = stats.months[stats.months.findIndex((m) => m.key === stats.currentMonth) - 1]
  const revenue = current?.revenueCents ?? 0
  const sessions = current?.bookings ?? 0
  const ticket = sessions ? Math.round(revenue / sessions) : 0
  const revenueDiff = previous ? revenue - previous.revenueCents : null
  const [year, month] = stats.currentMonth.split('-').map(Number)
  const monthLabel = new Date(year, month - 1, 15).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  const euros = (cents: number) => formatPrice(cents).replace(/,00/, '')
  // The month's goal: the average revenue of the months before that had any.
  const earlier = stats.months.filter((m) => m.key < stats.currentMonth && m.revenueCents > 0)
  const goal = earlier.length ? Math.round(earlier.reduce((sum, m) => sum + m.revenueCents, 0) / earlier.length) : 0
  const topMax = Math.max(1, ...stats.topServices.map((x) => x.count))
  const topTotal = stats.topServices.reduce((sum, x) => sum + x.count, 0)
  const { newThisMonth, returning, total: clientsTotal } = stats.clients
  const clientsMonth = newThisMonth + returning

  const section = 'mb-[7px] px-4 text-[13px] uppercase text-[var(--ios-secondary)]'
  const card = 'rounded-[12px] bg-[var(--ios-cell)] p-4'

  return (
    <div className="mt-6 flex flex-col gap-7">
      {/* This month against its goal: a ring filling up to the average of the months before, the figures beside. */}
      <section>
        <h2 className={section}>Este mês · {monthLabel}</h2>
        <div className={card}>
          <div className="flex items-center gap-5">
            <div className="relative size-36 shrink-0">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-onyx/[0.07]" />
                {goal > 0 && (
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="stroke-onyx"
                    strokeDasharray={RING}
                    initial={{ strokeDashoffset: RING }}
                    animate={{ strokeDashoffset: RING * (1 - Math.min(1, revenue / goal)) }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-subtitle text-2xl font-semibold lining-nums leading-none text-onyx">
                  {euros(revenue)}
                </span>
                <span className="mt-1 font-subtitle text-[11px] text-muted-dark">
                  {goal > 0 ? `de ${euros(goal)}` : 'receita'}
                </span>
                {goal > 0 && (
                  <span className="mt-0.5 font-subtitle text-xs font-semibold lining-nums text-onyx">
                    {revenue >= goal ? 'Meta batida ✓' : `${Math.round((revenue / goal) * 100)}%`}
                  </span>
                )}
              </div>
            </div>
            <dl className="flex min-w-0 flex-1 flex-col gap-3">
              {[
                [String(sessions), sessions === 1 ? 'sessão' : 'sessões'],
                [sessions ? euros(ticket) : '—', 'por sessão'],
                [String(newThisMonth), newThisMonth === 1 ? 'cliente nova' : 'clientes novas'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dd className="font-subtitle text-xl font-semibold lining-nums leading-none text-onyx">{value}</dd>
                  <dt className="mt-0.5 font-subtitle text-xs text-muted-dark">{label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 border-t border-onyx/10 pt-3 font-subtitle text-xs text-muted-dark">
            {goal > 0 ? 'A meta é a média dos meses anteriores. ' : ''}
            {revenueDiff !== null && revenueDiff !== 0 && (
              <span className="font-medium text-onyx">
                {revenueDiff > 0 ? '↑ +' : '↓ −'}
                {euros(Math.abs(revenueDiff))} vs. o mês anterior
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Month by month: bars, growth or round (MonthBarsCard). */}
      <section className="flex flex-col gap-3">
        <h2 className={section}>Mês a mês</h2>
        <MonthBarsCard
          title="Receita"
          icon="bx bx-euro"
          points={stats.months.map((m) => ({ key: m.key, value: m.revenueCents }))}
          format={(cents) => euros(cents)}
        />
        <MonthBarsCard
          title="Sessões"
          icon="bx bx-calendar-check"
          points={stats.months.map((m) => ({ key: m.key, value: m.bookings }))}
          format={(n) => `${n} ${n === 1 ? 'sessão' : 'sessões'}`}
        />
        <p className="px-1 font-subtitle text-xs text-muted-dark">
          Só conta sessões confirmadas, no mês da sessão. Toca num mês para o ver.
        </p>
      </section>

      {/* The models, ranked, each with its share. */}
      <section>
        <h2 className={section}>Modelos mais pedidos</h2>
        <div className={card}>
          {stats.topServices.length === 0 ? (
            <p className="font-subtitle text-sm text-muted-dark">Ainda sem sessões confirmadas.</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {stats.topServices.map((service, i) => (
                <li key={service.name}>
                  <div className="flex items-baseline justify-between gap-3 font-subtitle">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="w-4 shrink-0 text-xs text-muted-dark">{i + 1}</span>
                      <span className="truncate text-[15px] font-medium text-onyx">{service.name}</span>
                    </span>
                    <span className="shrink-0 text-sm lining-nums text-onyx">
                      {service.count} <span className="text-muted-dark">· {euros(service.revenueCents)}</span>
                    </span>
                  </div>
                  <div className="ml-6 mt-1.5 flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-onyx/[0.07]">
                      <span
                        className={`block h-full rounded-full ${i === 0 ? 'bg-onyx' : 'bg-onyx/40'}`}
                        style={{ width: `${(service.count / topMax) * 100}%` }}
                      />
                    </span>
                    <span className="w-9 text-right font-subtitle text-[11px] lining-nums text-muted-dark">
                      {topTotal ? Math.round((service.count / topTotal) * 100) : 0}%
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Who came: new and returning this month. */}
      <section>
        <h2 className={section}>Clientes</h2>
        <div className={card}>
          <div className="flex items-baseline justify-between">
            <p className="font-subtitle text-2xl font-semibold lining-nums text-onyx">{clientsTotal}</p>
            <p className="font-subtitle text-xs text-muted-dark">registadas no total</p>
          </div>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-onyx/[0.07]">
            {clientsMonth > 0 && (
              <>
                <span className="h-full bg-onyx" style={{ width: `${(newThisMonth / clientsMonth) * 100}%` }} />
                <span className="h-full bg-onyx/35" style={{ width: `${(returning / clientsMonth) * 100}%` }} />
              </>
            )}
          </div>
          <div className="mt-3 flex justify-between font-subtitle text-sm">
            <span className="flex items-center gap-2 text-onyx">
              <span className="size-2.5 rounded-full bg-onyx" /> Novas este mês{' '}
              <strong className="lining-nums">{newThisMonth}</strong>
            </span>
            <span className="flex items-center gap-2 text-onyx">
              <span className="size-2.5 rounded-full bg-onyx/35" /> Voltaram{' '}
              <strong className="lining-nums">{returning}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Everything so far. */}
      <section>
        <h2 className={section}>Desde o início</h2>
        <div className="divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[10px] bg-[var(--ios-cell)] font-subtitle text-[15px]">
          {[
            ['bx bx-check-circle', 'Sessões confirmadas', String(stats.totals.accepted)],
            ['bx bx-time-five', 'Pedidos por responder', String(stats.totals.pending)],
            [
              'bx bx-calendar-x',
              'Canceladas',
              `${stats.totals.cancelled} · ${Math.round(stats.totals.cancellationRate * 100)}%`,
            ],
            ['bx bx-block', 'Recusadas', String(stats.totals.rejected)],
          ].map(([icon, label, value]) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3">
              <i className={`${icon} text-lg text-onyx/60`} aria-hidden="true" />
              <span className="flex-1 text-onyx">{label}</span>
              <span className="lining-nums text-muted-dark">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
