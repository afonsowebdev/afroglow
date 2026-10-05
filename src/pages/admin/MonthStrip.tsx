import { useEffect, useRef } from 'react'

export interface YearMonth {
  year: number
  month: number
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/**
 * Month picker: the year on top with arrows (and a "Hoje" shortcut), and all twelve months of that year in a strip
 * you can slide, so any month is one tap away instead of stepping through them one by one.
 */
export function MonthStrip({
  value,
  today,
  onSelect,
}: {
  value: YearMonth
  /** The current month, marked in the strip and used by the "Hoje" shortcut. */
  today: YearMonth
  onSelect: (next: YearMonth) => void
}) {
  const selected = useRef<HTMLButtonElement>(null)
  const isToday = value.year === today.year && value.month === today.month

  // Keep the chosen month in view when the year or the month changes.
  useEffect(() => {
    selected.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [value.year, value.month])

  return (
    <div className="mt-6 rounded-2xl border-[1.5px] border-onyx/25 bg-white p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Ano anterior"
            onClick={() => onSelect({ year: value.year - 1, month: value.month })}
            className="glass-chip flex size-9 items-center justify-center rounded-full text-onyx"
          >
            <i className="bx bx-chevron-left" aria-hidden="true" />
          </button>
          <span className="min-w-14 text-center font-subtitle text-lg font-semibold lining-nums tracking-tight text-onyx">
            {value.year}
          </span>
          <button
            type="button"
            aria-label="Ano seguinte"
            onClick={() => onSelect({ year: value.year + 1, month: value.month })}
            className="glass-chip flex size-9 items-center justify-center rounded-full text-onyx"
          >
            <i className="bx bx-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          disabled={isToday}
          onClick={() => onSelect(today)}
          className="glass-chip rounded-full px-4 py-2 font-subtitle text-xs font-medium text-onyx disabled:opacity-40"
        >
          Hoje
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Mês"
        className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MONTHS.map((label, index) => {
          const month = index + 1
          const active = month === value.month
          const current = value.year === today.year && month === today.month
          return (
            <button
              key={label}
              ref={active ? selected : undefined}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect({ year: value.year, month })}
              className={`relative h-11 min-w-14 shrink-0 rounded-full px-4 font-subtitle text-sm text-onyx ${
                active ? 'glass-chip-on font-semibold' : 'glass-chip'
              }`}
            >
              {label}
              {current && (
                <span
                  className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold-ink"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
