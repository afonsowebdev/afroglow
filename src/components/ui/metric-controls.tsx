import { useEffect, useRef, useState } from 'react'
import { BarChart3, Check, ChevronDown, TrendingUp } from 'lucide-react'
import type { ChartView } from './metric-chart'

export interface PeriodOption {
  label: string
  /** How many of the latest points to show; all of them when omitted. */
  points?: number
}

/** Switch between the curve and the bars. */
export function ViewToggle({ value, onChange }: { value: ChartView; onChange: (view: ChartView) => void }) {
  const items: Array<{ id: ChartView; label: string; Icon: typeof TrendingUp }> = [
    { id: 'curve', label: 'Curva', Icon: TrendingUp },
    { id: 'bars', label: 'Barras', Icon: BarChart3 },
  ]
  return (
    <div className="pointer-events-auto glass-chip flex rounded-full p-0.5" role="group" aria-label="Tipo de gráfico">
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`flex size-7 items-center justify-center rounded-full text-onyx transition-colors ${
            value === id ? 'glass-chip-on' : 'opacity-60'
          }`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}

/** The period menu: a small button that opens a list of options. */
export function PeriodSelect({
  value,
  options,
  onChange,
  accentText,
}: {
  value: string
  options: PeriodOption[]
  onChange: (option: PeriodOption) => void
  accentText: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={root} className="pointer-events-auto relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="glass-chip flex items-center gap-1 rounded-full px-3 py-1.5 font-subtitle text-xs font-medium text-onyx"
      >
        <span style={{ color: accentText }}>{value}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1.5 min-w-40 overflow-hidden rounded-2xl border-[1.5px] border-onyx/25 bg-white py-1 shadow-lg shadow-black/10"
        >
          {options.map((option) => (
            <li key={option.label}>
              <button
                type="button"
                role="option"
                aria-selected={option.label === value}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-subtitle text-sm text-onyx active:bg-onyx/5"
              >
                {option.label}
                {option.label === value && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
