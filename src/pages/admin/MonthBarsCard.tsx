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

type View = 'bars' | 'line' | 'donut'
const VIEWS: Array<{ id: View; label: string; icon: string }> = [
  { id: 'bars', label: 'Barras', icon: 'bx bx-bar-chart-alt-2' },
  { id: 'line', label: 'Crescimento', icon: 'bx bx-trending-up' },
  { id: 'donut', label: 'Redondo', icon: 'bx bx-doughnut-chart' },
]

/** The months as a line that climbs and falls, the area under it shaded; each month a dot to tap. */
function GrowthChart({
  points,
  selectedKey,
  max,
  onSelect,
  format,
}: {
  points: MonthPoint[]
  selectedKey?: string
  max: number
  onSelect: (key: string) => void
  format: (value: number) => string
}) {
  const W = 300
  const H = 120
  const pad = 10
  const x = (i: number) => (points.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1))
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`
  return (
    <div className="mt-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full overflow-visible" preserveAspectRatio="none">
        <motion.path
          key={`a${points.length}`}
          d={area}
          className="fill-onyx/[0.08]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.path
          key={`l${points.length}`}
          d={line}
          fill="none"
          className="stroke-onyx"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      {/* The dots and month names sit over the drawing, in HTML, so they stay round and tappable. */}
      <div className="relative -mt-36 h-36">
        {points.map((p, i) => {
          const on = p.key === selectedKey
          return (
            <button
              key={p.key}
              type="button"
              aria-label={`${LONG[monthIndex(p.key)]}: ${format(p.value)}`}
              aria-pressed={on}
              onClick={() => onSelect(p.key)}
              className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(p.value) / H) * 100}%` }}
            >
              <span
                className={cn(
                  'block rounded-full border-2 border-onyx transition-all',
                  on ? 'size-4 bg-onyx' : 'size-2.5 bg-white',
                )}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between px-0.5">
        {points.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect(p.key)}
            className={cn(
              'font-subtitle text-[11px] uppercase tracking-wide',
              p.key === selectedKey ? 'font-semibold text-onyx' : 'text-muted-dark',
            )}
          >
            {SHORT[monthIndex(p.key)]}
          </button>
        ))}
      </div>
    </div>
  )
}

/** The months as one ring, each slice as large as its share of the period; the chosen one solid, its share inside. */
function RingChart({
  points,
  selectedKey,
  onSelect,
  format,
  total,
}: {
  points: MonthPoint[]
  selectedKey?: string
  onSelect: (key: string) => void
  format: (value: number) => string
  total: number
}) {
  const R = 52
  const C = 2 * Math.PI * R
  const gap = points.length > 1 ? 2.5 : 0
  let offset = 0
  const selected = points.find((p) => p.key === selectedKey)
  const share = selected && total > 0 ? Math.round((selected.value / total) * 100) : 0
  return (
    <div className="mt-6 flex items-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="14" className="stroke-onyx/[0.06]" />
          {total > 0 &&
            points.map((p, i) => {
              const len = (p.value / total) * C
              const dash = Math.max(0, len - gap)
              const el = (
                <motion.circle
                  key={p.key}
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  strokeWidth={p.key === selectedKey ? 18 : 14}
                  className={cn(
                    'cursor-pointer transition-[stroke-width]',
                    p.key === selectedKey ? 'stroke-onyx' : i % 2 ? 'stroke-onyx/25' : 'stroke-onyx/40',
                  )}
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={-offset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  onClick={() => onSelect(p.key)}
                />
              )
              offset += len
              return el
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-subtitle text-2xl font-semibold lining-nums text-onyx">{share}%</span>
          <span className="font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">do período</span>
        </div>
      </div>
      {/* The months as a legend, also to tap. */}
      <ul className="flex min-w-0 flex-1 flex-col gap-1">
        {points.map((p, i) => {
          const on = p.key === selectedKey
          return (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => onSelect(p.key)}
                className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left font-subtitle text-xs"
              >
                <span
                  className={cn('size-2.5 shrink-0 rounded-full', on ? 'bg-onyx' : i % 2 ? 'bg-onyx/25' : 'bg-onyx/40')}
                />
                <span
                  className={cn('flex-1 uppercase tracking-wide', on ? 'font-semibold text-onyx' : 'text-muted-dark')}
                >
                  {SHORT[monthIndex(p.key)]}
                </span>
                <span className={cn('lining-nums', on ? 'font-semibold text-onyx' : 'text-onyx/70')}>
                  {format(p.value)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

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
  const [view, setView] = useState<View>('bars')
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

      {/* How to see it: bars, growth (a line) or round (a ring). */}
      <div className="mt-3 flex gap-1.5" role="tablist" aria-label="Tipo de gráfico">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-full border px-3 font-subtitle text-xs transition-colors',
              view === v.id ? 'border-onyx bg-onyx font-medium text-white' : 'border-onyx/15 text-onyx/60',
            )}
          >
            <i className={cn(v.icon, 'text-sm')} aria-hidden="true" />
            {v.label}
          </button>
        ))}
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

      {view === 'bars' && (
        // The months as bars: the chosen one solid, the others pale; tap to choose.
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
      )}

      {view === 'line' && (
        <GrowthChart points={shown} selectedKey={selected?.key} max={max} onSelect={setSelectedKey} format={format} />
      )}

      {view === 'donut' && (
        <RingChart points={shown} selectedKey={selected?.key} onSelect={setSelectedKey} format={format} total={total} />
      )}

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
