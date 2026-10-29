import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { tap } from '@/lib/haptics'

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
 * Month picker, in a white card like the Painel's: the month and year between two round glass arrows; tapping the name
 * folds out a grid with the twelve months (and the year arrows) to jump straight to any of them. Away from this month,
 * a small glass pill brings it back.
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
  const arrow = 'glass-chip flex size-10 items-center justify-center rounded-full text-onyx transition-transform active:scale-[0.94]'
  const go = (next: YearMonth) => {
    void tap()
    onSelect(next)
  }

  return (
    <div
      className="mt-6 rounded-[22px] bg-card"
      style={{ boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.08), 0px 12px 32px -10px rgba(0,0,0,0.2)' }}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <button type="button" aria-label="Mês anterior" onClick={() => go(step(value, -1))} className={arrow}>
          <ChevronLeft size={18} />
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
            <ChevronDown size={18} className={`text-muted-dark transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
          </span>
          <span className="font-subtitle text-xs font-medium lining-nums text-muted-dark">{value.year}</span>
        </button>

        <button type="button" aria-label="Mês seguinte" onClick={() => go(step(value, 1))} className={arrow}>
          <ChevronRight size={18} />
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
            <div className="px-4 pb-4 pt-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Ano anterior"
                  onClick={() => go({ year: value.year - 1, month: value.month })}
                  className={arrow}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-subtitle text-base font-semibold lining-nums tracking-tight text-onyx">
                  {value.year}
                </span>
                <button
                  type="button"
                  aria-label="Ano seguinte"
                  onClick={() => go({ year: value.year + 1, month: value.month })}
                  className={arrow}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2" role="tablist" aria-label="Mês">
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
                        go({ year: value.year, month })
                        setOpen(false)
                      }}
                      className={`h-11 rounded-full font-subtitle text-sm ${
                        active
                          ? 'glass-chip-on font-semibold text-onyx'
                          : current
                            ? 'glass-chip font-semibold text-onyx'
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
        <div className="flex justify-center pb-3">
          <button
            type="button"
            onClick={() => {
              go(today)
              setOpen(false)
            }}
            className="glass-chip flex h-8 items-center gap-1.5 rounded-full px-3 font-subtitle text-[12px] font-semibold text-onyx transition-transform active:scale-[0.96]"
          >
            <RotateCcw size={13} strokeWidth={2.2} />
            Voltar a hoje
          </button>
        </div>
      )}
    </div>
  )
}
