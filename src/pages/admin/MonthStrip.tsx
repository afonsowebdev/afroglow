import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export interface YearMonth {
  year: number
  month: number
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const longMonth = (value: YearMonth) => {
  const label = new Date(value.year, value.month - 1, 1).toLocaleDateString('pt-PT', { month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const step = (value: YearMonth, delta: number): YearMonth => {
  const zero = value.month - 1 + delta
  return { year: value.year + Math.floor(zero / 12), month: (((zero % 12) + 12) % 12) + 1 }
}

/**
 * Month picker. A single bar with the month and year and plain arrows to step through; tapping the name folds out
 * a grid with the twelve months (and the year arrows) to jump straight to any of them.
 */
export function MonthStrip({
  value,
  today,
  onSelect,
}: {
  value: YearMonth
  /** The current month, marked in the grid and used by the "Hoje" shortcut. */
  today: YearMonth
  onSelect: (next: YearMonth) => void
}) {
  const [open, setOpen] = useState(false)
  const isToday = value.year === today.year && value.month === today.month
  const arrow = 'flex size-10 items-center justify-center text-2xl text-onyx active:opacity-50'

  return (
    <div className="mt-6 rounded-2xl border-[1.5px] border-onyx/25 bg-white">
      <div className="flex items-center justify-between px-2 py-1.5">
        <button type="button" aria-label="Mês anterior" onClick={() => onSelect(step(value, -1))} className={arrow}>
          <i className="bx bx-chevron-left" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-expanded={open}
          aria-label="Escolher o mês"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col items-center px-3 py-1"
        >
          <span className="flex items-center gap-1.5 font-subtitle text-lg font-semibold leading-tight tracking-tight text-onyx">
            {longMonth(value)}
            <i
              className={`bx bx-chevron-down text-xl text-muted-dark transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
          <span className="font-subtitle text-xs font-medium lining-nums text-muted-dark">{value.year}</span>
        </button>

        <button type="button" aria-label="Mês seguinte" onClick={() => onSelect(step(value, 1))} className={arrow}>
          <i className="bx bx-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="months"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-onyx/10 px-4 pb-4 pt-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Ano anterior"
                  onClick={() => onSelect({ year: value.year - 1, month: value.month })}
                  className={arrow}
                >
                  <i className="bx bx-chevron-left" aria-hidden="true" />
                </button>
                <span className="font-subtitle text-base font-semibold lining-nums tracking-tight text-onyx">
                  {value.year}
                </span>
                <button
                  type="button"
                  aria-label="Ano seguinte"
                  onClick={() => onSelect({ year: value.year + 1, month: value.month })}
                  className={arrow}
                >
                  <i className="bx bx-chevron-right" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-1 grid grid-cols-4 gap-2" role="tablist" aria-label="Mês">
                {MONTHS.map((label, index) => {
                  const month = index + 1
                  const active = month === value.month
                  const current = value.year === today.year && month === today.month
                  return (
                    <button
                      key={label}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        onSelect({ year: value.year, month })
                        setOpen(false)
                      }}
                      className={`h-11 rounded-xl font-subtitle text-sm ${
                        active
                          ? 'glass-chip-on font-semibold text-onyx'
                          : current
                            ? 'glass-chip font-semibold text-gold-ink'
                            : 'glass-chip text-onyx'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isToday && (
        <button
          type="button"
          onClick={() => {
            onSelect(today)
            setOpen(false)
          }}
          className="block w-full border-t border-onyx/10 py-2.5 text-center font-subtitle text-xs font-medium text-onyx underline-offset-4 active:opacity-60"
        >
          Voltar a hoje
        </button>
      )}
    </div>
  )
}
