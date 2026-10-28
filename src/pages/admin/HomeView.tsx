import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ActionButton } from '@/components/ui/action-button'
import { DraggableWidgetGrid, type WidgetItem, type WidgetSize } from '@/components/ui/draggable-widget-grid'
import { durationHours } from '@/lib/calendar'
import { tap } from '@/lib/haptics'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, ago, dayKey, plural, todayKey } from './admin-ui'

/*
 * The Início, made for the owner between two clients, as cards she arranges herself: who comes next, the business in
 * four figures (for the week or the month), today's agenda and what is left to answer. "Editar" lets her drag the
 * cards around (long press on the phone), make one bigger or smaller, hide it, or bring it back; the arrangement is
 * kept on this device. The full figures live in Estatísticas.
 */

const TZ = 'Europe/Lisbon'
const HOUR = 60 * 60 * 1000
const BROWN = '#2b1d12'
const GOLD = '#c9a84c'
const euros = (cents: number) => formatPrice(cents).replace(/,00/, '')
const time = (iso: string | number) => new Date(iso).toLocaleTimeString('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const monthOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7)
const monthName = (key: string) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', month: 'long' })
const firstName = (name: string) => name.trim().split(/\s+/)[0]
const endsAt = (b: Booking) => new Date(b.slot.startsAt).getTime() + durationHours(b.service.durationLabel) * HOUR

/** "1h30", "45 min", "3h". */
function lengthLabel(ms: number) {
  const minutes = Math.round(ms / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export function homeGreeting(name: string) {
  const hour = Number(new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  const hello = hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'
  const first = firstName(name)
  return first ? `${hello}, ${first}` : hello
}

/** "Terça-feira, 27 de outubro". */
export function homeDate() {
  return capital(new Date().toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }))
}

const link = 'font-subtitle text-sm font-medium text-muted-dark'

type Period = 'mes' | 'semana'
type CardId = 'proxima' | 'receita' | 'marcacoes' | 'pendentes' | 'ocupacao' | 'agenda' | 'resolver'

/** Every card, in its default place, with the sizes it can take (the first is the default). */
const CARDS: Array<{ id: CardId; label: string; sizes: WidgetSize[] }> = [
  { id: 'proxima', label: 'A seguir', sizes: ['wide', 'lg'] },
  { id: 'receita', label: 'Receita', sizes: ['sm', 'wide'] },
  { id: 'marcacoes', label: 'Marcações', sizes: ['sm', 'wide'] },
  { id: 'pendentes', label: 'Por confirmar', sizes: ['sm', 'wide'] },
  { id: 'ocupacao', label: 'Ocupação', sizes: ['sm', 'wide'] },
  { id: 'agenda', label: 'Agenda de hoje', sizes: ['lg', 'wide'] },
  { id: 'resolver', label: 'A resolver', sizes: ['wide', 'lg'] },
]
const cardOf = (id: string) => CARDS.find((c) => c.id === id)
const SPAN_AREA: Record<WidgetSize, number> = { sm: 1, wide: 2, tall: 2, lg: 4 }

interface Arrangement {
  order: Array<{ id: CardId; size: WidgetSize }>
  hidden: CardId[]
}

const STORE = 'afroglow.admin.inicio'
const DEFAULT: Arrangement = { order: CARDS.map(({ id, sizes }) => ({ id, size: sizes[0] })), hidden: [] }

/** The saved arrangement, with any card added since then put at the end. */
function loadArrangement(): Arrangement {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Arrangement | null
    if (!saved?.order) return DEFAULT
    const order = saved.order.filter((o) => cardOf(o.id)?.sizes.includes(o.size))
    for (const card of DEFAULT.order) if (!order.some((o) => o.id === card.id)) order.push(card)
    return { order, hidden: (saved.hidden ?? []).filter((id) => cardOf(id)) }
  } catch {
    return DEFAULT
  }
}

function saveArrangement(arrangement: Arrangement) {
  try {
    localStorage.setItem(STORE, JSON.stringify(arrangement))
  } catch {
    // Private mode or storage blocked: the arrangement just lasts until the app closes.
  }
}

export function HomeView({
  bookings,
  slots,
  testimonials,
  can,
  onOpen,
  onNewBooking,
}: {
  name: string
  bookings: Booking[]
  slots: AvailabilitySlot[]
  testimonials: Testimonial[]
  can: (permission: Permission) => boolean
  onOpen: (tab: 'pedidos' | 'agenda' | 'disponibilidade' | 'clientes' | MoreTarget) => void
  onNewBooking: (startsAt?: string) => void
}) {
  const [period, setPeriod] = useState<Period>('mes')
  const [editing, setEditing] = useState(false)
  const [arrangement, setArrangement] = useState(loadArrangement)
  const now = Date.now()
  const today = todayKey()
  const confirmed = bookings.filter((b) => b.status === 'ACCEPTED')
  const byStart = (a: Booking, b: Booking) => a.slot.startsAt.localeCompare(b.slot.startsAt)
  const todaySessions = confirmed.filter((b) => dayKey(b.slot.startsAt) === today).sort(byStart)
  const next = confirmed.filter((b) => new Date(b.slot.startsAt).getTime() >= now).sort(byStart)[0]
  const live = todaySessions.find((b) => new Date(b.slot.startsAt).getTime() <= now && now < endsAt(b))
  const pending = bookings.filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now).sort(byStart)
  const reviews = can('testemunhos') ? testimonials.filter((t) => t.status === 'PENDING') : []

  if (!can('marcacoes')) {
    return <p className="mt-6 font-subtitle text-sm text-muted-dark">Usa o menu em baixo para o que tens acesso.</p>
  }

  const figures = businessFigures({ period, bookings, confirmed, pending, slots, today, now })
  const canStats = can('estatisticas')

  const change = (next: Arrangement) => {
    setArrangement(next)
    saveArrangement(next)
  }
  const visible: Array<WidgetItem & { id: CardId }> = arrangement.order
    .filter((o) => !arrangement.hidden.includes(o.id))
    .map((o) => ({ ...o, label: cardOf(o.id)?.label }))
  // A new size or a hidden card lays the grid out afresh; a drag only reorders it.
  const gridKey = visible
    .map((o) => `${o.id}:${o.size}`)
    .sort()
    .join()

  const content = (id: CardId, size: WidgetSize): ReactNode => {
    switch (id) {
      case 'proxima':
        return <NextClient booking={live ?? next} inChair={!!live} now={now} today={today} size={size} onNewBooking={() => onNewBooking()} />
      case 'receita':
        return (
          <Figure
            label="Receita"
            icon="bx-euro"
            value={euros(figures.revenue)}
            note={
              figures.change === null ? (
                plural(figures.sessions, 'sessão', 'sessões')
              ) : (
                <span className={figures.change >= 0 ? 'text-[#3d7a5c]' : 'text-red-700'}>
                  {figures.change >= 0 ? '↗' : '↘'} {Math.abs(figures.change)}% face a {figures.versus}
                </span>
              )
            }
            onClick={canStats ? () => onOpen('estatisticas') : undefined}
          />
        )
      case 'marcacoes':
        return (
          <Figure
            label="Marcações"
            icon="bx-calendar-check"
            value={String(figures.sessions)}
            note={figures.newClients ? plural(figures.newClients, 'cliente nova', 'clientes novas') : 'Sem clientes novas'}
            onClick={canStats ? () => onOpen('estatisticas') : undefined}
          />
        )
      case 'pendentes':
        return (
          <Figure
            label="Por confirmar"
            icon="bx-time-five"
            value={String(pending.length)}
            note={
              pending.length === 0 ? (
                'Nenhum pedido à espera'
              ) : figures.urgent ? (
                <span className="text-[#b5652b]">{plural(figures.urgent, 'é para os próximos 2 dias', 'são para os próximos 2 dias')}</span>
              ) : (
                'Sem pressa para responder'
              )
            }
            onClick={() => onOpen('pedidos')}
          />
        )
      case 'ocupacao':
        return (
          <Figure
            label="Ocupação 7 dias"
            icon="bx-pie-chart-alt-2"
            value={figures.occupancy === null ? '–' : `${figures.occupancy}%`}
            note={
              <>
                <span className="mb-1.5 block h-1.5 overflow-hidden rounded-full bg-onyx/[0.07]">
                  <span className="block h-full rounded-full" style={{ width: `${figures.occupancy ?? 0}%`, background: GOLD }} />
                </span>
                {figures.occupancy === null
                  ? 'Sem horários abertos'
                  : figures.free
                    ? plural(figures.free, 'horário livre', 'horários livres')
                    : 'Semana cheia'}
              </>
            }
            onClick={() => onOpen('disponibilidade')}
          />
        )
      case 'agenda':
        return <TodayAgenda sessions={todaySessions} now={now} onOpen={() => onOpen('agenda')} onNewBooking={() => onNewBooking()} />
      case 'resolver':
        return <ToResolve pending={pending} reviews={reviews} onOpen={onOpen} />
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex rounded-full bg-onyx/[0.06] p-0.5" role="tablist" aria-label="Período dos números">
          {(
            [
              ['semana', 'Semana'],
              ['mes', 'Mês'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={period === id}
              onClick={() => setPeriod(id)}
              className={`h-8 rounded-full px-3.5 font-subtitle text-xs font-medium transition-colors ${
                period === id ? 'bg-white text-onyx shadow-sm' : 'text-muted-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            void tap()
            setEditing((current) => !current)
          }}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 font-subtitle text-xs font-semibold ${
            editing ? 'bg-onyx text-white' : 'glass-chip text-onyx'
          }`}
        >
          <i className={`bx ${editing ? 'bx-check' : 'bx-grid-alt'} text-base`} aria-hidden="true" />
          {editing ? 'Concluído' : 'Editar'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden px-1"
          >
            <p className="font-subtitle text-[13px] text-muted-dark">
              Mantém o dedo num cartão e arrasta para o mudar de lugar. Usa os botões no canto para o aumentar, diminuir ou
              esconder.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {arrangement.hidden.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => change({ ...arrangement, hidden: arrangement.hidden.filter((h) => h !== id) })}
                  className="glass-chip flex h-8 items-center gap-1 rounded-full pe-3.5 ps-2.5 font-subtitle text-xs text-onyx"
                >
                  <i className="bx bx-plus text-base" aria-hidden="true" />
                  {cardOf(id)?.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => change(DEFAULT)}
                className="h-8 px-2 font-subtitle text-xs text-muted-dark underline underline-offset-4"
              >
                Repor como estava
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DraggableWidgetGrid
        key={gridKey}
        items={visible}
        editable={editing}
        maxColumns={4}
        cellSize={170}
        gap={10}
        radius={24}
        onChange={(order) =>
          change({
            ...arrangement,
            order: [
              ...order.map(({ id, size }) => ({ id, size })),
              ...arrangement.order.filter((o) => arrangement.hidden.includes(o.id)),
            ],
          })
        }
        renderItem={(item, size) => {
          const card = cardOf(item.id)
          const sizeIndex = card?.sizes.indexOf(item.size) ?? 0
          const nextSize = card ? card.sizes[(sizeIndex + 1) % card.sizes.length] : item.size
          return (
            <>
              <div className={`flex h-full flex-col ${editing ? 'pointer-events-none' : ''}`}>{content(item.id, size)}</div>
              {editing && card && (
                <div className="absolute right-2 top-2 z-10 flex gap-1.5">
                  {card.sizes.length > 1 && (
                    <EditButton
                      label={SPAN_AREA[nextSize] > SPAN_AREA[item.size] ? `Aumentar ${card.label}` : `Diminuir ${card.label}`}
                      icon={SPAN_AREA[nextSize] > SPAN_AREA[item.size] ? 'bx-expand-alt' : 'bx-collapse-alt'}
                      onClick={() =>
                        change({
                          ...arrangement,
                          order: arrangement.order.map((o) => (o.id === item.id ? { ...o, size: nextSize } : o)),
                        })
                      }
                    />
                  )}
                  <EditButton
                    label={`Esconder ${card.label}`}
                    icon="bx-minus"
                    onClick={() => change({ ...arrangement, hidden: [...arrangement.hidden, item.id] })}
                  />
                </div>
              )}
            </>
          )
        }}
      />
    </div>
  )
}

/** A small round control in a card's corner while editing; it never starts a drag. */
function EditButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        void tap()
        onClick()
      }}
      className="flex size-8 items-center justify-center rounded-full bg-onyx text-base text-white shadow-md shadow-black/20"
    >
      <i className={`bx ${icon}`} aria-hidden="true" />
    </button>
  )
}

/** The four figures for this week or this month, against the same stretch of the one before. */
function businessFigures({
  period,
  bookings,
  confirmed,
  pending,
  slots,
  today,
  now,
}: {
  period: Period
  bookings: Booking[]
  confirmed: Booking[]
  pending: Booking[]
  slots: AvailabilitySlot[]
  today: string
  now: number
}) {
  // This week runs from Monday; last week is the seven days before it.
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  const weekStart = addDays(today, -weekday)
  const inThis = (iso: string) => {
    const key = dayKey(iso)
    return period === 'mes' ? monthOf(iso) === today.slice(0, 7) : key >= weekStart && key <= addDays(weekStart, 6)
  }
  const [y, m] = today.split('-').map(Number)
  const lastMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`
  const inBefore = (iso: string) => {
    const key = dayKey(iso)
    if (period === 'mes') return key.slice(0, 7) === lastMonth && Number(key.slice(8)) <= Number(today.slice(8))
    return key >= addDays(weekStart, -7) && key <= addDays(today, -7)
  }
  const sum = (list: Booking[]) => list.reduce((total, b) => total + bookingPrice(b), 0)

  const periodBookings = confirmed.filter((b) => inThis(b.slot.startsAt))
  const soFar = sum(confirmed.filter((b) => inThis(b.slot.startsAt) && dayKey(b.slot.startsAt) <= today))
  const before = sum(confirmed.filter((b) => inBefore(b.slot.startsAt)))

  // New clients: those whose first booking ever falls in this period.
  const firstOf = new Map<string, string>()
  bookings
    .filter((b) => b.status === 'ACCEPTED' || b.status === 'PENDING')
    .forEach((b) => {
      const seen = firstOf.get(b.customerId)
      if (!seen || b.slot.startsAt < seen) firstOf.set(b.customerId, b.slot.startsAt)
    })

  // How full the next seven days are, by times taken against times open.
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const taken = bookings.filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && week.includes(dayKey(b.slot.startsAt))).length
  const free = slots.filter((s) => s.status === 'OPEN' && week.includes(dayKey(s.startsAt)) && new Date(s.startsAt).getTime() > now).length

  return {
    revenue: sum(periodBookings),
    sessions: periodBookings.length,
    change: before ? Math.round(((soFar - before) / before) * 100) : null,
    versus: period === 'mes' ? monthName(lastMonth) : 'a semana passada',
    newClients: [...firstOf.values()].filter((iso) => inThis(iso)).length,
    urgent: pending.filter((b) => new Date(b.slot.startsAt).getTime() - now < 48 * HOUR).length,
    occupancy: taken + free ? Math.round((taken / (taken + free)) * 100) : null,
    free,
  }
}

/** "daqui a 40 min", "daqui a 2 h", "amanhã às 10:30", "sex, 30 out às 10:30". */
function untilLabel(iso: string, now: number, today: string) {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000)
  const key = dayKey(iso)
  if (key === today) return minutes <= 0 ? 'agora' : minutes < 60 ? `daqui a ${minutes} min` : `daqui a ${lengthLabel(minutes * 60_000)}`
  if (key === addDays(today, 1)) return `amanhã às ${time(iso)}`
  const day = new Date(iso).toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
  return `${day.replace(/\./g, '')} às ${time(iso)}`
}

/** Who is in the chair or comes next: what she booked and a way to reach her. */
function NextClient({
  booking,
  inChair,
  now,
  today,
  size,
  onNewBooking,
}: {
  booking: Booking | undefined
  inChair: boolean
  now: number
  today: string
  size: WidgetSize
  onNewBooking: () => void
}) {
  if (!booking) {
    return (
      <div className="flex h-full flex-col p-4">
        <p className="font-subtitle text-xs font-medium text-muted-dark">A seguir</p>
        <p className="mt-1.5 font-subtitle text-lg font-semibold leading-tight tracking-tight text-onyx">Ninguém marcado por agora</p>
        <p className="mt-1 line-clamp-2 font-subtitle text-xs text-muted-dark">Quando aceitares um pedido, a próxima cliente aparece aqui.</p>
        <div className="mt-auto">
          <ActionButton label="Nova marcação" icon="bx bx-plus" onClick={onNewBooking} />
        </div>
      </div>
    )
  }
  const start = new Date(booking.slot.startsAt).getTime()
  const end = endsAt(booking)
  const first = firstName(booking.customerName)
  const isToday = dayKey(booking.slot.startsAt) === today
  const big = size === 'lg'
  return (
    <div className="flex h-full flex-col p-4">
      <p className="flex items-center gap-2 font-subtitle text-xs font-medium text-muted-dark">
        <span className="size-2 rounded-full" style={{ background: GOLD }} aria-hidden="true" />
        {inChair ? `Na cadeira · termina às ${time(end)}` : `A seguir · ${untilLabel(booking.slot.startsAt, now, today)}`}
      </p>
      <div className={`flex items-start justify-between gap-3 ${big ? 'mt-4' : 'mt-2'}`}>
        <div className="min-w-0">
          <p className={`truncate font-subtitle font-semibold leading-tight tracking-tight text-onyx ${big ? 'text-[26px]' : 'text-xl'}`}>
            {booking.customerName}
          </p>
          <p className="mt-0.5 truncate font-subtitle text-xs text-muted-dark">
            {bookingName(booking)} · {lengthLabel(end - start)} · {euros(bookingPrice(booking))}
          </p>
        </div>
        {isToday && (
          <p className={`shrink-0 font-subtitle font-semibold lining-nums leading-none tracking-tight text-onyx ${big ? 'text-[34px]' : 'text-[26px]'}`}>
            {time(start)}
          </p>
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <ActionButton
          label="WhatsApp"
          icon="bx bxl-whatsapp"
          href={customerWhatsappUrl(booking.customerPhone, `Olá ${first}! Sobre a tua sessão de ${bookingName(booking)}...`)}
        />
        <ActionButton
          label="Ligar"
          variant="secondary"
          icon="bx bx-phone"
          onClick={() => {
            window.location.href = `tel:${booking.customerPhone.replace(/[^+\d]/g, '')}`
          }}
        />
      </div>
    </div>
  )
}

/** Today's sessions, each with where it stands; scrolls inside the card when the day is long. */
function TodayAgenda({
  sessions,
  now,
  onOpen,
  onNewBooking,
}: {
  sessions: Booking[]
  now: number
  onOpen: () => void
  onNewBooking: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-4 pb-1 pt-4">
        <p className="font-subtitle text-[15px] font-semibold tracking-tight text-onyx">Agenda de hoje</p>
        <button type="button" onClick={onOpen} className={link}>
          Ver agenda
        </button>
      </div>
      {sessions.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-5 text-center font-subtitle text-sm text-muted-dark">Dia livre, sem sessões marcadas.</p>
      ) : (
        <ol className="min-h-0 flex-1 divide-y divide-onyx/[0.07] overflow-y-auto">
          {sessions.map((b) => {
            const start = new Date(b.slot.startsAt).getTime()
            const end = endsAt(b)
            const state = end <= now ? 'feita' : start <= now ? 'agora' : 'confirmada'
            return (
              <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-11 shrink-0 font-subtitle text-sm font-semibold lining-nums text-muted-dark">{time(start)}</span>
                <span
                  aria-hidden="true"
                  className="h-9 w-[3px] shrink-0 rounded-full"
                  style={{ background: state === 'agora' ? GOLD : state === 'feita' ? 'color-mix(in srgb, var(--color-onyx) 15%, transparent)' : BROWN }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-subtitle text-sm font-semibold text-onyx">{b.customerName}</span>
                  <span className="block truncate font-subtitle text-xs text-muted-dark">
                    {bookingName(b)} · {lengthLabel(end - start)}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 font-subtitle text-[11px] font-semibold ${
                    state === 'confirmada' ? 'bg-onyx/[0.06] text-onyx' : state === 'feita' ? 'text-muted-dark' : ''
                  }`}
                  style={state === 'agora' ? { background: `${GOLD}2e`, color: '#8a6d1f' } : undefined}
                >
                  {state === 'agora' ? 'A decorrer' : state === 'feita' ? 'Feita ✓' : 'Confirmada'}
                </span>
              </li>
            )
          })}
        </ol>
      )}
      <div className="grid shrink-0 grid-cols-2 divide-x divide-onyx/[0.07] border-t border-onyx/[0.07]">
        <button type="button" onClick={onOpen} className="py-3 font-subtitle text-[13px] font-medium text-onyx">
          Calendário completo
        </button>
        <button
          type="button"
          onClick={onNewBooking}
          className="flex items-center justify-center gap-1 py-3 font-subtitle text-[13px] font-medium text-onyx"
        >
          <i className="bx bx-plus text-base" aria-hidden="true" />
          Nova marcação
        </button>
      </div>
    </div>
  )
}

