import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/types'
import type { AdminStats } from '@/pages/admin/admin-types'

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 15).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')
}

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
  const maxRevenue = Math.max(1, ...stats.months.map((m) => m.revenueCents))
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

      <section className="rounded-2xl border-[1.5px] border-onyx/25 bg-white p-5">
        <h2 className="font-subtitle text-base text-onyx">Receita dos últimos 6 meses</h2>
        <div className="mt-5 flex items-end gap-3">
          {stats.months.map((m) => (
            <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
              <span className="font-subtitle text-[10px] text-muted-dark">
                {m.revenueCents ? formatPrice(m.revenueCents) : ''}
              </span>
              <div className="flex h-24 w-full items-end">
                <div
                  className={`w-full rounded-t-lg ${m.key === stats.currentMonth ? 'bg-gold-deep' : 'bg-gold-deep/40'}`}
                  style={{ height: Math.max(4, Math.round((m.revenueCents / maxRevenue) * 96)) }}
                />
              </div>
              <span className="font-subtitle text-xs capitalize text-muted-dark">{monthLabel(m.key)}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 font-subtitle text-xs text-muted-dark">Só conta sessões confirmadas, no mês da sessão.</p>
      </section>

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
