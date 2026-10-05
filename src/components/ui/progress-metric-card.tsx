import { useId, useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import {
  ACCENTS,
  formatCompact,
  MetricChart,
  SERIES_COLORS,
  type ChartSeries,
  type ChartView,
  type MetricAccent,
  type MetricSeries,
  type SeriesPoint,
} from './metric-chart'
import { PeriodSelect, ViewToggle, type PeriodOption } from './metric-controls'

// Types re-exported so consumers only import this file.
export type { SeriesPoint, MetricSeries, MetricAccent, ChartView, PeriodOption }

export type CardSize = 'sm' | 'md' | 'lg'

export interface ProgressMetricCardProps {
  title: string
  total?: string | number
  delta?: string
  deltaLabel?: string
  percent?: string
  trend?: 'up' | 'down'
  unit?: string
  period?: string
  periodOptions?: PeriodOption[]
  onPeriodChange?: (option: PeriodOption) => void
  defaultView?: ChartView
  accent?: MetricAccent
  /** A single series. Provide this OR `series`. */
  data?: SeriesPoint[]
  /** Several named series. Takes priority over `data`. */
  series?: MetricSeries[]
  defaultIndex?: number
  size?: CardSize
  /** Shows the secondary stats (peak / low / average) in the footer. */
  showStats?: boolean
  /** Value format. Default: compact for the headline, exact in the tooltip. */
  valueFormatter?: (value: number) => string
  dateFormatter?: (date: string) => string
  loading?: boolean
  className?: string
}

const DEFAULT_PERIODS: PeriodOption[] = [
  { label: 'Últimos 7 dias', points: 4 },
  { label: 'Últimos 14 dias', points: 7 },
  { label: 'Últimos 30 dias' },
]

// Share of the card (from the right) taken by the chart.
const REGION_W = 62 // %
// A change below this threshold counts as "stable" and gets the neutral accent.
const NEUTRAL_PCT = 0.5

const SIZES: Record<CardSize, { minH: string; pad: string; footer: string; title: string; headline: string }> = {
  sm: { minH: 'min-h-[260px]', pad: 'px-5 pt-5', footer: 'px-5 py-3', title: 'text-[15px]', headline: 'text-[40px]' },
  md: { minH: 'min-h-[380px]', pad: 'px-8 pt-7', footer: 'px-8 py-4', title: 'text-[17px]', headline: 'text-[72px]' },
  lg: { minH: 'min-h-[460px]', pad: 'px-10 pt-9', footer: 'px-10 py-5', title: 'text-[19px]', headline: 'text-[88px]' },
}

const sliceWindow = (points: SeriesPoint[], n?: number) => (n && n < points.length ? points.slice(-n) : points)

export default function ProgressMetricCard({
  title,
  total,
  delta,
  deltaLabel = 'hoje',
  percent,
  trend,
  unit,
  period = 'Últimos 30 dias',
  periodOptions,
  onPeriodChange,
  defaultView = 'curve',
  accent,
  data,
  series,
  defaultIndex,
  size = 'md',
  showStats = true,
  valueFormatter,
  dateFormatter,
  loading = false,
  className = '',
}: ProgressMetricCardProps) {
  const gridId = `grid-${useId().replace(/:/g, '')}`
  const sz = SIZES[size]
  const shell = `relative flex ${sz.minH} w-full flex-col overflow-hidden rounded-[28px] border-[1.5px] border-onyx/25 bg-white ${className}`

  const periods = periodOptions ?? DEFAULT_PERIODS
  const [selectedLabel, setSelectedLabel] = useState(period)
  const [view, setView] = useState<ChartView>(defaultView)

  // Normalises the input into a list of series (a plain `data` becomes a single series).
  const baseSeries: MetricSeries[] = useMemo(
    () => (series?.length ? series : [{ name: title, data: data ?? [], accent }]),
    [series, data, title, accent],
  )

  const selectedOption = periods.find((p) => p.label === selectedLabel) ?? periods[periods.length - 1]

  // Cuts every series to the chosen period.
  const visibleSeries = useMemo(
    () => baseSeries.map((s) => ({ ...s, data: sliceWindow(s.data, selectedOption?.points) })),
    [baseSeries, selectedOption],
  )

  const primary = visibleSeries[0]
  const isMulti = visibleSeries.length > 1
  const hasData = (primary?.data.length ?? 0) >= 2

  // Every figure derives from the main series, so the card stays consistent and reacts to the period.
  // Explicit props still win.
  const stats = useMemo(() => {
    const vals = primary?.data.map((d) => d.value) ?? []
    const sum = vals.reduce((a, b) => a + b, 0)
    const first = vals[0] ?? 0
    const last = vals[vals.length - 1] ?? 0
    const prev = vals[vals.length - 2] ?? first
    const net = last - first
    return {
      sum,
      net,
      pct: first ? (net / first) * 100 : 0,
      step: last - prev,
      peak: vals.length ? Math.max(...vals) : 0,
      low: vals.length ? Math.min(...vals) : 0,
      avg: vals.length ? sum / vals.length : 0,
    }
  }, [primary])

  // The colour follows the direction (last vs first point), with a neutral zone.
  const resolvedTrend: 'up' | 'down' | 'flat' =
    trend ?? (Math.abs(stats.pct) < NEUTRAL_PCT ? 'flat' : stats.net >= 0 ? 'up' : 'down')
  const resolvedAccent: MetricAccent =
    accent ?? (resolvedTrend === 'up' ? 'emerald' : resolvedTrend === 'down' ? 'rose' : 'neutral')
  const color = ACCENTS[resolvedAccent]
  const TrendIcon = resolvedTrend === 'flat' ? ArrowRight : resolvedTrend === 'down' ? ArrowDown : ArrowUp

  const fmtCompact = valueFormatter ?? formatCompact
  const fmtFull = valueFormatter ?? ((n: number) => n.toLocaleString('pt-PT') + (unit ? ` ${unit}` : ''))
  const fmtDate = dateFormatter ?? ((d: string) => d)
  const sign = (n: number) => (n >= 0 ? '+' : '−') + fmtCompact(Math.abs(n))

  const displayTotal = total ?? fmtCompact(stats.sum)
  const displayDelta = delta ?? sign(stats.step)
  const displayPercent = percent ?? `${Math.abs(stats.pct).toFixed(1).replace('.', ',')}%`

  // Colour of each series: its own accent, then the palette, then the card's colour.
  const chartSeries: ChartSeries[] = visibleSeries.map((s, i) => ({
    name: s.name,
    data: s.data,
    color: s.accent ? ACCENTS[s.accent].stroke : isMulti ? SERIES_COLORS[i % SERIES_COLORS.length] : color.stroke,
  }))

  const lastIndex = (primary?.data.length ?? 1) - 1
  const fallback = Math.min(defaultIndex ?? lastIndex, lastIndex)

  const handlePeriodChange = (option: PeriodOption) => {
    setSelectedLabel(option.label)
    onPeriodChange?.(option)
  }

  if (loading) {
    return (
      <div className={shell} aria-busy="true">
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded bg-onyx/10" />
            <div className="h-5 w-24 animate-pulse rounded bg-onyx/10" />
          </div>
          <div className="mt-6 h-14 w-48 animate-pulse rounded-lg bg-onyx/10" />
          <div className="mt-auto h-24 w-full animate-pulse rounded-lg bg-onyx/5" />
        </div>
        <div className={`border-t border-onyx/10 ${sz.footer}`}>
          <div className="h-4 w-40 animate-pulse rounded bg-onyx/10" />
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className={shell}>
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <h3 className={`${sz.title} font-subtitle font-semibold tracking-tight text-onyx`}>{title}</h3>
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <p className="font-subtitle text-sm font-medium text-onyx">Ainda sem dados</p>
            <p className="font-subtitle text-xs text-muted-dark">Os valores aparecem quando houver registos.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={shell}>
      {/* Chart area (on the right, behind the content) */}
      <div className="absolute inset-y-0 right-0 z-0" style={{ width: `${REGION_W}%` }}>
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to left, ${color.stroke}1f, transparent 75%)` }}
        />
        <div
          className="absolute inset-0 text-onyx/15"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 55%)',
            maskImage: 'linear-gradient(to right, transparent, black 55%)',
          }}
        >
          <svg className="h-full w-full" aria-hidden="true">
            <defs>
              <pattern id={gridId} width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </svg>
        </div>

        <MetricChart
          series={chartSeries}
          view={view}
          defaultIndex={fallback}
          valueFormatter={fmtFull}
          dateFormatter={fmtDate}
        />
      </div>

      {/* Main content */}
      <div className={`pointer-events-none relative z-10 flex flex-1 flex-col ${sz.pad}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <h3 className={`${sz.title} font-subtitle font-semibold tracking-tight text-onyx`}>{title}</h3>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <span className="flex items-center gap-1 font-subtitle font-medium" style={{ color: color.text }}>
              <TrendIcon size={15} strokeWidth={2.5} />
              {displayPercent}
            </span>
            <PeriodSelect
              value={selectedLabel}
              options={periods}
              onChange={handlePeriodChange}
              accentText={color.text}
            />
          </div>
        </div>

        {/* Legend (several series only) */}
        {isMulti && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {chartSeries.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5 font-subtitle text-[12px] text-muted-dark">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div
          className={`mt-5 ${sz.headline} font-subtitle font-semibold lining-nums leading-none tracking-tight text-onyx`}
        >
          {displayTotal}
        </div>
      </div>

      {/* Opaque footer: delta on the left, secondary stats on the right */}
      <div
        className={`relative z-10 flex items-center flex-wrap justify-between gap-x-3 gap-y-1 border-t border-onyx/10 bg-white ${sz.footer} font-subtitle text-[13px]`}
      >
        <div>
          <span className="font-medium" style={{ color: color.text }}>
            {displayDelta}
          </span>{' '}
          <span className="text-muted-dark">{deltaLabel}</span>
        </div>
        {showStats && (
          <div className="flex items-center gap-2 text-[11px] text-muted-dark">
            <span>
              <span className="font-medium text-onyx/80">{fmtCompact(stats.peak)}</span> máx
            </span>
            <span className="opacity-40">·</span>
            <span>
              <span className="font-medium text-onyx/80">{fmtCompact(stats.low)}</span> mín
            </span>
            <span className="opacity-40">·</span>
            <span>
              <span className="font-medium text-onyx/80">{fmtCompact(Math.round(stats.avg))}</span> méd
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
