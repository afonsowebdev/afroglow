import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface MonthPoint {
  /** "2026-10" */
  key: string
  value: number
}

const SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]
const monthIndex = (key: string) => Number(key.split('-')[1]) - 1

/**
 * One figure per month, in black and white: the chosen month large (the current one at first) with how it compares
 * to the month before, the months as bars below (tap one to see it), and the period's total and average. 3 or 6
 * months.
 */
export function MonthBarsCard({
  title,
  icon,
  points,
  format,
}: {
  title: string
  icon: string
  points: MonthPoint[]
  format: (value: number) => string
}) {
  const [span, setSpan] = useState<3 | 6>(6)
  const shown = points.slice(-span)
  const [selectedKey, setSelectedKey] = useState(points.at(-1)?.key ?? '')
  const selected = shown.find((p) => p.key === selectedKey) ?? shown.at(-1)
  const index = selected ? points.findIndex((p) => p.key === selected.key) : -1
  const previous = index > 0 ? points[index - 1] : null
  const max = Math.max(1, ...shown.map((p) => p.value))
  const total = shown.reduce((sum, p) => sum + p.value, 0)
  const diff = selected && previous ? selected.value - previous.value : null
  const pct = diff !== null && previous && previous.value > 0 ? Math.round((diff / previous.value) * 100) : null

  return (
    <section className="rounded-2xl border border-onyx/10 bg-white p-5 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-subtitle text-base font-semibold text-onyx">
          <i className={cn(icon, 'text-lg')} aria-hidden="true" />
          {title}
        </h2>
        {/* 3 or 6 months, as a small switch. */}
        <div className="grid grid-cols-2 rounded-full bg-onyx/[0.06] p-0.5" role="tablist" aria-label="Período">
          {([3, 6] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={span === n}
              onClick={() => setSpan(n)}
              className={cn(
                'h-7 rounded-full px-3 font-subtitle text-xs',
                span === n ? 'bg-onyx font-medium text-white' : 'text-onyx/60',
              )}
            >
              {n} meses
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="mt-5">
          <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
            {LONG[monthIndex(selected.key)]} {selected.key.slice(0, 4)}
          </p>
          <p className="mt-1 font-subtitle text-4xl font-semibold lining-nums tracking-tight text-onyx">
            {format(selected.value)}
          </p>
          {diff !== null && (
            <p className="mt-1.5 font-subtitle text-sm text-muted-dark">
              <span className="font-medium text-onyx">
                {diff > 0 ? '↑ ' : diff < 0 ? '↓ ' : ''}
                {diff > 0 ? '+' : diff < 0 ? '−' : ''}
                {format(Math.abs(diff))}
                {pct !== null && ` (${diff >= 0 ? '+' : '−'}${Math.abs(pct)}%)`}
              </span>{' '}
              vs. {LONG[monthIndex(previous!.key)]}
            </p>
          )}
        </div>
      )}

      {/* The months as bars: the chosen one solid, the others pale; tap to choose. */}
      <div className="mt-6 flex h-36 items-end gap-2" role="radiogroup" aria-label={`${title} por mês`}>
        {shown.map((p) => {
          const on = p.key === selected?.key
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${LONG[monthIndex(p.key)]}: ${format(p.value)}`}
              onClick={() => setSelectedKey(p.key)}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="flex w-full flex-1 items-end">
                <motion.span
                  initial={false}
                  animate={{ height: `${Math.max(3, (p.value / max) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  className={cn(
                    'block w-full rounded-lg transition-colors',
                    on ? 'bg-onyx' : 'bg-onyx/15 group-hover:bg-onyx/25',
                  )}
                />
              </span>
              <span
                className={cn(
                  'font-subtitle text-[11px] uppercase tracking-wide',
                  on ? 'font-semibold text-onyx' : 'text-muted-dark',
                )}
              >
                {SHORT[monthIndex(p.key)]}
              </span>
            </button>
          )
        })}
      </div>

      <dl className="mt-5 grid grid-cols-2 border-t border-onyx/10 pt-4">
        <div>
          <dt className="font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">Total · {span} meses</dt>
          <dd className="mt-1 font-subtitle text-base font-semibold lining-nums text-onyx">{format(total)}</dd>
        </div>
        <div className="border-l border-onyx/10 pl-4">
          <dt className="font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">Média por mês</dt>
          <dd className="mt-1 font-subtitle text-base font-semibold lining-nums text-onyx">
            {format(Math.round(total / Math.max(1, shown.length)))}
          </dd>
        </div>
      </dl>
    </section>
  )
}
