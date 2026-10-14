import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/types'
import type { AdminStats } from '@/pages/admin/admin-types'
import { MonthBarsCard } from './MonthBarsCard'

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
  const topMax = Math.max(1, ...stats.topServices.map((x) => x.count))
  const topTotal = stats.topServices.reduce((sum, x) => sum + x.count, 0)
  const { newThisMonth, returning, total: clientsTotal } = stats.clients
  const clientsMonth = newThisMonth + returning

  const section = 'mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark'
  const card = 'rounded-2xl border border-onyx/10 bg-white p-5 shadow-sm shadow-black/5'

  return (
    <div className="mt-6 flex flex-col gap-7">
      {/* This month at a glance: the revenue and how it moved, then three small figures. */}
      <section>
        <h2 className={section}>Este mês · {monthLabel}</h2>
        <div className={card}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-subtitle text-xs text-muted-dark">Receita</p>
              <p className="mt-0.5 font-subtitle text-4xl font-semibold lining-nums tracking-tight text-onyx">
                {euros(revenue)}
              </p>
            </div>
            {revenueDiff !== null && (
              <span
                className={`mt-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-subtitle text-xs font-medium lining-nums ${
                  revenueDiff > 0
                    ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                    : revenueDiff < 0
                      ? 'bg-red-600/10 text-red-700 dark:text-red-400'
                      : 'bg-onyx/[0.06] text-onyx/70'
                }`}
              >
                <i
                  className={`bx ${revenueDiff > 0 ? 'bx-trending-up' : revenueDiff < 0 ? 'bx-trending-down' : 'bx-minus'} text-sm`}
                  aria-hidden="true"
                />
                {revenueDiff === 0 ? 'Igual' : `${revenueDiff > 0 ? '+' : '−'}${euros(Math.abs(revenueDiff))}`}
              </span>
            )}
          </div>
          <p className="mt-1 font-subtitle text-xs text-muted-dark">
            {revenueDiff === null ? 'Das sessões confirmadas.' : 'Comparado com o mês anterior.'}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ['bx bx-calendar-check', String(sessions), sessions === 1 ? 'Sessão' : 'Sessões'],
              ['bx bx-receipt', sessions ? euros(ticket) : '—', 'Por sessão'],
              ['bx bx-user-plus', String(newThisMonth), newThisMonth === 1 ? 'Cliente nova' : 'Clientes novas'],
            ].map(([icon, value, label]) => (
              <div key={label} className="rounded-xl bg-onyx/[0.04] p-3">
                <i className={`${icon} text-lg text-onyx/70`} aria-hidden="true" />
                <p className="mt-1 font-subtitle text-lg font-semibold lining-nums leading-tight text-onyx">{value}</p>
                <p className="font-subtitle text-[11px] text-muted-dark">{label}</p>
              </div>
            ))}
          </div>
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
        <div className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] font-subtitle text-[15px]">
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
