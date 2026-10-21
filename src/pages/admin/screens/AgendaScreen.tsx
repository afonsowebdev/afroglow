import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, CalendarRange, CalendarX2, ChevronLeft, ChevronRight, History, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { customerWhatsappUrl } from '@/lib/site-config'
import type { AvailabilitySlot, Booking } from '@/lib/types'
import { cn } from '@/lib/utils'
import { GenerateSlotsSheet } from '../ScheduleTools'
import { useAdmin } from '../admin-context'
import {
  dateKey,
  dateParts,
  dayTitle,
  euros,
  getLisbonYearMonth,
  longDate,
  monthLabel,
  plural,
  telHref,
  todayKey,
} from '../format'
import {
  ActionSheet,
  Alert,
  BarButton,
  Cell,
  DateCell,
  EmptyState,
  IOSSheet,
  Screen,
  SearchField,
  Section,
  Segmented,
  plainInput,
  useToast,
} from '../ios'

type YearMonth = { year: number; month: number }
type Mode = 'sessoes' | 'horarios' | 'historico'
export interface Closure {
  id: string
  startDate: string
  endDate: string
  reason: string
}

const stepMonth = (value: YearMonth, delta: number): YearMonth => {
  const zero = value.month - 1 + delta
  return { year: value.year + Math.floor(zero / 12), month: (((zero % 12) + 12) % 12) + 1 }
}

const monthPrefix = (m: YearMonth) => `${m.year}-${String(m.month).padStart(2, '0')}`

function closedOn(key: string, closures: Closure[]) {
  return closures.find((c) => c.startDate <= key && key <= c.endDate) ?? null
}

/**
 * The month as a grid, Monday first, as in Calendar: today in the tint colour, the chosen day filled, and under each
 * day up to three dots for what is on it. Closed days are struck through.
 */
