import { useMemo, useRef, useState } from 'react'

export interface SeriesPoint {
  value: number
  date: string
}

export type MetricAccent = 'emerald' | 'rose' | 'neutral' | 'gold' | 'blue'
export type ChartView = 'curve' | 'bars'

export interface MetricSeries {
  name: string
  data: SeriesPoint[]
  accent?: MetricAccent
}

export interface ChartSeries {
  name: string
  data: SeriesPoint[]
  color: string
}

/** `stroke` draws the chart, `text` colours the figures (readable on white and on the dark brown). */
export const ACCENTS: Record<MetricAccent, { stroke: string; text: string }> = {
  emerald: { stroke: '#10b981', text: '#047857' },
  rose: { stroke: '#f43f5e', text: '#be123c' },
  neutral: { stroke: '#8e8e93', text: '#636366' },
  gold: { stroke: '#c9a84c', text: '#8a6d14' },
  blue: { stroke: '#3b82f6', text: '#1d4ed8' },
}

export const SERIES_COLORS = ['#c9a84c', '#3b82f6', '#10b981', '#f43f5e']

export function formatCompact(value: number) {
  return new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

const PAD_TOP = 0.22
const PAD_BOTTOM = 0.14

/** Smooth path through the points (Catmull-Rom converted to cubic Béziers). */
function smoothPath(points: Array<[number, number]>) {
  if (points.length < 2) return ''
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`
  }
  return d
}

/**
 * The chart that sits behind a metric card: a smooth curve (or bars) filling its box. Touching or hovering moves a
 * marker along the points and shows the exact value and date for that point.
 */
export function MetricChart({
  series,
  view,
  defaultIndex,
  valueFormatter,
  dateFormatter,
}: {
  series: ChartSeries[]
  view: ChartView
  defaultIndex: number
  valueFormatter: (value: number) => string
  dateFormatter: (date: string) => string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const count = series[0]?.data.length ?? 0
  const active = Math.min(hover ?? defaultIndex, count - 1)

  const { min, max } = useMemo(() => {
    const all = series.flatMap((s) => s.data.map((d) => d.value))
    const lo = Math.min(...all)
    const hi = Math.max(...all)
    return { min: lo, max: hi === lo ? lo + 1 : hi }
  }, [series])

  const x = (i: number) => (count === 1 ? 50 : (i / (count - 1)) * 100)
  const y = (v: number) => (PAD_TOP + (1 - (v - min) / (max - min)) * (1 - PAD_TOP - PAD_BOTTOM)) * 100

  function pick(clientX: number) {
    const rect = box.current?.getBoundingClientRect()
    if (!rect || count < 2) return
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setHover(Math.round(ratio * (count - 1)))
  }

  const lead = series[0]
  const point = lead.data[active]
  const left = x(active)

  return (
    <div
      ref={box}
      className="absolute inset-0 touch-pan-y"
      onPointerMove={(e) => pick(e.clientX)}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {view === 'curve'
          ? series.map((s, si) => {
              const pts = s.data.map((d, i) => [x(i), y(d.value)] as [number, number])
              const line = smoothPath(pts)
              return (
                <g key={s.name}>
                  {si === 0 && series.length === 1 && (
                    <path d={`${line} L100,100 L0,100 Z`} fill={s.color} fillOpacity={0.12} />
                  )}
                  <path
                    d={line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )
            })
          : lead.data.map((d, i) => {
              const slot = 100 / count
              const w = slot * 0.56
              return (
                <rect
                  key={d.date + i}
                  x={i * slot + (slot - w) / 2}
                  y={y(d.value)}
                  width={w}
                  height={100 - y(d.value)}
                  rx={1.2}
                  fill={lead.color}
                  fillOpacity={i === active ? 0.9 : 0.35}
                />
              )
            })}
      </svg>

      {/* Marker: guide line, a dot on each series and the tooltip. */}
      <div className="pointer-events-none absolute inset-y-0 w-px bg-onyx/20" style={{ left: `${left}%` }} />
      {view === 'curve' &&
        series.map((s) => (
          <span
            key={s.name}
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
            style={{ left: `${left}%`, top: `${y(s.data[active].value)}%`, background: s.color }}
          />
        ))}
      <div
        className="pointer-events-none absolute top-2 z-20 whitespace-nowrap rounded-xl border-[1.5px] border-onyx/25 bg-white px-2.5 py-1.5 text-center shadow-md shadow-black/10"
        // Kept inside the chart: anchored to the left edge, the right edge, or centred on the marker.
        style={{ left: `${left}%`, transform: `translateX(${left > 60 ? '-100%' : left < 25 ? '0%' : '-50%'})` }}
      >
        <p className="font-subtitle text-xs font-semibold lining-nums text-onyx">{valueFormatter(point.value)}</p>
        <p className="font-subtitle text-[10px] text-muted-dark">{dateFormatter(point.date)}</p>
      </div>
    </div>
  )
}
