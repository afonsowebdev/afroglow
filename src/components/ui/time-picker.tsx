import { useEffect, useRef, useState } from 'react'

function generateTimes(startHour: number, endHour: number, stepMinutes: number) {
  const times: string[] = []
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += stepMinutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0')
    const m = String(minutes % 60).padStart(2, '0')
    times.push(`${h}:${m}`)
  }
  return times
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Escolher hora',
  startHour = 8,
  endHour = 20,
  stepMinutes = 30,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  startHour?: number
  endHour?: number
  stepMinutes?: number
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const times = generateTimes(startHour, endHour, stepMinutes)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-xl border border-gold/30 px-4 py-2.5 font-subtitle text-sm outline-none transition-colors duration-300 hover:border-gold-deep ${
          value ? 'text-onyx' : 'text-muted-dark'
        }`}
      >
        <i className="bx bx-time text-base text-gold-deep" aria-hidden="true" />
        {value || placeholder}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 max-h-56 w-36 overflow-y-auto rounded-2xl border border-gold/20 bg-white p-2 shadow-lg">
          {times.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(time)
                setOpen(false)
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left font-subtitle text-sm transition-colors duration-200 ${
                value === time ? 'bg-gold-deep text-cream' : 'text-onyx hover:bg-cream'
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
