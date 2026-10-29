import { Fragment, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CalendarRange, Check, Plus, Sunrise, Sunset, X } from 'lucide-react'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { cn } from '@/lib/utils'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import type { AvailabilitySlot } from '@/lib/types'

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
  // The page behind stays still while the sheet is open.
  useScrollLock(open)

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
  const label = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'
  const openDays = WEEKDAYS.filter((d) => pattern.week[d.id]?.am || pattern.week[d.id]?.pm).length

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="Abrir semanas"
            onSubmit={(e) => {
              e.preventDefault()
              if (times.length && !busy) void submit()
            }}
            className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center gap-3 px-5 pb-3 pt-5">
              <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx">
                <CalendarRange size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">Abrir semanas</h2>
                <p className="truncate font-subtitle text-xs text-muted-dark">A tua rotina, de uma vez. O que já existe fica.</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                disabled={busy}
                className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">
              {error && (
                <p role="alert" className="rounded-2xl px-4 py-3 font-subtitle text-sm text-onyx" style={{ background: 'color-mix(in srgb, var(--c-cancelled) 12%, transparent)' }}>
                  {error}
                </p>
              )}

              {/* The two times of the day, side by side; a tap changes one. */}
              <section>
                <p className={label}>Horas · uma cliente em cada</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['Manhã', 'amTime', Sunrise],
                      ['Tarde', 'pmTime', Sunset],
                    ] as const
                  ).map(([name, field, Icon]) => (
                    <label key={field} className="glass-chip relative flex h-12 items-center gap-2.5 rounded-full px-4">
                      <Icon size={16} className="text-ink-3" />
                      <span className="flex-1 font-subtitle text-[13px] text-muted-dark">{name}</span>
                      <span className="tabular font-subtitle text-[16px] font-semibold text-onyx">{pattern[field]}</span>
                      <input
                        type="time"
                        value={pattern[field]}
                        onChange={(e) => setPattern({ ...pattern, [field]: e.target.value })}
                        aria-label={`Hora da ${name.toLowerCase()}`}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                    </label>
                  ))}
                </div>
              </section>

              {/* The week as a small grid: a day per column, the morning and the afternoon as two rows. */}
              <section>
                <p className={label}>
                  A tua semana · {openDays} {openDays === 1 ? 'dia aberto' : 'dias abertos'}
                </p>
                <div className="rounded-[22px] bg-onyx/[0.04] p-2.5">
                  <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] items-center gap-1.5">
                    <span />
                    {WEEKDAYS.map((day) => (
                      <span key={day.id} className="text-center font-subtitle text-[11px] font-semibold text-muted-dark">
                        {day.label}
                      </span>
                    ))}
                    {(['am', 'pm'] as const).map((shift) => (
                      <Fragment key={shift}>
                        <span className="font-subtitle text-[11px] text-muted-dark">{shift === 'am' ? 'Manhã' : 'Tarde'}</span>
                        {WEEKDAYS.map((day) => {
                          const on = !!pattern.week[day.id]?.[shift]
                          return (
                            <button
                              key={day.id}
                              type="button"
                              aria-pressed={on}
                              aria-label={`${DAY_NAMES[day.id]}, ${shift === 'am' ? 'manhã' : 'tarde'}`}
                              onClick={() => toggleShift(day.id, shift)}
                              className={cn(
                                'flex h-9 items-center justify-center rounded-xl transition-colors',
                                on ? '' : 'bg-white/70 text-transparent shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] dark:bg-onyx/[0.06]',
                              )}
                              // Open: a soft green, the colour of a free time.
                              style={
                                on
                                  ? {
                                      background: 'color-mix(in srgb, var(--c-confirmed) 18%, transparent)',
                                      color: 'var(--c-confirmed)',
                                      boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--c-confirmed) 45%, transparent)',
                                    }
                                  : undefined
                              }
                            >
                              <Check size={14} strokeWidth={3} />
                            </button>
                          )
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </section>

              {/* For how long. */}
              <section>
                <p className={label}>Durante</p>
                <div className="grid grid-cols-6 rounded-full bg-onyx/[0.06] p-1" role="radiogroup" aria-label="Semanas">
                  {[1, 2, 3, 4, 6, 8].map((w) => (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={pattern.weeks === w}
                      onClick={() => setPattern({ ...pattern, weeks: w })}
                      className={cn(
                        'flex h-9 items-center justify-center gap-0.5 rounded-full font-subtitle text-[13px] transition-colors',
                        pattern.weeks === w
                          ? 'bg-white font-semibold text-onyx shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-onyx/[0.16]'
                          : 'text-muted-dark',
                      )}
                    >
                      {w}
                      <span className="text-[10px] font-normal">sem</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Days off inside that time, as chips. */}
              <section>
                <p className={label}>Folgas a saltar</p>
                <div className="flex flex-wrap gap-2">
                  {daysOff.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysOff((list) => list.filter((x) => x !== d))}
                      aria-label={`Remover a folga de ${d.split('-').reverse().join('/')}`}
                      className="glass-chip flex h-9 items-center gap-1.5 rounded-full pe-2 ps-3.5 font-subtitle text-[12px] font-medium text-onyx"
                    >
                      {new Date(`${d}T12:00:00`).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      <X size={13} className="text-muted-dark" />
                    </button>
                  ))}
                  <label className="glass-chip relative flex h-9 items-center gap-1.5 rounded-full px-3.5 font-subtitle text-[12px] font-semibold text-onyx">
                    <Plus size={14} strokeWidth={2.4} />
                    Folga
                    <input
                      type="date"
                      value=""
                      onChange={(e) => {
                        const d = e.target.value
                        if (d) setDaysOff((list) => (list.includes(d) ? list : [...list, d].sort()))
                      }}
                      aria-label="Dia de folga"
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </section>
            </div>

            {/* The button, plain: a white pill with the cards' shadow, what it opens and until when, the arrow in a round chip. */}
            <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]">
              <button
                type="submit"
                disabled={busy || times.length === 0}
                className="flex h-14 w-full items-center gap-3 rounded-full bg-card pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-45"
                style={{ boxShadow: '0px 1px 3px 0px rgba(0,0,0,0.08), 0px 12px 32px -10px rgba(0,0,0,0.2)' }}
              >
                <CalendarRange size={19} className="shrink-0 text-onyx" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-subtitle text-[15px] font-semibold leading-tight text-onyx">
                    {busy ? 'A abrir…' : times.length === 0 ? 'Escolhe pelo menos um dia' : `Abrir ${times.length} ${times.length === 1 ? 'horário' : 'horários'}`}
                  </span>
                  {times.length > 0 && (
                    <span className="block truncate font-subtitle text-[12px] text-muted-dark">
                      {openDays} {openDays === 1 ? 'dia' : 'dias'} por semana · até{' '}
                      {lastDay!.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')}
                    </span>
                  )}
                </span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                  <ArrowRight size={18} />
                </span>
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Closes a whole day (holiday, day off): removes its still-open slots. Booked ones are never touched. */
export function BlockDaySheet({
  open,
  slots,
  onClose,
  onDone,
}: {
  open: boolean
  slots: AvailabilitySlot[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDate(dateValue(new Date()))
      setError(null)
    }
  }, [open])

  const onThatDay = slots.filter((s) => dateValue(new Date(s.startsAt)) === date)
  const open_ = onThatDay.filter((s) => s.status === 'OPEN')
  const taken = onThatDay.length - open_.length

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      for (const slot of open_) await api.delete(`/admin/availability/${slot.id}`)
      onDone(`Dia fechado: ${open_.length} horários removidos.`)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao fechar o dia.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title="Fechar um dia"
      description="Remove os horários livres desse dia, por exemplo num feriado ou nas férias."
      icon="bx bx-calendar-x"
      destructive
      busy={busy}
      error={error}
      submitLabel="Fechar dia"
      submitDisabled={open_.length === 0}
      onSubmit={submit}
      onClose={onClose}
    >
      <SheetField label="Dia">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={sheetFieldClass} />
      </SheetField>
      <p className="font-subtitle text-sm text-onyx">
        {open_.length === 0 ? 'Não há horários livres neste dia.' : `${open_.length} horários livres serão removidos.`}
        {taken > 0 && ` ${taken} com marcação ou pedido ficam como estão — trata deles em Pedidos ou Agenda.`}
      </p>
    </Sheet>
  )
}
