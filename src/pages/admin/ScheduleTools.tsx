import { useEffect, useMemo, useState } from 'react'
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

const STORAGE_KEY = 'afroglow-admin-schedule-week'
// The studio's usual week: Monday, Tuesday and Friday closed; Wednesday and Saturday morning and afternoon;
// Thursday morning only; Sunday afternoon only.
const DEFAULT_PATTERN: Pattern = {
  week: {
    1: { am: false, pm: false },
    2: { am: false, pm: false },
    3: { am: true, pm: true },
    4: { am: true, pm: false },
    5: { am: false, pm: false },
    6: { am: true, pm: true },
    0: { am: false, pm: true },
  },
  amTime: '08:00',
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

const miniLabel = 'mb-1.5 block font-subtitle text-[11px] uppercase tracking-wide text-muted-dark'

/** A titled card that groups related fields. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-[1.5px] border-onyx/25 p-4">
      <h3 className="mb-3 font-subtitle text-sm font-semibold tracking-tight text-onyx">{title}</h3>
      {children}
    </section>
  )
}

/** One choice out of a few, as a glass chip. */
function Option({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 rounded-full font-subtitle text-sm text-onyx ${active ? 'glass-chip-on font-semibold' : 'glass-chip'}`}
    >
      {label}
    </button>
  )
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
  const [offInput, setOffInput] = useState('')
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

  return (
    <Sheet
      open={open}
      title="Horário semanal"
      description="Abre as semanas seguintes com a tua rotina. Os horários que já existem não são tocados."
      icon="bx bx-calendar-week"
      busy={busy}
      error={error}
      submitLabel={times.length ? `Criar ${times.length} horários` : 'Criar horários'}
      submitDisabled={times.length === 0}
      onSubmit={submit}
      onClose={onClose}
    >
      <Group title="Horas do dia">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block min-w-0">
            <span className={miniLabel}>Manhã</span>
            <input
              type="time"
              value={pattern.amTime}
              onChange={(e) => setPattern({ ...pattern, amTime: e.target.value })}
              className={`${sheetFieldClass} h-11 w-full min-w-0 appearance-none px-3 text-sm`}
            />
          </label>
          <label className="block min-w-0">
            <span className={miniLabel}>Tarde</span>
            <input
              type="time"
              value={pattern.pmTime}
              onChange={(e) => setPattern({ ...pattern, pmTime: e.target.value })}
              className={`${sheetFieldClass} h-11 w-full min-w-0 appearance-none px-3 text-sm`}
            />
          </label>
        </div>
        <p className="mt-2 font-subtitle text-xs text-muted-dark">Um cliente em cada hora.</p>
      </Group>

      <Group title="A tua semana">
        <ul className="divide-y divide-onyx/10">
          {WEEKDAYS.map((day) => {
            const shifts = pattern.week[day.id] ?? { am: false, pm: false }
            const closed = !shifts.am && !shifts.pm
            return (
              <li key={day.id} className="flex items-center gap-3 py-2.5">
                <span className="w-10 font-subtitle text-sm font-semibold text-onyx">{day.label}</span>
                <span className="flex-1 font-subtitle text-xs text-muted-dark">
                  {closed
                    ? 'Fechado'
                    : [shifts.am && pattern.amTime, shifts.pm && pattern.pmTime].filter(Boolean).join(' · ')}
                </span>
                {(['am', 'pm'] as const).map((shift) => (
                  <button
                    key={shift}
                    type="button"
                    aria-pressed={shifts[shift]}
                    onClick={() => toggleShift(day.id, shift)}
                    className={`h-10 w-[4.5rem] rounded-full font-subtitle text-xs ${
                      shifts[shift] ? 'glass-chip-on font-semibold text-onyx' : 'glass-chip text-onyx/50'
                    }`}
                  >
                    {shift === 'am' ? 'Manhã' : 'Tarde'}
                  </button>
                ))}
              </li>
            )
          })}
        </ul>

        <span className={`${miniLabel} mt-4`}>Para as próximas (semanas)</span>
        <div className="grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 6, 8].map((w) => (
            <Option
              key={w}
              active={pattern.weeks === w}
              onClick={() => setPattern({ ...pattern, weeks: w })}
              label={String(w)}
            />
          ))}
        </div>
      </Group>

      <Group title="Folgas (dias a saltar)">
        <div className="flex items-stretch gap-2">
          <input
            type="date"
            value={offInput}
            onChange={(e) => setOffInput(e.target.value)}
            aria-label="Dia a saltar"
            className={`${sheetFieldClass} h-11 w-full min-w-0 appearance-none px-3 text-sm min-w-0 flex-1`}
          />
          <button
            type="button"
            disabled={!offInput || daysOff.includes(offInput)}
            onClick={() => {
              setDaysOff((list) => [...list, offInput].sort())
              setOffInput('')
            }}
            className="glass-chip h-11 shrink-0 rounded-xl px-3 font-subtitle text-sm text-onyx disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
        {daysOff.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {daysOff.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDaysOff((list) => list.filter((x) => x !== d))}
                aria-label={`Remover ${d.split('-').reverse().join('/')}`}
                className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 font-subtitle text-xs text-onyx"
              >
                {d.split('-').reverse().join('/')}
                <i className="bx bx-x text-base" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </Group>

      <p className="text-center font-subtitle text-sm text-muted-dark">
        {times.length > 0
          ? `${times.length} ${times.length === 1 ? 'horário' : 'horários'} até ${times[times.length - 1].toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}`
          : 'Escolhe os dias e as horas para ver quantos horários cria.'}
      </p>
    </Sheet>
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
