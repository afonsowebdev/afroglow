import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { api, ApiError } from '@/lib/api'

const WEEKDAYS = [
  { id: 1, label: 'Seg' },
  { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' },
  { id: 4, label: 'Qui' },
  { id: 5, label: 'Sex' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
]

/** What is open on one weekday: the morning time, the afternoon time, both or neither (closed). */
interface DayShifts {
  am: boolean
  pm: boolean
}

interface Pattern {
  week: Record<number, DayShifts>
  /** The two times of the day: one client in the morning, one in the afternoon. */
  amTime: string
  pmTime: string
  weeks: number
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const STORAGE_KEY = 'afroglow-admin-schedule-week'
// The studio's usual week: Monday to Wednesday and Saturday morning and afternoon; Thursday morning only; Friday off;
// Sunday afternoon only.
const DEFAULT_PATTERN: Pattern = {
  week: {
    1: { am: true, pm: true },
    2: { am: true, pm: true },
    3: { am: true, pm: true },
    4: { am: true, pm: false },
    5: { am: false, pm: false },
    6: { am: true, pm: true },
    0: { am: false, pm: true },
  },
  amTime: '09:00',
  pmTime: '14:00',
  weeks: 4,
}

function loadPattern(): Pattern {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Pattern>
      return { ...DEFAULT_PATTERN, ...saved, week: { ...DEFAULT_PATTERN.week, ...saved.week } }
    }
  } catch {
    // ignore: fall back to the default
  }
  return DEFAULT_PATTERN
}

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function dateValue(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** Every start time the pattern produces from today on, minus the days off. */
function buildTimes(pattern: Pattern, daysOff: string[]) {
  const times: Date[] = []
  const now = new Date()
  for (let offset = 0; offset < pattern.weeks * 7; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    if (daysOff.includes(dateValue(day))) continue
    const shifts = pattern.week[day.getDay()]
    if (!shifts) continue
    const wanted = [shifts.am ? pattern.amTime : null, shifts.pm ? pattern.pmTime : null]
    for (const time of wanted) {
      if (!time) continue
      const minutes = toMinutes(time)
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60)
      if (at.getTime() > now.getTime()) times.push(at)
    }
  }
  return times
}

/** Opens a repeating weekly pattern in one go (e.g. Tuesday to Saturday, 09:00–18:00, every 2h). */
export function GenerateSlotsSheet({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [pattern, setPattern] = useState<Pattern>(DEFAULT_PATTERN)
  const [daysOff, setDaysOff] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPattern(loadPattern())
      setDaysOff([])
      setError(null)
    }
  }, [open])

  const times = useMemo(() => buildTimes(pattern, daysOff), [pattern, daysOff])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pattern))
      } catch {
        // remembering the pattern is a convenience only
      }
      let created = 0
      let skipped = 0
      for (let i = 0; i < times.length; i += 200) {
        const chunk = times.slice(i, i + 200).map((t) => t.toISOString())
        const result = await api.post<{ created: unknown[]; skipped: number }>('/admin/availability/batch', {
          startsAtList: chunk,
        })
        created += result.created.length
        skipped += result.skipped
      }
      onDone(`${created} horários criados${skipped ? ` (${skipped} já existiam)` : ''}.`)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar horários.')
    } finally {
      setBusy(false)
    }
  }

  const toggleShift = (day: number, shift: 'am' | 'pm') =>
    setPattern((p) => ({ ...p, week: { ...p.week, [day]: { ...p.week[day], [shift]: !p.week[day]?.[shift] } } }))

  const lastDay = times.length ? times[times.length - 1] : null
  const section = 'mb-[7px] px-4 text-[13px] uppercase text-[var(--ios-secondary)]'
  const group =
    'divide-y divide-[var(--ios-separator)] overflow-hidden rounded-[10px] bg-[var(--ios-cell)]'
  const openDays = WEEKDAYS.filter((d) => pattern.week[d.id]?.am || pattern.week[d.id]?.pm).length

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="Abrir a semana"
            onSubmit={(e) => {
              e.preventDefault()
              if (times.length && !busy) void submit()
            }}
            className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-[12px] bg-[var(--ios-bg)] shadow-2xl sm:rounded-[14px]"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 ios-bar ios-hairline-b px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="min-w-20 text-left text-[17px] text-[var(--ios-tint)] disabled:opacity-50"
              >
                Cancelar
              </button>
              <h2 className="font-subtitle text-base font-semibold text-onyx">Abrir a semana</h2>
              <button
                type="submit"
                disabled={busy || times.length === 0}
                className="min-w-20 text-right text-[17px] font-semibold text-[var(--ios-tint)] disabled:opacity-30"
              >
                {busy ? 'A criar…' : 'Criar'}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5">
              <p className="px-1 font-subtitle text-sm text-muted-dark">
                Abre as próximas semanas com a tua rotina. Os horários que já existem ficam como estão.
              </p>
              {error && (
                <p role="alert" className="rounded-xl bg-red-700/10 px-4 py-3 font-subtitle text-sm text-red-700">
                  {error}
                </p>
              )}

              {/* The two times of the day. */}
              <section>
                <h3 className={section}>Horas das sessões</h3>
                <div className={group}>
                  {(
                    [
                      ['Manhã', 'amTime'],
                      ['Tarde', 'pmTime'],
                    ] as const
                  ).map(([label, field]) => (
                    <label key={field} className="relative flex h-[52px] items-center gap-3 px-4">
                      <span className="flex-1 font-subtitle text-[15px] text-onyx">{label}</span>
                      <span className="font-subtitle text-base lining-nums tabular-nums text-onyx">
                        {pattern[field]}
                      </span>
                      <i className="bx bx-time-five text-lg text-onyx/40" aria-hidden="true" />
                      <input
                        type="time"
                        value={pattern[field]}
                        onChange={(e) => setPattern({ ...pattern, [field]: e.target.value })}
                        aria-label={`Hora da ${label.toLowerCase()}`}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-2 px-1 font-subtitle text-xs text-muted-dark">Uma cliente em cada hora.</p>
              </section>

              {/* Which of the two each weekday has. */}
              <section>
                <h3 className={section}>
                  A tua semana · {openDays} {openDays === 1 ? 'dia aberto' : 'dias abertos'}
                </h3>
                <ul className={group}>
                  {WEEKDAYS.map((day) => {
                    const shifts = pattern.week[day.id] ?? { am: false, pm: false }
                    const closed = !shifts.am && !shifts.pm
                    return (
                      <li key={day.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn('block font-subtitle text-[15px]', closed ? 'text-onyx/45' : 'text-onyx')}
                          >
                            {DAY_NAMES[day.id]}
                          </span>
                          <span className="block font-subtitle text-xs text-muted-dark">
                            {closed
                              ? 'Fechado'
                              : [shifts.am && pattern.amTime, shifts.pm && pattern.pmTime].filter(Boolean).join(' e ')}
                          </span>
                        </span>
                        {(['am', 'pm'] as const).map((shift) => (
                          <button
                            key={shift}
                            type="button"
                            aria-pressed={shifts[shift]}
                            aria-label={`${DAY_NAMES[day.id]}, ${shift === 'am' ? 'manhã' : 'tarde'}`}
                            onClick={() => toggleShift(day.id, shift)}
                            className={cn(
                              'h-9 w-[4.25rem] rounded-full font-subtitle text-xs transition-colors',
                              shifts[shift] ? 'bg-[var(--ios-tint)] font-medium text-[var(--ios-on-tint)]' : 'bg-[var(--ios-fill)] text-[var(--ios-secondary)]',
                            )}
                          >
                            {shift === 'am' ? 'Manhã' : 'Tarde'}
                          </button>
                        ))}
                      </li>
                    )
                  })}
                </ul>
              </section>

              {/* For how long. */}
              <section>
                <h3 className={section}>Durante</h3>
                <div className="grid grid-cols-6 rounded-[9px] bg-[var(--ios-fill)] p-[2px]" role="radiogroup" aria-label="Semanas">
                  {[1, 2, 3, 4, 6, 8].map((w) => (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={pattern.weeks === w}
                      onClick={() => setPattern({ ...pattern, weeks: w })}
                      className={cn(
                        'flex h-11 flex-col items-center justify-center rounded-[9px] font-subtitle leading-none',
                        pattern.weeks === w
                          ? 'bg-white text-onyx shadow-sm shadow-black/10 dark:bg-onyx/[0.14]'
                          : 'text-onyx/55',
                      )}
                    >
                      <span className="text-sm font-semibold">{w}</span>
                      <span className="mt-0.5 text-[10px]">{w === 1 ? 'semana' : 'semanas'}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Days off inside that time. */}
              <section>
                <h3 className={section}>Folgas a saltar</h3>
                <div className={group}>
                  {daysOff.map((d) => (
                    <div key={d} className="flex h-[52px] items-center gap-3 px-4">
                      <span className="flex-1 font-subtitle text-[15px] capitalize text-onyx">
                        {new Date(`${d}T12:00:00`).toLocaleDateString('pt-PT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDaysOff((list) => list.filter((x) => x !== d))}
                        aria-label={`Remover a folga de ${d.split('-').reverse().join('/')}`}
                        className="text-lg text-onyx/35 hover:text-red-700"
                      >
                        <i className="bx bx-minus-circle" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <label className="relative flex h-[52px] items-center gap-2 px-4 font-subtitle text-[15px] text-onyx">
                    <i className="bx bx-plus-circle text-lg" aria-hidden="true" />
                    Adicionar folga
                    <input
                      type="date"
                      value=""
                      onChange={(e) => {
                        const d = e.target.value
                        if (d) setDaysOff((list) => (list.includes(d) ? list : [...list, d].sort()))
                      }}
                      aria-label="Dia de folga"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </section>

              {/* What will be created. */}
              <div className="rounded-2xl border border-onyx/10 p-4 text-center">
                <p className="font-subtitle text-3xl font-semibold lining-nums text-onyx">{times.length}</p>
                <p className="font-subtitle text-sm text-muted-dark">
                  {times.length === 0
                    ? 'Escolhe pelo menos um dia e uma hora.'
                    : `${times.length === 1 ? 'horário novo' : 'horários novos'} até ${lastDay!.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'long' })}`}
                </p>
              </div>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}