function MonthGrid({
  month,
  selected,
  onSelect,
  dots,
  closures,
  onMonth,
}: {
  month: YearMonth
  selected: string
  onSelect: (key: string) => void
  dots: (key: string) => string[]
  closures: Closure[]
  onMonth: (next: YearMonth) => void
}) {
  const days = new Date(month.year, month.month, 0).getDate()
  const lead = (new Date(month.year, month.month - 1, 1).getDay() + 6) % 7
  const prefix = monthPrefix(month)
  const today = todayKey()
  const isThisMonth = today.startsWith(prefix)
  return (
    <div className="rounded-[12px] bg-[var(--ios-cell)] px-2 pb-2 pt-1">
      <div className="flex items-center justify-between px-2">
        <p className="text-[17px] font-semibold">{monthLabel(month)}</p>
        <div className="flex items-center">
          {!isThisMonth && (
            <button
              type="button"
              onClick={() => {
                onMonth(getLisbonYearMonth(new Date()))
                onSelect(today)
              }}
              className="mr-1 h-11 px-2 text-[15px] text-[var(--ios-tint)] active:opacity-50"
            >
              Hoje
            </button>
          )}
          <button type="button" aria-label="Mês anterior" onClick={() => onMonth(stepMonth(month, -1))} className="flex size-11 items-center justify-center text-[var(--ios-tint)] active:opacity-50">
            <ChevronLeft className="size-6" strokeWidth={2.4} />
          </button>
          <button type="button" aria-label="Mês seguinte" onClick={() => onMonth(stepMonth(month, 1))} className="flex size-11 items-center justify-center text-[var(--ios-tint)] active:opacity-50">
            <ChevronRight className="size-6" strokeWidth={2.4} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[13px] font-semibold uppercase text-[var(--ios-tertiary)]">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div role="grid" aria-label={monthLabel(month)} className="grid grid-cols-7">
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
          const key = `${prefix}-${String(day).padStart(2, '0')}`
          const on = key === selected
          const isToday = key === today
          const closed = closedOn(key, closures)
          const marks = dots(key)
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              aria-label={`${day}${closed ? ', fechado' : ''}${marks.length ? `, ${marks.length} marcas` : ''}`}
              onClick={() => onSelect(key)}
              className="flex h-[52px] flex-col items-center justify-start pt-1"
            >
              <span
                className={cn(
                  'flex size-[34px] items-center justify-center rounded-full text-[19px] tabular-nums',
                  on && isToday && 'bg-[var(--ios-red)] font-semibold text-white',
                  on && !isToday && 'bg-[var(--ios-label)] font-semibold text-[var(--ios-cell)]',
                  !on && isToday && 'font-semibold text-[var(--ios-red)]',
                  !on && !isToday && key < today && 'text-[var(--ios-secondary)]',
                  closed && !on && 'text-[var(--ios-tertiary)] line-through',
                )}
              >
                {day}
              </span>
              <span className="mt-0.5 flex h-1.5 gap-[3px]">
                {marks.slice(0, 3).map((color, i) => (
                  <span key={i} className="size-[5px] rounded-full" style={{ background: color }} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SLOT_TIMES = Array.from({ length: 25 }, (_, i) => {
  const minutes = 8 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

/** "Abrir um dia": the day, then the times in three groups with one-tap presets. */
function OpenDaySheet({
  open,
  initialDate,
  slots,
  closures,
  onClose,
  onDone,
}: {
  open: boolean
  initialDate: string
  slots: AvailabilitySlot[]
  closures: Closure[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [date, setDate] = useState(initialDate)
  const [times, setTimes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDate(initialDate < todayKey() ? todayKey() : initialDate)
      setTimes([])
      setError(null)
    }
  }, [open, initialDate])

  const taken = new Set(slots.filter((s) => dateKey(s.startsAt) === date).map((s) => dateParts(s.startsAt).time))
  const closed = closedOn(date, closures)
  const groups = [
    { label: 'Manhã', times: SLOT_TIMES.filter((t) => t < '13:00') },
    { label: 'Tarde', times: SLOT_TIMES.filter((t) => t >= '13:00' && t < '18:00') },
    { label: 'Fim do dia', times: SLOT_TIMES.filter((t) => t >= '18:00') },
  ]
  const toggle = (t: string) => setTimes((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t].sort()))

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const startsAtList = times.map((time) => new Date(`${date}T${time}:00`).toISOString())
      const result = await api.post<{ created: unknown[]; skipped: number }>('/admin/availability/batch', { startsAtList })
      onDone(`${plural(result.created.length, 'horário aberto', 'horários abertos')} em ${longDate(date).toLowerCase()}`)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível abrir os horários.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <IOSSheet
      open={open}
      title="Abrir um dia"
      onClose={onClose}
      busy={busy}
      done={{ label: times.length > 1 ? `Abrir ${times.length}` : 'Abrir', onClick: () => void submit(), disabled: !times.length || Boolean(closed) }}
    >
      <Section footer={closed ? `Este dia está fechado${closed.reason ? ` (${closed.reason})` : ''}. Reabre-o em Dias fechados para abrir horários.` : undefined}>
        <DateCell label="Dia" type="date" value={date} min={todayKey()} display={longDate(date)} onChange={(v) => v && setDate(v)} />
      </Section>
      {error && <p className="mx-8 mt-3 text-[15px] text-[var(--ios-red)]">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2 px-4">
        {[
          { label: '09:00 e 14:00', run: () => setTimes(['09:00', '14:00'].filter((t) => !taken.has(t))) },
          { label: 'Manhã toda', run: () => setTimes((l) => [...new Set([...l, ...groups[0].times.filter((t) => !taken.has(t))])].sort()) },
          { label: 'Tarde toda', run: () => setTimes((l) => [...new Set([...l, ...groups[1].times.filter((t) => !taken.has(t))])].sort()) },
          { label: 'Limpar', run: () => setTimes([]) },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={preset.run}
            className="h-8 rounded-full bg-[var(--ios-fill)] px-3.5 text-[15px] text-[var(--ios-tint)] active:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>
      {groups.map((group) => (
        <Section key={group.label} header={group.label} flush>
          <div className="grid grid-cols-4 gap-2">
            {group.times.map((time) => {
              const isTaken = taken.has(time)
              const on = times.includes(time)
              return (
                <button
                  key={time}
                  type="button"
                  disabled={isTaken}
                  aria-pressed={on}
                  onClick={() => toggle(time)}
                  className={cn(
                    'h-11 rounded-[10px] text-[17px] tabular-nums transition-colors',
                    on ? 'bg-[var(--ios-tint)] font-semibold text-white dark:text-black' : 'bg-[var(--ios-cell)]',
                    isTaken && 'text-[var(--ios-tertiary)] line-through',
                  )}
                >
                  {time}
                </button>
              )
            })}
          </div>
        </Section>
      ))}
      <p className="mx-8 mt-4 text-[13px] text-[var(--ios-secondary)]">
        {times.length ? `Vais abrir: ${times.join(', ')}` : 'Toca nas horas a abrir. As riscadas já estão abertas.'}
      </p>
    </IOSSheet>
  )
}

export function AgendaScreen({ initialMode }: { initialMode?: string }) {
  const { bookings, slots, reload, push, can, newBooking, goTab } = useAdmin()
  const toast = useToast()
  const [mode, setMode] = useState<Mode>(initialMode === 'horarios' ? 'horarios' : 'sessoes')
  const [month, setMonth] = useState<YearMonth>(() => getLisbonYearMonth(new Date()))
  const [selected, setSelected] = useState(todayKey())
  const [search, setSearch] = useState('')
  const [closures, setClosures] = useState<Closure[]>([])
  const [menu, setMenu] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [slotMenu, setSlotMenu] = useState<AvailabilitySlot | null>(null)
  const [openDay, setOpenDay] = useState(false)
  const [openWeek, setOpenWeek] = useState(false)
  const [clearing, setClearing] = useState<{ slotCount: number; bookingCount: number } | null>(null)
  const [clearPassword, setClearPassword] = useState('')

  useEffect(() => {
    if (initialMode === 'horarios') setMode('horarios')
  }, [initialMode])

  useEffect(() => {
    api
      .get<{ current: Closure[]; past: Closure[] }>('/admin/closures')
      .then((data) => setClosures([...data.current, ...data.past]))
      .catch(() => {})
  }, [slots])

  // Changing month picks its first day (or today, in the current month).
  function changeMonth(next: YearMonth) {
    setMonth(next)
    const prefix = monthPrefix(next)
    setSelected(todayKey().startsWith(prefix) ? todayKey() : `${prefix}-01`)
  }
  function selectDay(key: string) {
    setSelected(key)
    const [y, m] = key.split('-').map(Number)
    if (y !== month.year || m !== month.month) setMonth({ year: y, month: m })
  }

  const prefix = monthPrefix(month)
  const live = bookings.filter((b) => b.status === 'ACCEPTED' || b.status === 'PENDING')
  const byDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of live) {
      const key = dateKey(b.slot.startsAt)
      map.set(key, [...(map.get(key) ?? []), b])
    }
    for (const list of map.values()) list.sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
    return map
  }, [live])
  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    for (const s of slots) {
      const key = dateKey(s.startsAt)
      map.set(key, [...(map.get(key) ?? []), s])
    }
    for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    return map
  }, [slots])

  const monthBookings = bookings.filter((b) => dateKey(b.slot.startsAt).startsWith(prefix))
  const monthConfirmed = monthBookings.filter((b) => b.status === 'ACCEPTED')
  const monthRevenue = monthConfirmed.reduce((sum, b) => sum + bookingPrice(b), 0)
  const monthSlots = slots.filter((s) => dateKey(s.startsAt).startsWith(prefix))

  const needle = search.trim().toLowerCase()
  const searchResults = needle
    ? live
        .filter(
          (b) =>
            b.customerName.toLowerCase().includes(needle) ||
            b.customerPhone.replace(/\s/g, '').includes(needle.replace(/\s/g, '')) ||
            b.service.name.toLowerCase().includes(needle),
        )
        .filter((b) => new Date(b.slot.startsAt).getTime() >= Date.now() - 86_400_000)
        .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
    : []

  const history = monthBookings
    .filter(
      (b) =>
        b.status === 'REJECTED' || b.status === 'CANCELLED' || (b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() < Date.now()),
    )
    .sort((a, b) => b.slot.startsAt.localeCompare(a.slot.startsAt))

  const dayBookings = byDay.get(selected) ?? []
  const daySlots = slotsByDay.get(selected) ?? []
  const closed = closedOn(selected, closures)

  async function cancelBooking(booking: Booking) {
    try {
      await api.post(`/admin/bookings/${booking.id}/cancel`)
      await reload()
      toast('Sessão cancelada')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível cancelar.', true)
    }
  }

  async function closeSlot(slot: AvailabilitySlot) {
    try {
      await api.delete(`/admin/availability/${slot.id}`)
      await reload()
      toast(`Horário das ${dateParts(slot.startsAt).time} fechado`)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível fechar o horário.', true)
    }
  }

  async function askClearMonth() {
    try {
      const summary = await api.get<{ slotCount: number; bookingCount: number }>(
        `/admin/maintenance/months/${month.year}/${month.month}/summary`,
      )
      setClearPassword('')
      setClearing(summary)
    } catch {
      toast('Não foi possível ver o resumo do mês.', true)
    }
  }

  async function clearMonth() {
    try {
      const result = await api.post<{ deletedBookings: number; deletedSlots: number }>(
        `/admin/maintenance/months/${month.year}/${month.month}/clear`,
        { password: clearPassword },
      )
      await reload()
      toast(`${monthLabel(month)} limpo: ${result.deletedSlots} horários, ${result.deletedBookings} marcações`)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível limpar o mês.', true)
    }
  }

  const sessionRow = (b: Booking, showDay = false) => (
    <Cell
      key={b.id}
      leading={
        <span className="flex w-12 flex-col">
          <span className="text-[17px] font-semibold tabular-nums">{dateParts(b.slot.startsAt).time}</span>
          {showDay && <span className="text-[11px] text-[var(--ios-secondary)]">{dateParts(b.slot.startsAt).day} {dateParts(b.slot.startsAt).month}</span>}
        </span>
      }
      title={
        <span className="flex items-center gap-1.5">
          <span
            className="h-4 w-1 shrink-0 rounded-full"
            style={{ background: b.status === 'PENDING' ? 'var(--ios-orange)' : 'var(--ios-tint)' }}
          />
          <span className="truncate">{b.customerName}</span>
        </span>
      }
      subtitle={`${b.status === 'PENDING' ? 'Por confirmar · ' : ''}${bookingName(b)}`}
      detail={euros(bookingPrice(b))}
      onClick={() => setMenu(b)}
      accessory="none"
    />
  )

  return (
    <Screen
      title="Agenda"
      subtitle={`${monthLabel(month)} · ${plural(monthConfirmed.length, 'sessão', 'sessões')} · ${euros(monthRevenue)}`}
      trailing={<BarButton label="Nova marcação" Icon={Plus} onClick={() => newBooking(null)} />}
    >
      <div className="px-4 pt-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'sessoes', label: 'Sessões' },
            { value: 'horarios', label: 'Horários' },
            { value: 'historico', label: 'Histórico' },
          ]}
        />
      </div>

      {mode === 'sessoes' && (
        <>
          <div className="px-4 pt-3">
            <SearchField value={search} onChange={setSearch} placeholder="Cliente, telemóvel ou modelo" />
          </div>
          {needle ? (
            <Section header={plural(searchResults.length, 'resultado', 'resultados')}>
              {searchResults.length ? (
                searchResults.map((b) => sessionRow(b, true))
              ) : (
                <Cell title="Nada encontrado" subtitle={`Nenhuma sessão corresponde a “${search.trim()}”.`} />
              )}
            </Section>
          ) : (
            <>
              <Section flush>
                <MonthGrid
                  month={month}
                  selected={selected}
                  onSelect={selectDay}
                  onMonth={changeMonth}
                  closures={closures}
                  dots={(key) =>
                    (byDay.get(key) ?? []).map((b) => (b.status === 'PENDING' ? 'var(--ios-orange)' : 'var(--ios-tint)'))
                  }
                />
              </Section>
              <Section
                header={`${dayTitle(`${selected}T12:00:00Z`)} · ${plural(dayBookings.length, 'sessão', 'sessões')}`}
                footer={closed ? `Dia fechado${closed.reason ? `: ${closed.reason}` : ''}.` : undefined}
              >
                {dayBookings.length ? (
                  dayBookings.map((b) => sessionRow(b))
                ) : (
                  <Cell
                    title={closed ? 'Estúdio fechado' : 'Sem sessões'}
                    subtitle={closed ? undefined : selected >= todayKey() ? 'Toca em + para marcar uma sessão neste dia.' : undefined}
                  />
                )}
              </Section>
              <div className="mt-4 flex justify-center gap-6 text-[13px] text-[var(--ios-secondary)]">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--ios-tint)]" /> Confirmada
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--ios-orange)]" /> Por confirmar
                </span>
              </div>
            </>
          )}
        </>
      )}

      {mode === 'horarios' && (
        <>
          <Section>
            <Cell Icon={CalendarRange} tint="green" title="Abrir a semana" subtitle="A tua rotina em várias semanas de uma vez" onClick={() => setOpenWeek(true)} />
            <Cell Icon={CalendarPlus} tint="blue" title="Abrir um dia" subtitle="Escolhe o dia e as horas" onClick={() => setOpenDay(true)} />
            <Cell Icon={CalendarX2} tint="red" title="Dias fechados e férias" subtitle="Feriados, folgas, férias" onClick={() => goTab('more', { name: 'closures' })} />
          </Section>
          <Section flush>
            <MonthGrid
              month={month}
              selected={selected}
              onSelect={selectDay}
              onMonth={changeMonth}
              closures={closures}
              dots={(key) => {
                const list = slotsByDay.get(key) ?? []
                if (!list.length) return []
                const free = list.filter((s) => s.status === 'OPEN').length
                return [free > 0 ? 'var(--ios-green)' : 'var(--ios-red)']
              }}
            />
          </Section>
          <Section
            header={`${dayTitle(`${selected}T12:00:00Z`)} · ${plural(daySlots.filter((s) => s.status === 'OPEN').length, 'livre', 'livres')}`}
            footer={
              closed
                ? `Dia fechado${closed.reason ? `: ${closed.reason}` : ''}. Os horários que restam não aparecem às clientes.`
                : 'Toca num horário livre para o fechar.'
            }
          >
            {daySlots.length === 0 ? (
              <Cell
                title={closed ? 'Estúdio fechado' : 'Sem horários'}
                subtitle={!closed && selected >= todayKey() ? 'Abre horários para este dia.' : undefined}
                tinted={!closed && selected >= todayKey()}
                onClick={!closed && selected >= todayKey() ? () => setOpenDay(true) : undefined}
              />
            ) : (
              daySlots.map((slot) => {
                const booking = live.find((b) => b.slotId === slot.id)
                const free = slot.status === 'OPEN'
                return (
                  <Cell
                    key={slot.id}
                    leading={<span className="w-12 text-[17px] font-semibold tabular-nums">{dateParts(slot.startsAt).time}</span>}
                    title={
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            background: free ? 'var(--ios-green)' : slot.status === 'PENDING' ? 'var(--ios-orange)' : 'var(--ios-red)',
                          }}
                        />
                        <span className={cn('truncate', free && 'text-[var(--ios-secondary)]')}>
                          {free ? 'Livre' : (booking?.customerName ?? 'Reservado')}
                        </span>
                      </span>
                    }
                    subtitle={!free ? (slot.status === 'PENDING' ? 'Por confirmar' : booking ? bookingName(booking) : undefined) : undefined}
                    onClick={free ? () => setSlotMenu(slot) : booking ? () => setMenu(booking) : undefined}
                    accessory="none"
                  />
                )
              })
            )}
          </Section>
          <p className="mx-8 mt-4 text-[13px] text-[var(--ios-secondary)]">
            Este mês: {monthSlots.filter((s) => s.status === 'OPEN').length} livres ·{' '}
            {monthSlots.filter((s) => s.status === 'PENDING').length} por confirmar ·{' '}
            {monthSlots.filter((s) => s.status === 'BOOKED').length} reservados
          </p>
          {monthSlots.length > 0 && (
            <Section footer="Apaga todos os horários e marcações do mês, sem avisar as clientes. Não pode ser desfeito.">
              <Cell Icon={Trash2} tint="red" title={`Limpar ${monthLabel(month)}…`} destructive onClick={() => void askClearMonth()} />
            </Section>
          )}
        </>
      )}

      {mode === 'historico' && (
        <>
          <div className="flex items-center justify-between px-4 pt-3">
            <button type="button" aria-label="Mês anterior" onClick={() => changeMonth(stepMonth(month, -1))} className="flex size-11 items-center justify-center text-[var(--ios-tint)]">
              <ChevronLeft className="size-6" strokeWidth={2.4} />
            </button>
            <p className="text-[17px] font-semibold">{monthLabel(month)}</p>
            <button type="button" aria-label="Mês seguinte" onClick={() => changeMonth(stepMonth(month, 1))} className="flex size-11 items-center justify-center text-[var(--ios-tint)]">
              <ChevronRight className="size-6" strokeWidth={2.4} />
            </button>
          </div>
          {history.length === 0 ? (
            <EmptyState Icon={History} title="Sem histórico" text="As sessões passadas, canceladas e recusadas deste mês aparecem aqui." />
          ) : (
            <Section>
              {history.map((b) => (
                <Cell
                  key={b.id}
                  leading={
                    <span className="flex w-10 flex-col items-center">
                      <span className="text-[17px] font-semibold leading-none tabular-nums">{dateParts(b.slot.startsAt).day}</span>
                      <span className="mt-0.5 text-[11px] uppercase text-[var(--ios-secondary)]">{dateParts(b.slot.startsAt).month}</span>
                    </span>
                  }
                  title={b.customerName}
                  subtitle={`${bookingName(b)} · ${dateParts(b.slot.startsAt).time}`}
                  detail={
                    <span
                      className={cn(
                        'text-[15px]',
                        b.status === 'REJECTED' && 'text-[var(--ios-red)]',
                        b.status === 'CANCELLED' && 'text-[var(--ios-orange)]',
                      )}
                    >
                      {b.status === 'ACCEPTED' ? euros(bookingPrice(b)) : b.status === 'CANCELLED' ? 'Cancelada' : 'Recusada'}
                    </span>
                  }
                  onClick={can('clientes') ? () => push({ name: 'customer', id: b.customerId }) : undefined}
                />
              ))}
            </Section>
          )}
        </>
      )}

      {/* A session's actions. */}
      <ActionSheet
        open={menu !== null}
        title={menu ? `${menu.customerName} · ${dayTitle(menu.slot.startsAt)} às ${dateParts(menu.slot.startsAt).time}` : undefined}
        onClose={() => setMenu(null)}
        actions={
          menu
            ? [
                ...(can('clientes') ? [{ label: 'Ver ficha da cliente', onClick: () => push({ name: 'customer', id: menu.customerId }) }] : []),
                {
                  label: 'WhatsApp',
                  onClick: () =>
                    window.open(customerWhatsappUrl(menu.customerPhone, `Olá ${menu.customerName}! Sobre a tua sessão de ${bookingName(menu)}...`), '_blank'),
                },
                { label: 'Ligar', onClick: () => (window.location.href = telHref(menu.customerPhone)) },
                ...(menu.status === 'PENDING'
                  ? [{ label: 'Responder ao pedido', onClick: () => goTab('requests') }]
                  : new Date(menu.slot.startsAt).getTime() > Date.now()
                    ? [{ label: 'Cancelar sessão', destructive: true, onClick: () => setCancelTarget(menu) }]
                    : []),
              ]
            : []
        }
      />
      <Alert
        open={cancelTarget !== null}
        title="Cancelar a sessão?"
        message={cancelTarget ? `${cancelTarget.customerName} recebe uma notificação e o horário fica livre.` : undefined}
        onClose={() => setCancelTarget(null)}
        buttons={[
          { label: 'Manter', style: 'cancel' },
          {
            label: 'Cancelar sessão',
            style: 'destructive',
            onClick: () => {
              const target = cancelTarget
              setCancelTarget(null)
              if (target) void cancelBooking(target)
            },
          },
        ]}
      />
      <ActionSheet
        open={slotMenu !== null}
        title={slotMenu ? `Horário livre · ${dayTitle(slotMenu.startsAt)} às ${dateParts(slotMenu.startsAt).time}` : undefined}
        onClose={() => setSlotMenu(null)}
        actions={
          slotMenu
            ? [
                { label: 'Marcar uma cliente aqui', onClick: () => newBooking(null) },
                { label: 'Fechar este horário', destructive: true, onClick: () => void closeSlot(slotMenu) },
              ]
            : []
        }
      />
      <Alert
        open={clearing !== null}
        title={`Limpar ${monthLabel(month)}?`}
        message={
          clearing
            ? `Apaga ${plural(clearing.slotCount, 'horário', 'horários')} e ${plural(clearing.bookingCount, 'marcação', 'marcações')}, aceites incluídas. As clientes não são avisadas.`
            : undefined
        }
        onClose={() => setClearing(null)}
        buttons={[
          { label: 'Cancelar', style: 'cancel' },
          {
            label: 'Apagar tudo',
            style: 'destructive',
            onClick: () => {
              setClearing(null)
              if (clearPassword) void clearMonth()
            },
          },
        ]}
      >
        <input
          type="password"
          value={clearPassword}
          onChange={(e) => setClearPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="A tua password"
          aria-label="A tua password"
          className={`${plainInput} h-9 w-full rounded-[8px] bg-[var(--ios-cell)] px-2.5 text-[15px]`}
        />
      </Alert>

      <OpenDaySheet
        open={openDay}
        initialDate={selected}
        slots={slots}
        closures={closures}
        onClose={() => setOpenDay(false)}
        onDone={(message) => {
          toast(message)
          void reload()
        }}
      />
      <GenerateSlotsSheet
        open={openWeek}
        onClose={() => setOpenWeek(false)}
        onDone={(message) => {
          toast(message)
          void reload()
        }}
      />
    </Screen>
  )
}
