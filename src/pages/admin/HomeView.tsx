import { useState } from 'react'
import { durationHours } from '@/lib/calendar'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { serviceImageUrls } from '@/lib/service-images'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, dayKey, plural, todayKey } from './admin-ui'

/*
 * The Início, made for the owner between two clients. At the top, who comes next over the photo of her hairstyle;
 * then the requests to answer right there; today as a timeline where a long braiding session looks long; the week as
 * how full each day is; and the month as one figure against the last. The full figures live in Estatísticas.
 */

const TZ = 'Europe/Lisbon'
const HOUR = 60 * 60 * 1000
const BROWN = '#2b1d12'
const GOLD = '#c9a84c'
const euros = (cents: number) => formatPrice(cents).replace(/,00/, '')
const time = (iso: string | number) => new Date(iso).toLocaleTimeString('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const weekdayOf = (key: string, style: 'long' | 'short') =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: style }).replace('.', '').split('-')[0]
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const monthOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7)
const monthName = (key: string) => capital(new Date(`${key}-15T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', month: 'long' }))
const firstName = (name: string) => name.trim().split(/\s+/)[0]
const endsAt = (b: Booking) => new Date(b.slot.startsAt).getTime() + durationHours(b.service.durationLabel) * HOUR

/** "1 h 30", "45 min", "3 h". */
function lengthLabel(ms: number) {
  const minutes = Math.round(ms / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export function homeGreeting(name: string) {
  const hour = Number(new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  const hello = hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'
  const first = firstName(name)
  return first ? `${hello}, ${first}` : hello
}

/** "Quarta-feira, 21 de outubro". */
export function homeDate() {
  return capital(new Date().toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }))
}

/** "daqui a 2 h", "daqui a 25 min", "amanhã", "sexta-feira". */
function untilLabel(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  const key = dayKey(iso)
  if (key === todayKey()) {
    if (minutes <= 0) return 'agora'
    if (minutes < 60) return `daqui a ${minutes} min`
    return `daqui a ${Math.round(minutes / 60)} h`
  }
  if (key === addDays(todayKey(), 1)) return 'amanhã'
  return weekdayOf(key, 'long')
}

/** "sáb, 12 out · 14:00". */
function whenLabel(iso: string) {
  const key = dayKey(iso)
  const day = new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
  return `${day.replace(/\./g, '')} · ${time(iso)}`
}

const heading = 'font-subtitle text-lg font-semibold tracking-tight text-onyx'

export function HomeView({
  bookings,
  slots,
  testimonials,
  can,
  onOpen,
  onNewBooking,
  busyId,
  onDecision,
}: {
  name: string
  bookings: Booking[]
  slots: AvailabilitySlot[]
  testimonials: Testimonial[]
  can: (permission: Permission) => boolean
  onOpen: (tab: 'pedidos' | 'agenda' | 'disponibilidade' | 'clientes' | MoreTarget) => void
  onNewBooking: (startsAt?: string) => void
  busyId: string | null
  onDecision: (id: string, decision: 'accept' | 'reject') => void
}) {
  const now = Date.now()
  const today = todayKey()
  const confirmed = bookings.filter((b) => b.status === 'ACCEPTED')
  const byStart = (a: Booking, b: Booking) => a.slot.startsAt.localeCompare(b.slot.startsAt)
  const todaySessions = confirmed.filter((b) => dayKey(b.slot.startsAt) === today).sort(byStart)
  // Still going or yet to come, nearest first: the cards at the top.
  const upcoming = confirmed.filter((b) => endsAt(b) > now).sort(byStart).slice(0, 4)
  const pending = bookings.filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now).sort(byStart)
  const pendingTestimonials = can('testemunhos') ? testimonials.filter((t) => t.status === 'PENDING').length : 0

  if (!can('marcacoes')) {
    return <p className="mt-6 font-subtitle text-sm text-muted-dark">Usa o menu em baixo para o que tens acesso.</p>
  }

  return (
    <div className="mt-6 flex flex-col gap-10">
      <NextUp upcoming={upcoming} now={now} onNewBooking={() => onNewBooking()} />

      {(pending.length > 0 || pendingTestimonials > 0) && (
        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className={heading}>
              {pending.length ? `${plural(pending.length, 'pedido espera', 'pedidos esperam')} por ti` : 'Para rever'}
            </h2>
            {pending.length > 0 && (
              <button type="button" onClick={() => onOpen('pedidos')} className="font-subtitle text-sm text-muted-dark">
                Ver todos
              </button>
            )}
          </div>
          {pending.length > 0 && (
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
              {pending.map((b) => (
                <RequestCard key={b.id} booking={b} busy={busyId === b.id} onDecision={onDecision} />
              ))}
            </div>
          )}
          {pendingTestimonials > 0 && (
            <button
              type="button"
              onClick={() => onOpen('testemunhos')}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-onyx/10 bg-white px-4 py-3 text-left shadow-sm shadow-black/5"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-onyx/5 text-lg text-onyx">
                <i className="bx bx-message-rounded-dots" aria-hidden="true" />
              </span>
              <span className="flex-1 font-subtitle text-sm text-onyx">
                {pendingTestimonials === 1 ? 'Uma cliente deixou um testemunho' : `${pendingTestimonials} clientes deixaram testemunhos`}
              </span>
              <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
            </button>
          )}
        </section>
      )}

      <Today sessions={todaySessions} now={now} onOpen={onOpen} onNewBooking={onNewBooking} />

      <Week bookings={bookings} slots={slots} today={today} onOpen={() => onOpen('agenda')} />

      <Month confirmed={confirmed} enabled={can('estatisticas')} onOpen={() => onOpen('estatisticas')} />
    </div>
  )
}

/** Who comes next, over the photo of her hairstyle; swipe for the ones after. */
function NextUp({ upcoming, now, onNewBooking }: { upcoming: Booking[]; now: number; onNewBooking: () => void }) {
  if (upcoming.length === 0) {
    return (
      <section className="overflow-hidden rounded-[28px] p-6 text-[#ffffff]" style={{ background: BROWN }}>
        <p className="font-subtitle text-sm" style={{ color: GOLD }}>
          Agenda livre
        </p>
        <p className="mt-2 font-subtitle text-2xl font-semibold leading-tight tracking-tight">Ninguém marcado por agora.</p>
        <p className="mt-1 font-subtitle text-sm text-[#ffffff]/70">Abre horários ou marca tu uma cliente.</p>
        <button
          type="button"
          onClick={onNewBooking}
          className="mt-5 flex h-11 items-center gap-2 rounded-full bg-[#ffffff] px-5 font-subtitle text-sm font-semibold text-[#1a1008]"
        >
          <i className="bx bx-plus text-lg" aria-hidden="true" />
          Nova marcação
        </button>
      </section>
    )
  }

  return (
    <section className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 [scrollbar-width:none]">
      {upcoming.map((b, index) => {
        const photo = serviceImageUrls(b.service)[0]
        const start = new Date(b.slot.startsAt).getTime()
        const inChair = start <= now
        return (
          <article
            key={b.id}
            className={`relative flex h-72 shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[28px] p-5 text-[#ffffff] ${
              upcoming.length > 1 ? 'w-[86%]' : 'w-full'
            }`}
            style={{ background: BROWN }}
          >
            {photo && <img src={photo} alt="" className="absolute inset-0 size-full object-cover" />}
            {/* Dark at the top and the bottom so the words read over any photo. */}
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: `linear-gradient(to bottom, ${BROWN}cc 0%, ${BROWN}33 35%, ${BROWN}55 55%, ${BROWN}f2 100%)` }}
            />

            <div className="relative flex items-center justify-between">
              <span
                className="rounded-full px-3 py-1 font-subtitle text-xs font-semibold"
                style={{ background: inChair ? GOLD : `${GOLD}2e`, color: inChair ? BROWN : GOLD }}
              >
                {inChair ? 'Na cadeira agora' : index === 0 ? `A seguir · ${untilLabel(b.slot.startsAt)}` : capital(untilLabel(b.slot.startsAt))}
              </span>
              <span className="font-subtitle text-xs text-[#ffffff]/70">{durationLabelOf(b)}</span>
            </div>

            <div className="relative">
              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-subtitle text-[26px] font-semibold leading-tight tracking-tight">{b.customerName}</p>
                  <p className="mt-0.5 truncate font-subtitle text-sm text-[#ffffff]/75">{bookingName(b)}</p>
                </div>
                <p className="shrink-0 font-subtitle text-[34px] font-semibold lining-nums leading-none tracking-tight">{time(b.slot.startsAt)}</p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <a
                  href={customerWhatsappUrl(b.customerPhone, `Olá ${firstName(b.customerName)}! Sobre a tua sessão de ${bookingName(b)}...`)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`WhatsApp a ${firstName(b.customerName)}`}
                  className="flex size-11 items-center justify-center rounded-full bg-[#ffffff]/15 text-xl backdrop-blur-md"
                >
                  <i className="bx bxl-whatsapp" aria-hidden="true" />
                </a>
                <a
                  href={`tel:${b.customerPhone.replace(/[^+\d]/g, '')}`}
                  aria-label={`Ligar a ${firstName(b.customerName)}`}
                  className="flex size-11 items-center justify-center rounded-full bg-[#ffffff]/15 text-xl backdrop-blur-md"
                >
                  <i className="bx bx-phone" aria-hidden="true" />
                </a>
                <span className="ml-auto font-subtitle text-lg font-semibold lining-nums" style={{ color: GOLD }}>
                  {euros(bookingPrice(b))}
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}

const durationLabelOf = (b: Booking) => `${lengthLabel(durationHours(b.service.durationLabel) * HOUR)} de sessão`

/** A request to answer without leaving the Início: accept, or refuse after a second tap. */
function RequestCard({
  booking,
  busy,
  onDecision,
}: {
  booking: Booking
  busy: boolean
  onDecision: (id: string, decision: 'accept' | 'reject') => void
}) {
  const [refusing, setRefusing] = useState(false)
  const photo = serviceImageUrls(booking.service)[0]
  return (
    <article className="w-[78%] max-w-80 shrink-0 snap-start overflow-hidden rounded-3xl border border-onyx/10 bg-white shadow-sm shadow-black/5">
      <div className="flex items-center gap-3 p-4">
        {photo ? (
          <img src={photo} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-onyx/5 font-subtitle text-xl font-semibold text-onyx">
            {booking.customerName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-subtitle text-base font-semibold text-onyx">{booking.customerName}</p>
          <p className="truncate font-subtitle text-xs text-muted-dark">{bookingName(booking)}</p>
          <p className="mt-1 font-subtitle text-xs font-medium lining-nums text-onyx">
            {whenLabel(booking.slot.startsAt)} · {euros(bookingPrice(booking))}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {refusing ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRefusing(false)}
              className="glass-chip h-10 rounded-full font-subtitle text-sm text-onyx disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecision(booking.id, 'reject')}
              className="glass-chip-on h-10 rounded-full font-subtitle text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              {busy ? 'A recusar…' : 'Sim, recusar'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRefusing(true)}
              className="glass-chip h-10 rounded-full font-subtitle text-sm text-onyx disabled:opacity-50"
            >
              Recusar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecision(booking.id, 'accept')}
              className="h-10 rounded-full bg-onyx font-subtitle text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'A aceitar…' : 'Aceitar'}
            </button>
          </>
        )}
      </div>
    </article>
  )
}

/** Today as a timeline: each session as tall as it is long, the free stretches between them, and a line for now. */
function Today({
  sessions,
  now,
  onOpen,
  onNewBooking,
}: {
  sessions: Booking[]
  now: number
  onOpen: (tab: 'agenda' | MoreTarget) => void
  onNewBooking: (startsAt?: string) => void
}) {
  const hours = sessions.reduce((sum, b) => sum + durationHours(b.service.durationLabel), 0)
  const takings = sessions.reduce((sum, b) => sum + bookingPrice(b), 0)
  const rows: Array<{ kind: 'session'; booking: Booking } | { kind: 'free'; from: number; to: number } | { kind: 'now' }> = []
  let nowPlaced = false
  sessions.forEach((b, i) => {
    const start = new Date(b.slot.startsAt).getTime()
    if (!nowPlaced && now < start) {
      rows.push({ kind: 'now' })
      nowPlaced = true
    }
    // A session going on now is marked on its own card.
    if (start <= now && now < endsAt(b)) nowPlaced = true
    rows.push({ kind: 'session', booking: b })
    const next = sessions[i + 1]
    if (next) {
      const gapFrom = endsAt(b)
      const gapTo = new Date(next.slot.startsAt).getTime()
      if (gapTo - gapFrom >= 30 * 60_000) {
        if (!nowPlaced && now >= gapFrom && now < gapTo) {
          rows.push({ kind: 'now' })
          nowPlaced = true
        }
        rows.push({ kind: 'free', from: gapFrom, to: gapTo })
      }
    }
  })

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between px-1">
        <h2 className={heading}>Hoje</h2>
        <button type="button" onClick={() => onOpen('agenda')} className="font-subtitle text-sm text-muted-dark">
          Agenda
        </button>
      </div>
      <p className="mb-4 px-1 font-subtitle text-sm text-muted-dark">
        {sessions.length === 0
          ? 'Dia livre. Bom momento para mostrar trabalho novo no portfólio.'
          : `${plural(sessions.length, 'cliente', 'clientes')}, ${lengthLabel(hours * HOUR)} de tranças e ${euros(takings)} hoje.`}
      </p>

      {sessions.length === 0 ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpen('portfolio')}
            className="glass-chip flex h-11 flex-1 items-center justify-center gap-2 rounded-full font-subtitle text-sm text-onyx"
          >
            <i className="bx bx-images text-lg" aria-hidden="true" />
            Portfólio
          </button>
          <button
            type="button"
            onClick={() => onNewBooking()}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-onyx font-subtitle text-sm font-medium text-white"
          >
            <i className="bx bx-plus text-lg" aria-hidden="true" />
            Nova marcação
          </button>
        </div>
      ) : (
        <ol className="relative flex flex-col">
          {rows.map((row, i) => {
            if (row.kind === 'now') {
              return (
                <li key={`now-${i}`} className="flex items-center gap-3 py-1.5" aria-label={`Agora, ${time(now)}`}>
                  <span className="w-14 shrink-0 text-right font-subtitle text-xs font-semibold lining-nums" style={{ color: GOLD }}>
                    {time(now)}
                  </span>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: GOLD }} />
                  <span className="h-px flex-1" style={{ background: GOLD }} />
                </li>
              )
            }
            if (row.kind === 'free') {
              return (
                <li key={`free-${i}`} className="flex items-center gap-3 py-2">
                  <span className="w-14 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onNewBooking(new Date(row.from).toISOString())}
                    className="flex-1 rounded-2xl border border-dashed border-onyx/15 px-4 py-2.5 text-left font-subtitle text-xs text-muted-dark"
                  >
                    Livre {time(row.from)}–{time(row.to)} · {lengthLabel(row.to - row.from)}
                  </button>
                </li>
              )
            }
            const b = row.booking
            const start = new Date(b.slot.startsAt).getTime()
            const end = endsAt(b)
            const done = end <= now
            const live = start <= now && now < end
            const photo = serviceImageUrls(b.service)[0]
            const length = durationHours(b.service.durationLabel)
            return (
              <li key={b.id} className={`flex gap-3 py-1 ${done ? 'opacity-45' : ''}`}>
                <span className="w-14 shrink-0 pt-3 text-right font-subtitle lining-nums">
                  <span className="block text-sm font-semibold text-onyx">{time(start)}</span>
                  <span className="block text-[11px] text-muted-dark">{time(end)}</span>
                </span>
                <div
                  className={`flex flex-1 gap-3 rounded-2xl border bg-white p-3 shadow-sm shadow-black/5 ${
                    live ? 'border-[#c9a84c]' : 'border-onyx/10'
                  }`}
                  // A five-hour braiding session looks longer than a one-hour touch-up.
                  style={{ minHeight: Math.min(64 + (length - 1) * 22, 180) }}
                >
                  {photo ? (
                    <img src={photo} alt="" className="w-12 shrink-0 self-stretch rounded-xl object-cover" />
                  ) : (
                    <span className="w-1 shrink-0 self-stretch rounded-full" style={{ background: GOLD }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-subtitle text-[15px] font-semibold text-onyx">{b.customerName}</p>
                    <p className="truncate font-subtitle text-xs text-muted-dark">{bookingName(b)}</p>
                    <p className="mt-1 font-subtitle text-xs lining-nums text-muted-dark">
                      {lengthLabel(length * HOUR)} · {euros(bookingPrice(b))}
                    </p>
                  </div>
                  {done ? (
                    <i className="bx bx-check self-start text-xl text-onyx" aria-label="Feita" />
                  ) : live ? (
                    <span className="self-start rounded-full px-2 py-0.5 font-subtitle text-[10px] font-semibold" style={{ background: GOLD, color: BROWN }}>
                      Agora
                    </span>
                  ) : null}
                </div>
              </li>
            )
          })}
          {/* After the last session of the day. */}
          {!nowPlaced && (
            <li className="flex items-center gap-3 py-1.5" aria-label={`Agora, ${time(now)}`}>
              <span className="w-14 shrink-0 text-right font-subtitle text-xs font-semibold lining-nums" style={{ color: GOLD }}>
                {time(now)}
              </span>
              <span className="size-2 shrink-0 rounded-full" style={{ background: GOLD }} />
              <span className="h-px flex-1" style={{ background: GOLD }} />
            </li>
          )}
        </ol>
      )}
    </section>
  )
}

/** The next seven days as how full each one is: a gold bar filled by the times taken. */
function Week({
  bookings,
  slots,
  today,
  onOpen,
}: {
  bookings: Booking[]
  slots: AvailabilitySlot[]
  today: string
  onOpen: () => void
}) {
  const days = [1, 2, 3, 4, 5, 6, 7].map((i) => {
    const key = addDays(today, i)
    const taken = bookings.filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && dayKey(b.slot.startsAt) === key).length
    const free = slots.filter((s) => s.status === 'OPEN' && dayKey(s.startsAt) === key).length
    return { key, label: i === 1 ? 'Amanhã' : capital(weekdayOf(key, 'short')), day: Number(key.slice(8)), taken, free }
  })
  const totalFree = days.reduce((sum, d) => sum + d.free, 0)
  const totalTaken = days.reduce((sum, d) => sum + d.taken, 0)

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between px-1">
        <h2 className={heading}>Próximos 7 dias</h2>
        <button type="button" onClick={onOpen} className="font-subtitle text-sm text-muted-dark">
          Agenda
        </button>
      </div>
      <p className="mb-4 px-1 font-subtitle text-sm text-muted-dark">
        {totalTaken === 0 && totalFree === 0
          ? 'Ainda sem horários abertos para esta semana.'
          : `${plural(totalTaken, 'sessão marcada', 'sessões marcadas')}${totalFree ? ` e ${plural(totalFree, 'horário livre', 'horários livres')}` : ', semana cheia'}.`}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full grid-cols-7 gap-1.5 rounded-3xl border border-onyx/10 bg-white p-3 shadow-sm shadow-black/5"
      >
        {days.map((d) => {
          const total = d.taken + d.free
          const fill = total ? d.taken / total : 0
          return (
            <span key={d.key} className="flex flex-col items-center gap-1.5">
              <span className="font-subtitle text-[10px] text-muted-dark">{d.label === 'Amanhã' ? 'Amn' : d.label}</span>
              <span className="relative h-20 w-full max-w-9 overflow-hidden rounded-full bg-onyx/[0.06]">
                <span
                  className="absolute inset-x-0 bottom-0 rounded-full"
                  style={{ height: `${Math.round(fill * 100)}%`, background: GOLD, opacity: total ? 1 : 0 }}
                />
              </span>
              <span className="font-subtitle text-sm font-semibold lining-nums leading-none text-onyx">{d.day}</span>
              <span className={`font-subtitle text-[10px] ${total && !d.free ? 'font-medium text-onyx' : 'text-muted-dark'}`}>
                {!total ? '–' : d.free ? `${d.free} livre${d.free === 1 ? '' : 's'}` : 'cheio'}
              </span>
            </span>
          )
        })}
      </button>
    </section>
  )
}

/**
 * The month in one figure, against the last one up to the same day, with both months drawn as a thin line of what
 * came in day by day.
 */
function Month({ confirmed, enabled, onOpen }: { confirmed: Booking[]; enabled: boolean; onOpen: () => void }) {
  const todayIso = new Date().toISOString()
  const month = monthOf(todayIso)
  const [y, m] = month.split('-').map(Number)
  const last = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`
  const dayOfMonth = Number(dayKey(todayIso).slice(8))
  const daysIn = (key: string) => new Date(Number(key.slice(0, 4)), Number(key.slice(5)), 0).getDate()

  // What the confirmed sessions came to by each day of the month.
  const running = (key: string, upTo: number) => {
    const perDay = Array<number>(daysIn(key)).fill(0)
    confirmed.forEach((b) => {
      if (monthOf(b.slot.startsAt) !== key) return
      perDay[Number(dayKey(b.slot.startsAt).slice(8)) - 1] += bookingPrice(b)
    })
    let sum = 0
    return perDay.slice(0, upTo).map((v) => (sum += v))
  }
  const thisMonth = running(month, dayOfMonth)
  const lastMonth = running(last, daysIn(last))
  const total = confirmed.filter((b) => monthOf(b.slot.startsAt) === month).reduce((sum, b) => sum + bookingPrice(b), 0)
  const soFar = thisMonth[thisMonth.length - 1] ?? 0
  const lastSameDay = lastMonth[Math.min(dayOfMonth, lastMonth.length) - 1] ?? 0
  const change = lastSameDay ? Math.round(((soFar - lastSameDay) / lastSameDay) * 100) : null
  const sessions = confirmed.filter((b) => monthOf(b.slot.startsAt) === month).length

  const W = 300
  const H = 56
  const top = Math.max(1, ...thisMonth, ...lastMonth)
  const line = (values: number[]) =>
    values.map((v, i) => `${((i / (daysIn(month) - 1 || 1)) * W).toFixed(1)},${(H - (v / top) * (H - 4) - 2).toFixed(1)}`).join(' ')

  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onOpen}
      className="w-full rounded-3xl border border-onyx/10 bg-white p-5 text-left shadow-sm shadow-black/5"
    >
      <div className="flex items-baseline justify-between">
        <span className="font-subtitle text-sm text-muted-dark">{monthName(month)}</span>
        {enabled && <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />}
      </div>
      <p className="mt-1 font-subtitle text-[40px] font-semibold lining-nums leading-none tracking-tight text-onyx">{euros(total)}</p>
      <p className="mt-2 font-subtitle text-sm text-muted-dark">
        {plural(sessions, 'sessão', 'sessões')}
        {change !== null && (
          <>
            {' · '}
            <span className={change >= 0 ? 'font-medium text-onyx' : 'font-medium text-red-700'}>
              {change >= 0 ? '+' : ''}
              {change}%
            </span>{' '}
            que {monthName(last).toLowerCase()} até dia {dayOfMonth}
          </>
        )}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-14 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={line(lastMonth)} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-onyx/15" vectorEffect="non-scaling-stroke" />
        <polyline points={line(thisMonth)} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex items-center gap-4 font-subtitle text-[11px] text-muted-dark">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: GOLD }} />
          {monthName(month)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-onyx/20" />
          {monthName(last)}
        </span>
      </div>
    </button>
  )
}
