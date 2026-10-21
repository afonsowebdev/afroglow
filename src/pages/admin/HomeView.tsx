import { useMemo, useState } from 'react'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { formatPrice, type AvailabilitySlot, type Booking, type Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, dayKey, shortDay, todayKey } from './admin-ui'

const TZ = 'Europe/Lisbon'
const euros = (cents: number) => formatPrice(cents)
const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
/** "2026-10" for a moment, in Lisbon. */
const monthKey = (iso: string | Date) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7)
function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + delta, 15)).toISOString().slice(0, 7)
}
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const monthShort = (key: string) => `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(2, 4)}`
const monthName = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', month: 'long' })

function greeting() {
  const hour = Number(new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  return hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'
}

function dayLabel(iso: string) {
  const key = dayKey(iso)
  if (key === todayKey()) return 'Hoje'
  if (key === addDays(todayKey(), 1)) return 'Amanhã'
  if (key === addDays(todayKey(), -1)) return 'Ontem'
  return shortDay(key)
}

/** Up or down against the month before, as a small coloured pill (green when it is good news). */
function Trend({ change, goodWhenUp = true }: { change: number | null; goodWhenUp?: boolean }) {
  if (change === null) return <span className="font-subtitle text-xs text-muted-dark">—</span>
  const up = change >= 0
  const good = up === goodWhenUp
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-subtitle text-xs font-semibold lining-nums ${
        good ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-red-600/10 text-red-700 dark:text-red-400'
      }`}
    >
      <i className={`bx ${up ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt'} text-sm`} aria-hidden="true" />
      {Math.abs(change)}%
    </span>
  )
}

/** A small line of the last months, the area under it shaded. */
function Spark({ values }: { values: number[] }) {
  const W = 90
  const H = 30
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * W, H - 2 - (v / max) * (H - 6)])
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-24 shrink-0 overflow-visible" aria-hidden="true">
      <polygon points={`0,${H} ${line} ${W},${H}`} className="fill-onyx/[0.07]" />
      <polyline points={line} fill="none" className="stroke-onyx" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.2" className="fill-onyx" />
    </svg>
  )
}

const card = 'rounded-3xl border border-onyx/10 bg-white p-5 shadow-sm shadow-black/5'
const label = 'font-subtitle text-sm text-muted-dark'
const iconRound = 'flex size-9 shrink-0 items-center justify-center rounded-full border border-onyx/15 text-lg text-onyx'
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null)

