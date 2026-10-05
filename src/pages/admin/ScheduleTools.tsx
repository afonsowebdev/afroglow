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

interface Pattern {
  days: number[]
  from: string
  to: string
  everyMinutes: number
  weeks: number
}

const STORAGE_KEY = 'afroglow-admin-schedule-pattern'
const DEFAULT_PATTERN: Pattern = { days: [2, 3, 4, 5, 6], from: '09:00', to: '18:00', everyMinutes: 120, weeks: 4 }

function loadPattern(): Pattern {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_PATTERN, ...(JSON.parse(raw) as Partial<Pattern>) }
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
  const start = toMinutes(pattern.from)
  const end = toMinutes(pattern.to)
  if (!(pattern.everyMinutes >= 30) || end <= start) return times
  const now = new Date()
  for (let offset = 0; offset < pattern.weeks * 7; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    if (!pattern.days.includes(day.getDay()) || daysOff.includes(dateValue(day))) continue
    for (let minutes = start; minutes < end; minutes += pattern.everyMinutes) {
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

  const toggleDay = (id: number) =>
    setPattern((p) => ({ ...p, days: p.days.includes(id) ? p.days.filter((d) => d !== id) : [...p.days, id] }))

  return (
    <Sheet
      open={open}
      title="Horário semanal"
      description="Abre vários dias de uma vez. Os horários que já existem não são tocados."
      icon="bx bx-calendar-week"
      busy={busy}
      error={error}
      submitLabel={times.length ? `Criar ${times.length} horários` : 'Criar horários'}
      submitDisabled={times.length === 0}
      onSubmit={submit}
      onClose={onClose}
    >
      <Group title="Dias da semana">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={pattern.days.includes(day.id)}
              onClick={() => toggleDay(day.id)}
              className={`h-11 rounded-full font-subtitle text-xs ${
                pattern.days.includes(day.id) ? 'glass-chip-on font-semibold text-onyx' : 'glass-chip text-onyx'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Horas">
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block min-w-0">
            <span className={miniLabel}>Primeira hora</span>
            <input
              type="time"
              value={pattern.from}
              onChange={(e) => setPattern({ ...pattern, from: e.target.value })}
              className={`${sheetFieldClass} h-11 w-full min-w-0 appearance-none px-3 text-sm`}
            />
          </label>
          <label className="block min-w-0">
            <span className={miniLabel}>Até às</span>
            <input
              type="time"
              value={pattern.to}
              onChange={(e) => setPattern({ ...pattern, to: e.target.value })}
              className={`${sheetFieldClass} h-11 w-full min-w-0 appearance-none px-3 text-sm`}
            />
          </label>
        </div>

        <span className={`${miniLabel} mt-4`}>Uma vaga a cada</span>
        <div className="grid grid-cols-6 gap-1.5">
          {[60, 90, 120, 180, 240, 360].map((m) => (
            <Option
              key={m}
              active={pattern.everyMinutes === m}
              onClick={() => setPattern({ ...pattern, everyMinutes: m })}
              label={m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`}
            />
          ))}
        </div>

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
