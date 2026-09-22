import { useEffect, useRef, useState } from 'react'

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function toDateValue(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateValue(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function monthDays(viewMonth: Date) {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
  return days
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Escolher data',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseDateValue(value) : null
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date())
  const containerRef = useRef<HTMLDivElement>(null)
  const today = startOfToday()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const label = selected
    ? capitalize(selected.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }))
    : placeholder

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setViewMonth(selected ?? new Date())
          setOpen((v) => !v)
        }}
        className={`flex items-center gap-2 rounded-xl border border-gold/30 px-4 py-2.5 font-subtitle text-sm outline-none transition-colors duration-300 hover:border-gold-deep ${
          selected ? 'text-onyx' : 'text-muted-dark'
        }`}
      >
        <i className="bx bx-calendar text-base text-gold-deep" aria-hidden="true" />
        {label}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-gold/20 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-cream hover:text-gold-deep"
            >
              <i className="bx bx-chevron-left" aria-hidden="true" />
            </button>
            <span className="font-logo text-sm text-onyx">
              {capitalize(viewMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }))}
            </span>
            <button
              type="button"
              aria-label="Mês seguinte"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-cream hover:text-gold-deep"
            >
              <i className="bx bx-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LETTERS.map((letter, i) => (
              <span key={i} className="font-subtitle text-[11px] uppercase text-muted-dark">
                {letter}
              </span>
            ))}
            {monthDays(viewMonth).map((day, i) => {
              if (!day) return <span key={i} />
              const isPast = day < today
              const isSelected = selected && toDateValue(day) === toDateValue(selected)
              const isToday = toDateValue(day) === toDateValue(today)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    onChange(toDateValue(day))
                    setOpen(false)
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-subtitle text-sm transition-colors duration-200 ${
                    isSelected
                      ? 'bg-gold-deep text-cream'
                      : isPast
                        ? 'cursor-not-allowed text-onyx/20'
                        : isToday
                          ? 'border border-gold-deep text-onyx'
                          : 'text-onyx hover:bg-cream'
                  }`}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