/** The requests and testimonials waiting for her; scrolls inside the card. */
function ToResolve({
  pending,
  reviews,
  onOpen,
}: {
  pending: Booking[]
  reviews: Testimonial[]
  onOpen: (tab: 'pedidos' | MoreTarget) => void
}) {
  const count = pending.length + reviews.length
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-4 pb-1 pt-4">
        <p className="font-subtitle text-[15px] font-semibold tracking-tight text-onyx">
          A resolver
          {count > 0 && <span className="ml-1.5 font-normal text-muted-dark">{count}</span>}
        </p>
        {pending.length > 0 && (
          <button type="button" onClick={() => onOpen('pedidos')} className={link}>
            Ver todos
          </button>
        )}
      </div>
      {count === 0 ? (
        <p className="flex flex-1 items-center justify-center gap-2 px-5 font-subtitle text-sm text-muted-dark">
          <i className="bx bx-check-circle text-lg" aria-hidden="true" />
          Tudo em dia, nada à espera.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-onyx/[0.07] overflow-y-auto">
          {pending.map((b) => (
            <ToDo
              key={b.id}
              icon="bx-calendar-exclamation"
              title="Confirmar pedido de marcação"
              line={`${b.customerName} · enviado ${ago(b.createdAt)}`}
              onClick={() => onOpen('pedidos')}
            />
          ))}
          {reviews.map((t) => (
            <ToDo
              key={t.id}
              icon="bx-message-rounded-dots"
              title="Aprovar testemunho"
              line={`${t.customer.name} · ${ago(t.createdAt)}`}
              onClick={() => onOpen('testemunhos')}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ToDo({ icon, title, line, onClick }: { icon: string; title: string; line: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-lg text-onyx">
          <i className={`bx ${icon}`} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-subtitle text-sm font-semibold text-onyx">{title}</span>
          <span className="block truncate font-subtitle text-xs text-muted-dark">{line}</span>
        </span>
        <i className="bx bx-chevron-right text-lg text-onyx/30" aria-hidden="true" />
      </button>
    </li>
  )
}

function Figure({
  label,
  icon,
  value,
  note,
  onClick,
}: {
  label: string
  icon: string
  value: string
  note: ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" disabled={!onClick} onClick={onClick} className="flex h-full w-full flex-col p-4 text-left">
      <span className="flex items-start justify-between gap-2">
        <span className="font-subtitle text-xs text-muted-dark">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-base text-onyx">
          <i className={`bx ${icon}`} aria-hidden="true" />
        </span>
      </span>
      <span className="mt-1 font-subtitle text-[28px] font-semibold lining-nums leading-tight tracking-tight text-onyx">{value}</span>
      <span className="mt-auto pt-1.5 font-subtitle text-[11px] leading-snug text-muted-dark">{note}</span>
    </button>
  )
}