const GOAL_KEY = 'afroglow-admin-month-goal'
function loadGoal() {
  try {
    const v = Number(localStorage.getItem(GOAL_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

/**
 * The studio at a glance: the month's revenue with the main actions and today's numbers; the month's sessions,
 * average per session, new clients and cancellations against the month before; the hairstyles that bring in most;
 * how full the coming week is; the latest activity, to search; and the month's goal.
 */
export function HomeView({
  name,
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
  const now = Date.now()
  const thisMonth = monthKey(new Date())
  const [month, setMonth] = useState(thisMonth)
  const [search, setSearch] = useState('')
  const [goal, setGoal] = useState<number | null>(loadGoal)
  const [goalOpen, setGoalOpen] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const firstName = name.trim().split(/\s+/)[0]

  const confirmed = useMemo(() => bookings.filter((b) => b.status === 'ACCEPTED'), [bookings])
  const inMonth = (list: Booking[], key: string) => list.filter((b) => monthKey(b.slot.startsAt) === key)
  const revenueOf = (key: string) => inMonth(confirmed, key).reduce((sum, b) => sum + bookingPrice(b), 0)

  const revenue = revenueOf(month)
  const revenueBefore = revenueOf(shiftMonth(month, -1))

  // Six months, oldest first, for the small lines; the last one is the month chosen above.
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
  const sessionsSeries = months.map((k) => inMonth(confirmed, k).length)
  const avgSeries = months.map((k, i) => (sessionsSeries[i] ? Math.round(revenueOf(k) / sessionsSeries[i] / 100) * 100 : 0))
  const firstVisit = new Map<string, string>()
  for (const b of [...confirmed].sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))) {
    if (!firstVisit.has(b.customerId)) firstVisit.set(b.customerId, monthKey(b.slot.startsAt))
  }
  const newSeries = months.map((k) => [...firstVisit.values()].filter((v) => v === k).length)
  const cancelSeries = months.map((k) => {
    const all = bookings.filter((b) => monthKey(b.slot.startsAt) === k && (b.status === 'ACCEPTED' || b.status === 'CANCELLED'))
    return all.length ? Math.round((all.filter((b) => b.status === 'CANCELLED').length / all.length) * 100) : 0
  })
  const last = (s: number[]) => s[s.length - 1]
  const before = (s: number[]) => s[s.length - 2]

  const today = todayKey()
  const todaySessions = confirmed.filter((b) => dayKey(b.slot.startsAt) === today)
  const pending = bookings.filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now)
  const weekEnd = now + 7 * 86_400_000
  const inWeek = (iso: string) => new Date(iso).getTime() >= now && new Date(iso).getTime() < weekEnd
  const weekBooked = bookings.filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && inWeek(b.slot.startsAt)).length
  const weekFree = slots.filter((s) => s.status === 'OPEN' && inWeek(s.startsAt)).length
  const occupancy = weekBooked + weekFree ? Math.round((weekBooked / (weekBooked + weekFree)) * 100) : 0

  const byService = new Map<string, { name: string; cents: number; count: number }>()
  for (const b of inMonth(confirmed, month)) {
    const row = byService.get(b.serviceId) ?? { name: b.service.name, cents: 0, count: 0 }
    row.cents += bookingPrice(b)
    row.count += 1
    byService.set(b.serviceId, row)
  }
  const topServices = [...byService.values()].sort((a, b) => b.cents - a.cents).slice(0, 3)
  const SERVICE_DOT = ['bg-onyx', 'bg-[#c9a84c]', 'bg-onyx/35']

  const needle = search.trim().toLowerCase()
  const activity = [...bookings]
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
    .filter((b) => !needle || b.customerName.toLowerCase().includes(needle) || b.service.name.toLowerCase().includes(needle))
    .slice(0, 6)
  const STATUS: Record<Booking['status'], { icon: string; text: string; tone: string }> = {
    PENDING: { icon: 'bx bx-bell', text: 'Pedido', tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
    ACCEPTED: { icon: 'bx bx-check', text: 'Confirmada', tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
    CANCELLED: { icon: 'bx bx-x', text: 'Cancelada', tone: 'bg-red-600/10 text-red-700 dark:text-red-400' },
    REJECTED: { icon: 'bx bx-block', text: 'Recusada', tone: 'bg-red-600/10 text-red-700 dark:text-red-400' },
  }

  // The month's goal: the one set here, or else the average of the three months before.
  const avgPast = (() => {
    const past = [1, 2, 3].map((i) => revenueOf(shiftMonth(thisMonth, -i))).filter((v) => v > 0)
    return past.length ? Math.round(past.reduce((a, b) => a + b, 0) / past.length) : 0
  })()
  const target = goal ?? avgPast
  const thisRevenue = revenueOf(thisMonth)
  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING').length

  if (!can('marcacoes')) {
    return (
      <p className="mt-4 font-subtitle text-sm text-muted-dark">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}. Usa o menu em baixo para o que tens acesso.
      </p>
    )
  }

  return (
    <div className="mt-2">
      <p className="font-subtitle text-sm text-muted-dark">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}. Fica a par do salão e de como vai o mês.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* The month's revenue: the main figure, the main actions and today's numbers. */}
        <section className={`${card} col-span-2`}>
          <div className="flex items-center justify-between gap-3">
            <p className={label}>Receita do mês</p>
            <div className="flex items-center rounded-full border border-onyx/15 font-subtitle text-sm text-onyx">
              <button type="button" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))} className="flex size-8 items-center justify-center">
                <i className="bx bx-chevron-left text-lg" aria-hidden="true" />
              </button>
              <span className="min-w-14 text-center lining-nums">{monthShort(month)}</span>
              <button
                type="button"
                aria-label="Mês seguinte"
                disabled={month >= thisMonth}
                onClick={() => setMonth(shiftMonth(month, 1))}
                className="flex size-8 items-center justify-center disabled:opacity-30"
              >
                <i className="bx bx-chevron-right text-lg" aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="mt-2 font-subtitle text-[34px] font-semibold lining-nums leading-tight tracking-tight text-onyx">{euros(revenue)}</p>
          <p className="mt-1 flex items-center gap-2">
            <Trend change={pct(revenue, revenueBefore)} />
            <span className="font-subtitle text-xs text-muted-dark">face ao mês anterior</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onNewBooking()}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-onyx font-subtitle text-sm font-medium text-white"
            >
              <i className="bx bx-plus text-lg" aria-hidden="true" />
              Nova marcação
            </button>
            <button
              type="button"
              onClick={() => onOpen('disponibilidade')}
              className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-onyx/20 font-subtitle text-sm font-medium text-onyx"
            >
              <i className="bx bx-calendar-plus text-lg" aria-hidden="true" />
              Abrir horários
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: 'bx bx-calendar-check', value: String(todaySessions.length), text: 'hoje', go: () => onOpen('agenda'), alert: false },
              { icon: 'bx bx-bell', value: String(pending.length), text: pending.length === 1 ? 'pedido' : 'pedidos', go: () => onOpen('pedidos'), alert: pending.length > 0 },
              { icon: 'bx bx-time-five', value: String(weekFree), text: 'livres', go: () => onOpen('disponibilidade'), alert: weekFree === 0 },
            ].map((t) => (
              <button key={t.text} type="button" onClick={t.go} className="rounded-2xl border border-onyx/10 p-3 text-left active:bg-onyx/[0.03]">
                <span className="flex size-7 items-center justify-center rounded-full bg-onyx/[0.06] text-base text-onyx">
                  <i className={t.icon} aria-hidden="true" />
                </span>
                <span className="mt-2 block font-subtitle text-lg font-semibold lining-nums text-onyx">{t.value}</span>
                <span className="flex items-center gap-1 font-subtitle text-[11px] text-muted-dark">
                  <span className={`size-1.5 shrink-0 rounded-full ${t.alert ? 'bg-red-600' : 'bg-emerald-500'}`} />
                  <span className="truncate">{t.text}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* The month's figures, each against the month before, with the last six months as a line. */}
        {[
          { title: 'Sessões', icon: 'bx bx-calendar', value: String(last(sessionsSeries)), series: sessionsSeries, good: true },
          { title: 'Valor médio', icon: 'bx bx-euro', value: euros(last(avgSeries)).replace(/,00/, ''), series: avgSeries, good: true },
          { title: 'Clientes novas', icon: 'bx bx-user-plus', value: String(last(newSeries)), series: newSeries, good: true },
          { title: 'Cancelamentos', icon: 'bx bx-calendar-x', value: `${last(cancelSeries)}%`, series: cancelSeries, good: false },
        ].map((k) => (
          <section key={k.title} className={`${card} p-4`}>
            <div className="flex items-start justify-between gap-2">
              <p className={label}>{k.title}</p>
              <span className={iconRound}>
                <i className={k.icon} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-1 truncate font-subtitle text-2xl font-semibold lining-nums tracking-tight text-onyx">{k.value}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <Trend change={pct(last(k.series), before(k.series))} goodWhenUp={k.good} />
              <Spark values={k.series} />
            </div>
          </section>
        ))}

        {/* The hairstyles that bring in most. */}
        <section className={`${card} col-span-2`}>
          <p className={label}>Modelos que mais faturaram</p>
          {topServices.length === 0 ? (
            <p className="mt-4 font-subtitle text-sm text-muted-dark">Ainda sem sessões confirmadas em {monthName(month)}.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {topServices.map((s, i) => (
                <li key={s.name}>
                  <p className="flex items-center gap-2 font-subtitle text-[15px] font-medium text-onyx">
                    <span className={`size-2.5 shrink-0 rounded-full ${SERVICE_DOT[i]}`} />
                    <span className="truncate">{s.name}</span>
                  </p>
                  <p className="mt-0.5 font-subtitle text-xs lining-nums text-muted-dark">
                    {euros(s.cents)} · {revenue ? Math.round((s.cents / revenue) * 100) : 0}% · {s.count} {s.count === 1 ? 'sessão' : 'sessões'}
                  </p>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-onyx/[0.07]">
                    <span className={`block h-full rounded-full ${SERVICE_DOT[i]}`} style={{ width: `${revenue ? (s.cents / revenue) * 100 : 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* How full the coming week is. */}
        <section className={`${card} col-span-2`}>
          <p className={label}>Ocupação dos próximos 7 dias</p>
          <div className="mt-3 flex items-center gap-5">
            <div className="relative size-32 shrink-0">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r="48" fill="none" strokeWidth="14" className="stroke-onyx/[0.08]" />
                {occupancy > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    fill="none"
                    strokeWidth="14"
                    strokeLinecap="round"
                    className="stroke-onyx"
                    strokeDasharray={`${(occupancy / 100) * 2 * Math.PI * 48} ${2 * Math.PI * 48}`}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-subtitle text-2xl font-semibold lining-nums text-onyx">{occupancy}%</span>
                <span className="font-subtitle text-[11px] text-muted-dark">ocupado</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 font-subtitle text-sm">
              <span className="flex items-center gap-2 text-onyx">
                <span className="size-2.5 rounded-full bg-onyx" /> {weekBooked} {weekBooked === 1 ? 'marcada' : 'marcadas'}
              </span>
              <span className="flex items-center gap-2 text-onyx">
                <span className="size-2.5 rounded-full bg-onyx/15" /> {weekFree} {weekFree === 1 ? 'livre' : 'livres'}
              </span>
              <button type="button" onClick={() => onOpen('disponibilidade')} className="text-left text-xs text-muted-dark underline underline-offset-4">
                Abrir mais horários
              </button>
            </div>
          </div>
        </section>

        {/* The latest activity, to search. */}
        <section className={`${card} col-span-2`}>
          <div className="flex items-center justify-between gap-3">
            <p className={label}>Atividade recente</p>
            <button type="button" onClick={() => onOpen('agenda')} className="flex items-center gap-1 font-subtitle text-sm text-onyx">
              Ver todos <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-full border border-onyx/15 px-4">
            <i className="bx bx-search text-lg text-onyx/40" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar"
              aria-label="Pesquisar na atividade"
              className="field-plain h-11 min-w-0 flex-1 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/40"
            />
          </label>
          <ul className="mt-3 flex flex-col">
            {activity.length === 0 && <li className="py-3 font-subtitle text-sm text-muted-dark">Nada encontrado.</li>}
            {activity.map((b) => {
              const st = STATUS[b.status]
              const lost = b.status === 'CANCELLED' || b.status === 'REJECTED'
              return (
                <li key={b.id}>
                  <button type="button" onClick={() => onOpen(b.status === 'PENDING' ? 'pedidos' : 'agenda')} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg ${st.tone}`}>
                      <i className={st.icon} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-subtitle text-[15px] font-medium text-onyx">{b.customerName}</span>
                      <span className="block truncate font-subtitle text-xs text-muted-dark">
                        {st.text} · {bookingName(b)} · {dayLabel(b.slot.startsAt)}, {time(b.slot.startsAt)}
                      </span>
                    </span>
                    <span className={`shrink-0 font-subtitle text-[15px] font-semibold lining-nums ${lost ? 'text-muted-dark line-through' : 'text-onyx'}`}>
                      {euros(bookingPrice(b)).replace(/,00/, '')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* The month's goal. */}
        <section className={`${card} col-span-2`}>
          <div className="flex items-center justify-between gap-3">
            <p className={label}>Objetivo de {monthName(thisMonth)}</p>
            <button
              type="button"
              onClick={() => {
                setGoalDraft(target ? String(Math.round(target / 100)) : '')
                setGoalOpen(true)
              }}
              className="font-subtitle text-sm text-onyx"
            >
              Editar
            </button>
          </div>
          {target > 0 ? (
            <>
              <p className="mt-2 font-subtitle text-onyx">
                <span className="text-2xl font-semibold lining-nums tracking-tight">{euros(thisRevenue)}</span>
                <span className="text-sm text-muted-dark"> de {euros(target)}</span>
              </p>
              <span className="mt-3 block h-2.5 overflow-hidden rounded-full bg-onyx/[0.07]">
                <span className="block h-full rounded-full bg-onyx" style={{ width: `${Math.min(100, (thisRevenue / target) * 100)}%` }} />
              </span>
              <p className="mt-2 font-subtitle text-xs text-muted-dark">
                {Math.round((thisRevenue / target) * 100)}% atingido ·{' '}
                {thisRevenue >= target ? 'objetivo cumprido' : `faltam ${euros(target - thisRevenue)}`}
                {goal ? '' : ' · média dos últimos meses'}
              </p>
            </>
          ) : (
            <p className="mt-3 font-subtitle text-sm text-muted-dark">Define quanto queres faturar este mês e acompanha aqui.</p>
          )}
          {can('testemunhos') && pendingTestimonials > 0 && (
            <button type="button" onClick={() => onOpen('testemunhos')} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-onyx/[0.04] px-4 py-3 text-left">
              <i className="bx bx-message-rounded-dots text-xl text-onyx" aria-hidden="true" />
              <span className="flex-1 font-subtitle text-sm text-onyx">
                {pendingTestimonials} {pendingTestimonials === 1 ? 'testemunho' : 'testemunhos'} por rever
              </span>
              <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
            </button>
          )}
        </section>
      </div>

      <Sheet
        open={goalOpen}
        title="Objetivo do mês"
        description="Quanto queres faturar este mês. Fica guardado neste aparelho."
        icon="bx bx-target-lock"
        submitLabel="Guardar"
        onSubmit={() => {
          const cents = Math.round(Number(goalDraft.replace(',', '.')) * 100)
          const next = Number.isFinite(cents) && cents > 0 ? cents : null
          try {
            if (next) localStorage.setItem(GOAL_KEY, String(next))
            else localStorage.removeItem(GOAL_KEY)
          } catch {
            // not remembered
          }
          setGoal(next)
          setGoalOpen(false)
        }}
        onClose={() => setGoalOpen(false)}
      >
        <SheetField label="Objetivo (€)">
          <input value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} inputMode="decimal" placeholder="Ex.: 2500" className={sheetFieldClass} />
        </SheetField>
        <p className="font-subtitle text-xs text-muted-dark">Deixa vazio para usar a média dos últimos três meses.</p>
      </Sheet>
    </div>
  )
}
