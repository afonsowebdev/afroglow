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
      <div>
        <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
          Dias da semana
        </span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={pattern.days.includes(day.id)}
              onClick={() => toggleDay(day.id)}
              className={`rounded-full px-3.5 py-2 font-subtitle text-sm transition-colors ${
                pattern.days.includes(day.id) ? 'glass-chip-on text-onyx' : 'glass-chip text-onyx'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SheetField label="Primeira hora">
          <input
            type="time"
            value={pattern.from}
            onChange={(e) => setPattern({ ...pattern, from: e.target.value })}
            className={sheetFieldClass}
          />
        </SheetField>
        <SheetField label="Até às">
          <input
            type="time"
            value={pattern.to}
            onChange={(e) => setPattern({ ...pattern, to: e.target.value })}
            className={sheetFieldClass}
          />
        </SheetField>
        <SheetField label="Uma vaga a cada">
          <select
            value={pattern.everyMinutes}
            onChange={(e) => setPattern({ ...pattern, everyMinutes: Number(e.target.value) })}
            className={sheetFieldClass}
          >
            {[60, 90, 120, 180, 240, 360].map((m) => (
              <option key={m} value={m}>
                {m / 60} h
              </option>
            ))}
          </select>
        </SheetField>
        <SheetField label="Para as próximas">
          <select
            value={pattern.weeks}
            onChange={(e) => setPattern({ ...pattern, weeks: Number(e.target.value) })}
            className={sheetFieldClass}
          >
            {[1, 2, 3, 4, 6, 8].map((w) => (
              <option key={w} value={w}>
                {w} {w === 1 ? 'semana' : 'semanas'}
              </option>
            ))}
          </select>
        </SheetField>
      </div>

      <div>
        <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
          Folgas (dias a saltar)
        </span>
        <div className="flex gap-2">
          <input
            type="date"
            value={offInput}
            onChange={(e) => setOffInput(e.target.value)}
            className={sheetFieldClass}
          />
          <button
            type="button"
            disabled={!offInput || daysOff.includes(offInput)}
            onClick={() => {
              setDaysOff((list) => [...list, offInput].sort())
              setOffInput('')
            }}
            className="shrink-0 rounded-xl glass-chip px-4 font-subtitle text-sm text-onyx disabled:opacity-40"
          >
            Adicionar
          </button>
        </div>
        {daysOff.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {daysOff.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDaysOff((list) => list.filter((x) => x !== d))}
                className="rounded-full bg-onyx/5 px-3 py-1 font-subtitle text-xs text-onyx"
              >
                {d.split('-').reverse().join('/')} ✕
              </button>
            ))}
          </div>
        )}
      </div>
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
