import { useEffect, useState } from 'react'
import ProgressMetricCard, { type SeriesPoint } from '@/components/ui/progress-metric-card'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/types'
import type { AdminStats } from '@/pages/admin/admin-types'

const PERIODS = [{ label: 'Últimos 3 meses', points: 3 }, { label: 'Últimos 6 meses' }]

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
  const monthName = (key: string) => {
    const [year, month] = key.split('-').map(Number)
    const label = new Date(year, month - 1, 15).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  const revenueSeries: SeriesPoint[] = stats.months.map((m) => ({
    value: m.revenueCents / 100,
    date: monthName(m.key),
  }))
  const sessionsSeries: SeriesPoint[] = stats.months.map((m) => ({ value: m.bookings, date: monthName(m.key) }))
  const cards = [
    { icon: 'bx bx-euro', label: 'Receita do mês', value: formatPrice(current?.revenueCents ?? 0) },
    { icon: 'bx bx-calendar-check', label: 'Sessões do mês', value: String(current?.bookings ?? 0) },
    { icon: 'bx bx-user-plus', label: 'Clientes novos', value: String(stats.clients.newThisMonth) },
    { icon: 'bx bx-repost', label: 'Clientes que voltam', value: String(stats.clients.returning) },
  ]

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border-[1.5px] border-onyx/25 bg-white p-4">
            <i className={`${card.icon} text-lg text-gold-deep`} aria-hidden="true" />
            <p className="mt-2 font-subtitle font-semibold lining-nums tracking-tight text-xl leading-none text-onyx">
              {card.value}
            </p>
            <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">{card.label}</p>
          </div>
        ))}
      </div>

      <ProgressMetricCard
        title="Receita"
        size="sm"
        accent="gold"
        data={revenueSeries}
        defaultIndex={revenueSeries.length - 1}
        period="Últimos 6 meses"
        periodOptions={PERIODS}
        deltaLabel="vs. mês anterior"
        valueFormatter={(euros) => formatPrice(Math.round(euros * 100)).replace(/,00/, '')}
      />

      <ProgressMetricCard
        title="Sessões"
        size="sm"
        unit="sessões"
        data={sessionsSeries}
        defaultIndex={sessionsSeries.length - 1}
        period="Últimos 6 meses"
        periodOptions={PERIODS}
        deltaLabel="vs. mês anterior"
        defaultView="bars"
      />

      <p className="px-1 font-subtitle text-xs text-muted-dark">
        Só conta sessões confirmadas, no mês da sessão. Toca no gráfico para ver cada mês.
      </p>

      <section className="rounded-2xl border-[1.5px] border-onyx/25 bg-white p-5">
        <h2 className="font-subtitle text-base text-onyx">Modelos mais pedidos</h2>
        {stats.topServices.length === 0 ? (
          <p className="mt-3 font-subtitle text-sm text-muted-dark">Ainda sem sessões confirmadas.</p>
        ) : (
          <div className="mt-3 divide-y divide-onyx/10">
            {stats.topServices.map((service) => (
              <div key={service.name} className="flex items-center justify-between py-2.5">
                <span className="font-subtitle text-sm text-onyx">{service.name}</span>
                <span className="font-subtitle text-sm text-muted-dark">
                  {service.count} · {formatPrice(service.revenueCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border-[1.5px] border-onyx/25 bg-white p-5">
        <h2 className="font-subtitle text-base text-onyx">Em geral</h2>
        <div className="mt-3 divide-y divide-onyx/10 font-subtitle text-sm">
          {[
            ['Sessões confirmadas', String(stats.totals.accepted)],
            ['Canceladas', `${stats.totals.cancelled} (${Math.round(stats.totals.cancellationRate * 100)}%)`],
            ['Recusadas', String(stats.totals.rejected)],
            ['Pedidos por responder', String(stats.totals.pending)],
            ['Clientes registados', String(stats.clients.total)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-onyx">{label}</span>
              <span className="text-muted-dark">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
