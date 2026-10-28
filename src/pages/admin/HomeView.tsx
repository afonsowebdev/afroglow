import { useState, type ReactNode } from 'react'
import { durationHours } from '@/lib/calendar'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { formatPrice, type AvailabilitySlot, type Booking, type Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, ago, dayKey, plural, todayKey } from './admin-ui'

/*
 * The Início, made for the owner between two clients. A dark card with the day (how many clients, the next one, a
 * new booking); the business in four figures for the month or the week; today's agenda with where each session is;
 * and what is left to answer. The full figures live in Estatísticas.
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

/** The greeting and the first name apart ("Boa noite", "Ruth"), for the Início's title. */
export function homeHello(name: string) {
  const [hello, first = ''] = homeGreeting(name).split(', ')
  return { hello, first }
}

/** "Terça-feira, 27 de outubro". */
export function homeDate() {
  return capital(new Date().toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }))
}

const heading = 'font-subtitle text-[17px] font-semibold tracking-tight text-onyx'
const link = 'font-subtitle text-sm font-medium text-muted-dark'
const card = 'rounded-3xl border border-onyx/10 bg-white shadow-sm shadow-black/5'

type Period = 'mes' | 'semana'

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

  const left = todaySessions.filter((b) => endsAt(b) > now).length
  const dayTitle =
    todaySessions.length === 0
      ? 'Sem clientes hoje'
      : left === 0
        ? `${plural(todaySessions.length, 'cliente atendida', 'clientes atendidas')} hoje`
        : `${plural(todaySessions.length, 'cliente', 'clientes')} na agenda`
  const dayLine = live
    ? `${firstName(live.customerName)} está na cadeira até às ${time(endsAt(live))}`
    : next
      ? dayKey(next.slot.startsAt) === today
        ? `Próxima cliente às ${time(next.slot.startsAt)} · ${firstName(next.customerName)}`
        : `Próxima cliente ${dayKey(next.slot.startsAt) === addDays(today, 1) ? 'amanhã' : 'a ' + new Date(next.slot.startsAt).toLocaleDateString('pt-PT', { timeZone: TZ, day: 'numeric', month: 'short' }).replace('.', '')} às ${time(next.slot.startsAt)}`
      : 'Ainda sem marcações à frente.'

  return (
    <div className="mt-6 flex flex-col gap-9">
      {/* The day, in control. */}
      <section className="relative overflow-hidden rounded-3xl p-5 text-[#ffffff]" style={{ background: BROWN }}>
        <span
          aria-hidden="true"
          className="absolute -right-8 -top-10 flex size-32 items-center justify-center rounded-full font-logo text-[64px] leading-none logo-weight"
          style={{ background: '#ffffff0d', color: `${GOLD}55` }}
        >
          <span className="translate-x-[-10px] translate-y-[12px]">A</span>
        </span>
        <p className="relative font-subtitle text-xs font-medium" style={{ color: GOLD }}>
          O teu dia
        </p>
        <p className="relative mt-1.5 font-subtitle text-[22px] font-semibold leading-tight tracking-tight">{dayTitle}</p>
        <p className="relative mt-1 font-subtitle text-sm text-[#ffffff]/70">{dayLine}</p>
        <button
          type="button"
          onClick={() => onNewBooking()}
          className="relative mt-4 flex h-9 items-center gap-1.5 rounded-full px-4 font-subtitle text-[13px] font-semibold"
          style={{ background: GOLD, color: BROWN }}
        >
          <i className="bx bx-plus text-base" aria-hidden="true" />
          Nova marcação
        </button>
      </section>

      <Business
        period={period}
        onPeriod={setPeriod}
        bookings={bookings}
        confirmed={confirmed}
        pending={pending}
        slots={slots}
        today={today}
        now={now}
        canStats={can('estatisticas')}
        onOpen={onOpen}
      />

      {/* Today's agenda. */}
      <section>
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className={heading}>Agenda de hoje</h2>
          <button type="button" onClick={() => onOpen('agenda')} className={link}>
            Ver agenda
          </button>
        </div>
        <div className={card}>
          {todaySessions.length === 0 ? (
            <p className="px-5 py-6 text-center font-subtitle text-sm text-muted-dark">Dia livre, sem sessões marcadas.</p>
          ) : (
            <ol className="divide-y divide-onyx/[0.07]">
              {todaySessions.map((b) => {
                const start = new Date(b.slot.startsAt).getTime()
                const end = endsAt(b)
                const state = end <= now ? 'feita' : start <= now ? 'agora' : 'confirmada'
                return (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="w-11 shrink-0 font-subtitle text-sm font-semibold lining-nums text-muted-dark">{time(start)}</span>
                    <span
                      aria-hidden="true"
                      className="h-10 w-[3px] shrink-0 rounded-full"
                      style={{ background: state === 'agora' ? GOLD : state === 'feita' ? 'color-mix(in srgb, var(--color-onyx) 15%, transparent)' : BROWN }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-subtitle text-[15px] font-semibold text-onyx">{b.customerName}</span>
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
          <button
            type="button"
            onClick={() => onOpen('agenda')}
            className="w-full border-t border-onyx/[0.07] py-3 font-subtitle text-[13px] font-medium text-onyx"
          >
            Abrir calendário completo
          </button>
        </div>
      </section>

      {/* What is left to answer. */}
      <section>
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className={heading}>A resolver</h2>
          {pending.length > 0 && (
            <button type="button" onClick={() => onOpen('pedidos')} className={link}>
              Ver todos
            </button>
          )}
        </div>
        <div className={card}>
          {pending.length === 0 && reviews.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-5 py-6 font-subtitle text-sm text-muted-dark">
              <i className="bx bx-check-circle text-lg" aria-hidden="true" />
              Tudo em dia, nada à espera.
            </p>
          ) : (
            <ul className="divide-y divide-onyx/[0.07]">
              {pending.slice(0, 4).map((b) => (
                <ToDo
                  key={b.id}
                  icon="bx-calendar-exclamation"
                  title="Confirmar pedido de marcação"
                  line={`${b.customerName} · enviado ${ago(b.createdAt)}`}
                  onClick={() => onOpen('pedidos')}
                />
              ))}
              {reviews.slice(0, 3).map((t) => (
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
      </section>
    </div>
  )
}

function ToDo({ icon, title, line, onClick }: { icon: string; title: string; line: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-lg text-onyx">
          <i className={`bx ${icon}`} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-subtitle text-sm font-semibold text-onyx">{title}</span>
          <span className="block truncate font-subtitle text-xs text-muted-dark">{line}</span>
        </span>
        <span className="shrink-0 font-subtitle text-xs font-medium text-muted-dark">Abrir</span>
        <i className="bx bx-chevron-right -ml-2 text-lg text-onyx/30" aria-hidden="true" />
      </button>
    </li>
  )
}

/** The business in four figures, for this month or this week. */
function Business({
  period,
  onPeriod,
  bookings,
  confirmed,
  pending,
  slots,
  today,
  now,
  canStats,
  onOpen,
}: {
  period: Period
  onPeriod: (period: Period) => void
  bookings: Booking[]
  confirmed: Booking[]
  pending: Booking[]
  slots: AvailabilitySlot[]
  today: string
  now: number
  canStats: boolean
  onOpen: (tab: 'pedidos' | 'disponibilidade' | MoreTarget) => void
}) {
  // This week runs from Monday; last week is the seven days before it.
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7
  const weekStart = addDays(today, -weekday)
  const inThis = (iso: string) => {
    const key = dayKey(iso)
    return period === 'mes' ? monthOf(iso) === today.slice(0, 7) : key >= weekStart && key <= addDays(weekStart, 6)
  }
  // The same stretch of the period before, up to the same day.
  const lastMonth = (() => {
    const [y, m] = today.split('-').map(Number)
    return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`
  })()
  const inBefore = (iso: string) => {
    const key = dayKey(iso)
    if (period === 'mes') return key.slice(0, 7) === lastMonth && Number(key.slice(8)) <= Number(today.slice(8))
    return key >= addDays(weekStart, -7) && key <= addDays(today, -7)
  }
  const inThisSoFar = (iso: string) => inThis(iso) && dayKey(iso) <= today

  const periodBookings = confirmed.filter((b) => inThis(b.slot.startsAt))
  const revenue = periodBookings.reduce((sum, b) => sum + bookingPrice(b), 0)
  const soFar = confirmed.filter((b) => inThisSoFar(b.slot.startsAt)).reduce((sum, b) => sum + bookingPrice(b), 0)
  const before = confirmed.filter((b) => inBefore(b.slot.startsAt)).reduce((sum, b) => sum + bookingPrice(b), 0)
  const change = before ? Math.round(((soFar - before) / before) * 100) : null

  // New clients: those whose first booking ever falls in this period.
  const firstOf = new Map<string, string>()
  bookings
    .filter((b) => b.status === 'ACCEPTED' || b.status === 'PENDING')
    .forEach((b) => {
      const seen = firstOf.get(b.customerId)
      if (!seen || b.slot.startsAt < seen) firstOf.set(b.customerId, b.slot.startsAt)
    })
  const newClients = [...firstOf.values()].filter((iso) => inThis(iso)).length

  const urgent = pending.filter((b) => new Date(b.slot.startsAt).getTime() - now < 48 * HOUR).length

  // How full the next seven days are, by times taken against times open.
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const taken = bookings.filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && week.includes(dayKey(b.slot.startsAt))).length
  const free = slots.filter((s) => s.status === 'OPEN' && week.includes(dayKey(s.startsAt)) && new Date(s.startsAt).getTime() > now).length
  const occupancy = taken + free ? Math.round((taken / (taken + free)) * 100) : null

  const versus = period === 'mes' ? monthName(lastMonth) : 'a semana passada'

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className={heading}>O negócio</h2>
        <div className="flex rounded-full bg-onyx/[0.06] p-0.5" role="tablist" aria-label="Período">
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
              onClick={() => onPeriod(id)}
              className={`h-7 rounded-full px-3 font-subtitle text-xs font-medium transition-colors ${
                period === id ? 'bg-white text-onyx shadow-sm' : 'text-muted-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Figure
          label="Receita"
          icon="bx-euro"
          value={euros(revenue)}
          note={
            change === null ? (
              plural(periodBookings.length, 'sessão', 'sessões')
            ) : (
              <span className={change >= 0 ? 'text-[#3d7a5c]' : 'text-red-700'}>
                {change >= 0 ? '↗' : '↘'} {Math.abs(change)}% face a {versus}
              </span>
            )
          }
          onClick={canStats ? () => onOpen('estatisticas') : undefined}
        />
        <Figure
          label="Marcações"
          icon="bx-calendar-check"
          value={String(periodBookings.length)}
          note={newClients ? plural(newClients, 'cliente nova', 'clientes novas') : 'Sem clientes novas'}
          onClick={canStats ? () => onOpen('estatisticas') : undefined}
        />
        <Figure
          label="Por confirmar"
          icon="bx-time-five"
          value={String(pending.length)}
          note={
            pending.length === 0 ? (
              'Nenhum pedido à espera'
            ) : urgent ? (
              <span className="text-[#b5652b]">{plural(urgent, 'é para os próximos 2 dias', 'são para os próximos 2 dias')}</span>
            ) : (
              'Sem pressa para responder'
            )
          }
          onClick={() => onOpen('pedidos')}
        />
        <Figure
          label="Ocupação 7 dias"
          icon="bx-pie-chart-alt-2"
          value={occupancy === null ? '–' : `${occupancy}%`}
          note={
            <>
              <span className="mb-1.5 block h-1.5 overflow-hidden rounded-full bg-onyx/[0.07]">
                <span className="block h-full rounded-full" style={{ width: `${occupancy ?? 0}%`, background: GOLD }} />
              </span>
              {occupancy === null ? 'Sem horários abertos' : free ? plural(free, 'horário livre', 'horários livres') : 'Semana cheia'}
            </>
          }
          onClick={() => onOpen('disponibilidade')}
        />
      </div>
    </section>
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
    <button type="button" disabled={!onClick} onClick={onClick} className={`${card} flex min-h-[7.25rem] flex-col p-4 text-left`}>
      <span className="flex items-start justify-between gap-2">
        <span className="font-subtitle text-xs text-muted-dark">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06] text-base text-onyx">
          <i className={`bx ${icon}`} aria-hidden="true" />
        </span>
      </span>
      <span className="mt-1 font-subtitle text-[26px] font-semibold lining-nums leading-tight tracking-tight text-onyx">{value}</span>
      <span className="mt-auto pt-1.5 font-subtitle text-[11px] leading-snug text-muted-dark">{note}</span>
    </button>
  )
}
