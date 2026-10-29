import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  ChartColumn,
  ChartLine,
  ChartPie,
  Check,
  Clock,
  Eye,
  EyeOff,
  Hourglass,
  LayoutGrid,
  ListFilter,
  MessageSquareQuote,
  Plus,
  Receipt,
  Search,
  Target,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { DraggableWidgetGrid, type WidgetItem, type WidgetSize } from '@/components/ui/draggable-widget-grid'
import { Sheet, SheetField, sheetFieldClass } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { durationHours } from '@/lib/calendar'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { bookingName, bookingPrice } from '@/lib/pricing'
import { getBusinessInfo } from '@/lib/site-config'
import type { AvailabilitySlot, Booking, Service, Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, dayKey, plural, todayKey } from './admin-ui'

/*
 * The Painel (Início) of the admin, in the AFROGLOW look (Poppins, the glass buttons, warm neutrals): the greeting, and ten blocks on
 * a board she can rearrange (4 large, 4 small, 1 wide, 1 tall = 24 cells, so 2, 3, 4 or 6 columns never leave a hole).
 * Everything comes from the bookings, slots, services and testimonials the panel already loads; only the monthly goal
 * is kept on the server. Amounts can be hidden for privacy.
 */

const TZ = 'Europe/Lisbon'
const HOUR = 60 * 60 * 1000
const ORDER_KEY = 'afroadmin:painel-ordem'
const CHART_KEY = 'afroadmin:painel-grafico'
const HIDE_KEY = 'afroadmin:esconder-valores'

type Tab = 'pedidos' | 'agenda' | 'disponibilidade' | 'clientes' | MoreTarget
type BlockId = 'faturacao' | 'sessoes' | 'hoje' | 'grafico' | 'clientes' | 'ticket' | 'meta' | 'servicos' | 'atividade' | 'proximas'

const BLOCKS: Array<{ id: BlockId; size: WidgetSize; label: string }> = [
  { id: 'faturacao', size: 'lg', label: 'Faturação do mês' },
  { id: 'sessoes', size: 'sm', label: 'Sessões do mês' },
  { id: 'hoje', size: 'sm', label: 'Marcações de hoje' },
  { id: 'grafico', size: 'lg', label: 'Receita e cancelamentos' },
  { id: 'clientes', size: 'sm', label: 'Clientes novas' },
  { id: 'ticket', size: 'sm', label: 'Valor médio por sessão' },
  { id: 'meta', size: 'wide', label: 'Meta mensal' },
  { id: 'servicos', size: 'tall', label: 'Mais pedidos' },
  { id: 'atividade', size: 'lg', label: 'Atividade recente' },
  { id: 'proximas', size: 'lg', label: 'Próximas marcações' },
]
const ALLOWED_COLUMNS = [2, 3, 4, 6]

/* Formatting */

const euroFormat = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const compactFormat = new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 })
/** "1 240 €", or "1,2 M €" when very large. */
const euros = (cents: number) =>
  Math.abs(cents) >= 100_000_000 ? `${compactFormat.format(cents / 100)} €` : euroFormat.format(Math.round(cents / 100))
const time = (iso: string | number) => new Date(iso).toLocaleTimeString('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const monthOf = (iso: string) => dayKey(iso).slice(0, 7)
const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', month: 'short' }).replace('.', '')
const monthName = (key: string) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', month: 'long' })
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-PT', { timeZone: TZ, day: 'numeric', month: 'short' }).replace('.', '')
const weekdayShort = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'short' }).replace('.', '')
const firstName = (name: string) => name.trim().split(/\s+/)[0]
const endsAt = (b: Booking) => new Date(b.slot.startsAt).getTime() + durationHours(b.service.durationLabel) * HOUR
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null)
function shiftMonth(key: string, by: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 15))
  return d.toISOString().slice(0, 7)
}
/** "1h30", "45 min", "3h". */
function lengthLabel(ms: number) {
  const minutes = Math.round(ms / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** "Bom dia" before noon, "Boa tarde" until 20h, then "Boa noite"; with her first name. */
export function homeGreeting(name: string) {
  const hour = Number(new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  const hello = hour < 12 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'
  const first = firstName(name)
  return first ? `${hello}, ${first}` : hello
}

/** "Terça-feira, 27 de outubro". */
export function homeDate() {
  return capital(new Date().toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }))
}

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}
function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or storage blocked: it just lasts until the app closes.
  }
}

/** The saved order, with any block added since then at the end. */
function loadOrder(): Array<WidgetItem & { id: BlockId }> {
  const saved = readStore<string[]>(ORDER_KEY, [])
  const known = saved.map((id) => BLOCKS.find((b) => b.id === id)).filter((b): b is (typeof BLOCKS)[number] => !!b)
  const all = [...known, ...BLOCKS.filter((b) => !known.includes(b))]
  return all.map(({ id, size, label }) => ({ id, size, label }))
}

/* The page */

export function HomeView({
  name,
  bookings,
  slots,
  services,
  testimonials,
  loaded,
  can,
  onOpen,
  onNewBooking,
}: {
  name: string
  bookings: Booking[]
  slots: AvailabilitySlot[]
  services: Service[]
  testimonials: Testimonial[]
  loaded: boolean
  can: (permission: Permission) => boolean
  onOpen: (tab: Tab) => void
  onNewBooking: (startsAt?: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [hidden, setHidden] = useState(() => readStore(HIDE_KEY, false))
  const [boardKey, setBoardKey] = useState(0)
  const [order, setOrder] = useState(loadOrder)
  const [goal, setGoal] = useState<number | null>(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    api
      .get<{ monthlyCents: number }>('/admin/goal')
      .then((data) => setGoal(data.monthlyCents))
      .catch(() => setGoal(0))
  }, [])

  const header = (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-subtitle text-[32px] font-semibold leading-none tracking-tight text-onyx">{homeGreeting(name)}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-dark">
          {editing
            ? 'Arrasta os blocos para os reorganizar. No telemóvel, mantém o dedo premido antes de arrastar.'
            : 'Fica a par do teu negócio e acompanha o teu progresso.'}
        </p>
      </div>
      {loaded && bookings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={hidden ? 'Mostrar valores' : 'Esconder valores'}
            aria-pressed={hidden}
            onClick={() => {
              void tap()
              setHidden(!hidden)
              writeStore(HIDE_KEY, !hidden)
            }}
            className="glass-chip flex size-9 items-center justify-center rounded-full text-onyx"
          >
            {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void tap()
                  writeStore(ORDER_KEY, BLOCKS.map((b) => b.id))
                  setOrder(loadOrder())
                  setBoardKey((k) => k + 1)
                }}
                className="h-9 px-2 text-[13px] font-medium text-muted-dark underline underline-offset-4"
              >
                Repor
              </button>
              <button
                type="button"
                onClick={() => {
                  void tap()
                  setEditing(false)
                }}
                className="flex h-9 items-center gap-1.5 rounded-full bg-onyx px-4 text-[13px] font-semibold text-white"
              >
                <Check size={16} />
                Concluir
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                void tap()
                setEditing(true)
              }}
              className="glass-chip flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium text-onyx"
            >
              <LayoutGrid size={16} />
              Personalizar
            </button>
          )}
        </div>
      )}
    </div>
  )

  if (!can('marcacoes')) {
    return (
      <div className="font-subtitle">
        {header}
        <p className="text-sm text-ink-3">Usa o menu para o que tens acesso.</p>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="font-subtitle">
        {header}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[340px] animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="font-subtitle">
        {header}
        <FirstSteps services={services} slots={slots} onOpen={onOpen} onNewBooking={() => onNewBooking()} />
      </div>
    )
  }

  const data = boardData({ bookings, testimonials: can('testemunhos') ? testimonials : [] })
  const canStats = can('estatisticas')

  const render = (id: BlockId): ReactNode => {
    switch (id) {
      case 'faturacao':
        return (
          <Highlight data={data} onNewBooking={() => onNewBooking()} onDetail={() => setDetailOpen(true)} onOpen={onOpen} />
        )
      case 'sessoes':
        return (
          <Stat
            label="Sessões do mês"
            Icon={CalendarCheck}
            value={String(data.month.sessions)}
            change={data.month.sessionsChange}
            series={data.months.map((m) => m.sessions)}
            seriesLabel="Sessões por mês, nos últimos 6 meses"
          />
        )
      case 'hoje':
        return (
          <Stat
            label="Marcações de hoje"
            Icon={CalendarClock}
            value={String(data.today.count)}
            change={data.today.change}
            changeLabel="face à semana passada"
            series={data.today.series}
            seriesLabel="Marcações por dia, nos últimos 6 dias"
          />
        )
      case 'clientes':
        return (
          <Stat
            label="Clientes novas"
            Icon={UserPlus}
            value={String(data.month.newClients)}
            change={data.month.newClientsChange}
            series={data.months.map((m) => m.newClients)}
            seriesLabel="Clientes novas por mês, nos últimos 6 meses"
          />
        )
      case 'ticket':
        return (
          <Stat
            label="Valor médio"
            Icon={Receipt}
            value={euros(data.month.average)}
            amount
            change={data.month.averageChange}
            series={data.months.map((m) => m.average)}
            seriesLabel="Valor médio por sessão, nos últimos 6 meses"
          />
        )
      case 'grafico':
        return <InOutChart months={data.months} />
      case 'meta':
        return <Goal goal={goal} revenue={data.month.revenue} canEdit={canStats} onEdit={() => setGoalOpen(true)} />
      case 'servicos':
        return <Ranking items={data.ranking} total={data.rankingTotal} />
      case 'atividade':
        return <Activity items={data.activity} onOpen={onOpen} />
      case 'proximas':
        return <Upcoming bookings={data.upcoming} onOpen={() => onOpen('agenda')} onNewBooking={() => onNewBooking()} />
    }
  }

  return (
    <div className="font-subtitle" data-hide-amounts={hidden ? 'true' : 'false'}>
      {header}
      <DraggableWidgetGrid
        key={boardKey}
        items={order}
        editable={editing}
        maxColumns={6}
        allowedColumns={ALLOWED_COLUMNS}
        cellSize={190}
        gap={12}
        radius={22}
        rowRatio={0.75}
        narrowRowRatio={0.85}
        maxRowHeight={150}
        onChange={(next) => writeStore(ORDER_KEY, next.map((b) => b.id))}
        renderItem={(item) => (
          <div className={`flex h-full flex-col p-4 2xl:p-5 ${editing ? 'pointer-events-none' : ''}`}>{render(item.id)}</div>
        )}
      />
      <RevenueDetail
        open={detailOpen}
        data={data}
        onClose={() => setDetailOpen(false)}
        onStats={
          canStats
            ? () => {
                setDetailOpen(false)
                onOpen('estatisticas')
              }
            : undefined
        }
      />
      {goalOpen && (
        <GoalSheet
        current={goal ?? 0}
        onClose={() => setGoalOpen(false)}
        onSaved={(cents) => {
          setGoal(cents)
          setGoalOpen(false)
        }}
        />
      )}
    </div>
  )
}

/* Figures */

interface MonthFigures {
  key: string
  revenue: number
  cancelled: number
  sessions: number
  newClients: number
  average: number
}
interface ActivityItem {
  id: string
  kind: 'pedido' | 'confirmada' | 'cancelada' | 'recusada' | 'testemunho'
  title: string
  line: string
  at: string
  cents: number | null
}

function boardData({ bookings, testimonials }: { bookings: Booking[]; testimonials: Testimonial[] }) {
  const now = Date.now()
  const today = todayKey()
  const thisMonth = today.slice(0, 7)
  const dayOfMonth = Number(today.slice(8))
  const confirmed = bookings.filter((b) => b.status === 'ACCEPTED')
  const sum = (list: Booking[]) => list.reduce((total, b) => total + bookingPrice(b), 0)

  // Each client's first booking ever, for "new clients".
  const firstOf = new Map<string, string>()
  bookings
    .filter((b) => b.status === 'ACCEPTED' || b.status === 'PENDING')
    .forEach((b) => {
      const seen = firstOf.get(b.customerId)
      if (!seen || b.slot.startsAt < seen) firstOf.set(b.customerId, b.slot.startsAt)
    })
  const firsts = [...firstOf.values()]

  const figuresFor = (key: string, upToDay = 31): MonthFigures => {
    const inMonth = (b: Booking) => monthOf(b.slot.startsAt) === key && Number(dayKey(b.slot.startsAt).slice(8)) <= upToDay
    const done = confirmed.filter(inMonth)
    const revenue = sum(done)
    return {
      key,
      revenue,
      cancelled: sum(bookings.filter((b) => b.status === 'CANCELLED' && inMonth(b))),
      sessions: done.length,
      newClients: firsts.filter((iso) => monthOf(iso) === key && Number(dayKey(iso).slice(8)) <= upToDay).length,
      average: done.length ? Math.round(revenue / done.length) : 0,
    }
  }
  const months = [-5, -4, -3, -2, -1, 0].map((by) => figuresFor(shiftMonth(thisMonth, by)))
  const current = months[5]
  // Against last month up to the same day, so a month just begun isn't "down".
  const lastSoFar = figuresFor(shiftMonth(thisMonth, -1), dayOfMonth)
  const currentSoFar = figuresFor(thisMonth, dayOfMonth)
  const last = months[4]

  // Today, against the same weekday last week; the series is the last six days.
  const countOn = (key: string) => bookings.filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && dayKey(b.slot.startsAt) === key).length
  const todayCount = countOn(today)

  const pendingAll = bookings.filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now)
  const monthCancelled = bookings.filter((b) => b.status === 'CANCELLED' && monthOf(b.slot.startsAt) === thisMonth)

  // Most booked over the last 90 days.
  const since = addDays(today, -90)
  const counts = new Map<string, number>()
  bookings
    .filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && dayKey(b.slot.startsAt) >= since)
    .forEach((b) => counts.set(b.service.name, (counts.get(b.service.name) ?? 0) + 1))
  const rankingTotal = [...counts.values()].reduce((a, n) => a + n, 0)
  const ranking = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count, share: rankingTotal ? count / rankingTotal : 0 }))

  const activity: ActivityItem[] = [
    ...bookings.map((b): ActivityItem => {
      const when = `${capital(weekdayShort(b.slot.startsAt))}, ${shortDate(b.slot.startsAt)} às ${time(b.slot.startsAt)}`
      if (b.status === 'PENDING')
        return { id: b.id, kind: 'pedido', title: b.customerName, line: `Novo pedido · ${shortDate(b.createdAt)}`, at: b.createdAt, cents: null }
      if (b.status === 'ACCEPTED')
        return { id: b.id, kind: 'confirmada', title: b.customerName, line: `${b.service.name} · ${when}`, at: b.updatedAt, cents: bookingPrice(b) }
      if (b.status === 'CANCELLED')
        return { id: b.id, kind: 'cancelada', title: b.customerName, line: `Cancelada · ${shortDate(b.updatedAt)}`, at: b.updatedAt, cents: -bookingPrice(b) }
      return { id: b.id, kind: 'recusada', title: b.customerName, line: `Recusada · ${shortDate(b.updatedAt)}`, at: b.updatedAt, cents: null }
    }),
    ...testimonials.map(
      (t): ActivityItem => ({
        id: t.id,
        kind: 'testemunho',
        title: t.customer.name,
        line: `Testemunho${t.status === 'PENDING' ? ' por aprovar' : ''} · ${shortDate(t.createdAt)}`,
        at: t.createdAt,
        cents: null,
      }),
    ),
  ].sort((a, b) => b.at.localeCompare(a.at))

  // For the Faturação detail: what is already done and what is still to come this month, week by week and by hairstyle.
  const monthConfirmed = confirmed.filter((b) => monthOf(b.slot.startsAt) === thisMonth)
  const doneCents = sum(monthConfirmed.filter((b) => endsAt(b) <= now))
  const monthDays = new Date(Number(thisMonth.slice(0, 4)), Number(thisMonth.slice(5)), 0).getDate()
  const weeks = [0, 1, 2, 3, 4]
    .map((w) => {
      const from = w * 7 + 1
      const to = Math.min(from + 6, 31)
      const inWeek = monthConfirmed.filter((b) => {
        const d = Number(dayKey(b.slot.startsAt).slice(8))
        return d >= from && d <= to
      })
      const days = Math.min(to, monthDays) - from + 1
      return { label: `${from}–${to === 31 ? 'fim' : to}`, cents: sum(inWeek), count: inWeek.length, from, days }
    })
    .filter((w) => w.from <= monthDays)
  const byService = new Map<string, { cents: number; count: number }>()
  monthConfirmed.forEach((b) => {
    const row = byService.get(b.service.name) ?? { cents: 0, count: 0 }
    row.cents += bookingPrice(b)
    row.count += 1
    byService.set(b.service.name, row)
  })

  const upcoming = confirmed
    .filter((b) => endsAt(b) > now)
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
    .slice(0, 6)

  return {
    months,
    month: {
      revenue: current.revenue,
      revenueChange: pct(currentSoFar.revenue, lastSoFar.revenue),
      sessions: current.sessions,
      sessionsChange: pct(currentSoFar.sessions, lastSoFar.sessions),
      newClients: current.newClients,
      newClientsChange: pct(currentSoFar.newClients, lastSoFar.newClients),
      average: current.average,
      averageChange: pct(current.average, last.average),
      pendingCents: sum(pendingAll),
      pendingCount: pendingAll.length,
      cancelledCents: sum(monthCancelled),
      cancelledCount: monthCancelled.length,
      doneCents,
      toComeCents: current.revenue - doneCents,
      lastSoFarCents: lastSoFar.revenue,
      lastFullCents: last.revenue,
      dayOfMonth,
      weeks,
      services: [...byService.entries()].map(([name, row]) => ({ name, ...row })).sort((a, b) => b.cents - a.cents),
    },
    today: {
      count: todayCount,
      change: pct(todayCount, countOn(addDays(today, -7))),
      series: [-5, -4, -3, -2, -1, 0].map((by) => countOn(addDays(today, by))),
    },
    ranking,
    rankingTotal,
    activity,
    upcoming,
  }
}
type BoardData = ReturnType<typeof boardData>

/* Building blocks */

/** The block's small title, with an action on the right. */
function BlockHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-3">
      <h3 className="truncate font-subtitle text-[14px] font-semibold tracking-tight text-onyx">{title}</h3>
      {action}
    </div>
  )
}

function HeaderLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-muted-dark">
      {label}
      <ArrowRight size={13} />
    </button>
  )
}

/** "↑ 12%", green when it grew and coral when it fell. */
function Change({ value, label = 'face ao mês anterior', withLabel = false }: { value: number | null; label?: string; withLabel?: boolean }) {
  if (value === null) return <span className="text-[12px] text-ink-3">Sem comparação</span>
  const up = value >= 0
  return (
    <span className={`tabular text-[12px] font-medium ${up ? 'text-pos' : 'text-neg'}`}>
      <span aria-hidden="true">{up ? '↑' : '↓'} </span>
      {Math.abs(value)}%
      <span className={withLabel ? 'font-normal text-ink-3' : 'sr-only'}> {label}</span>
    </span>
  )
}

/** The last six periods as a small line, in the colour of the change. */
function Sparkline({ values, up, label }: { values: number[]; up: boolean | null; label: string }) {
  if (values.length < 2) return null
  const W = 64
  const H = 22
  const top = Math.max(1, ...values)
  const points = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - (v / top) * (H - 3) - 1.5).toFixed(1)}`).join(' ')
  const colour = up === null ? 'var(--c-ink-3)' : up ? 'var(--c-pos)' : 'var(--c-neg)'
  const fill = `spark-${up === null ? 'flat' : up ? 'up' : 'down'}`
  return (
    <svg role="img" aria-label={`${label}: ${values.join(', ')}`} viewBox={`0 0 ${W} ${H}`} className="h-[26px] w-[72px] shrink-0 overflow-visible">
      <defs>
        <linearGradient id={fill} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.28" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${points} ${W},${H}`} fill={`url(#${fill})`} />
      <polyline points={points} fill="none" stroke={colour} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCircle({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-onyx/[0.04] text-onyx">
      <Icon size={15} />
    </span>
  )
}

function Empty({ Icon, text, action }: { Icon: LucideIcon; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <Icon size={24} className="text-ink-3" />
      <p className="text-[13px] text-ink-3">{text}</p>
      {action}
    </div>
  )
}

/* Blocks */

/** A 1×1 figure: label and icon, the value, then the change and a sparkline of the last six periods. */
function Stat({
  label,
  Icon,
  value,
  amount = false,
  change,
  changeLabel,
  series,
  seriesLabel,
}: {
  label: string
  Icon: LucideIcon
  value: string
  amount?: boolean
  change: number | null
  changeLabel?: string
  series: number[]
  seriesLabel: string
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-subtitle text-[13px] font-semibold leading-tight tracking-tight text-onyx">{label}</h3>
        <IconCircle Icon={Icon} />
      </div>
      <p className={`tabular -mt-1 text-[22px] font-semibold tracking-tight text-ink ${amount ? 'amount' : ''}`}>{value}</p>
      <div className="mt-auto flex items-end justify-between gap-2">
        <Change value={change} label={changeLabel} />
        <Sparkline values={series} up={change === null ? null : change >= 0} label={seriesLabel} />
      </div>
    </>
  )
}

/** 2×2: the month's takings, the change, two actions, and the confirmed / waiting / cancelled split. */
function Highlight({
  data,
  onNewBooking,
  onDetail,
  onOpen,
}: {
  data: BoardData
  onNewBooking: () => void
  onDetail: () => void
  onOpen: (tab: Tab) => void
}) {
  const { month } = data
  const parts = [
    { label: 'Confirmado', value: month.revenue, colour: STATUS.confirmed },
    { label: 'Por confirmar', value: month.pendingCents, colour: STATUS.waiting },
    { label: 'Cancelado', value: month.cancelledCents, colour: STATUS.cancelled },
  ]
  return (
    <>
      <BlockHeader title={`Faturação de ${monthName(data.months[5].key)}`} action={<HeaderLink label="Detalhes" onClick={onDetail} />} />
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="amount tabular text-[30px] font-semibold leading-none tracking-tight text-ink">{euros(month.revenue)}</p>
        <Change value={month.revenueChange} />
      </div>
      <button type="button" onClick={onDetail} className="mt-3 flex min-h-0 flex-1 items-center gap-4 text-left" aria-label="Ver os detalhes">
        <Ring
          label="Estado das marcações do mês"
          size={92}
          thickness={15}
          parts={parts}
          center={
            <>
              <span className="tabular text-[17px] font-semibold leading-none text-onyx">{month.sessions}</span>
              <span className="mt-0.5 text-[10px] text-ink-3">{month.sessions === 1 ? 'sessão' : 'sessões'}</span>
            </>
          }
        />
        <RingLegend
          format={euros}
          parts={parts}
          notes={[
            plural(month.sessions, 'sessão', 'sessões'),
            plural(month.pendingCount, 'pedido', 'pedidos'),
            plural(month.cancelledCount, 'sessão', 'sessões'),
          ]}
        />
      </button>
      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onNewBooking}
          className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-onyx text-[13px] font-semibold text-white"
        >
          <Plus size={15} />
          Nova marcação
        </button>
        <button
          type="button"
          onClick={() => onOpen('pedidos')}
          className="glass-chip flex h-9 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-onyx"
        >
          Ver pedidos
        </button>
      </div>
    </>
  )
}

/**
 * The month's takings in full, in a card in the middle of the page: the total against last month, what is already done
 * and what is still to come, confirmed / waiting / cancelled, week by week and by hairstyle; Estatísticas from there.
 * In a portal so no card's transform moves it, inside .afro-admin so it keeps the Painel's colours.
 */
function RevenueDetail({ open, data, onClose, onStats }: { open: boolean; data: BoardData; onClose: () => void; onStats?: () => void }) {
  useScrollLock(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const { month } = data
  const name = monthName(data.months[5].key)
  const last = monthName(data.months[4].key)
  const weekTop = Math.max(1, ...month.weeks.map((w) => w.cents))
  const statuses = [
    { label: 'Confirmado', value: month.revenue, colour: STATUS.confirmed },
    { label: 'Por confirmar', value: month.pendingCents, colour: STATUS.waiting },
    { label: 'Cancelado', value: month.cancelledCents, colour: STATUS.cancelled },
  ]
  // Each hairstyle its own colour; past six, the rest together as "Outros".
  const services = month.services.slice(0, PALETTE.length).map((sv, i) => ({ label: sv.name, value: sv.cents, colour: PALETTE[i], count: sv.count }))
  const others = month.services.slice(PALETTE.length)
  if (others.length)
    services.push({
      label: 'Outros',
      value: others.reduce((a, sv) => a + sv.cents, 0),
      colour: OTHER,
      count: others.reduce((a, sv) => a + sv.count, 0),
    })
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="app-neutral afro-admin fixed inset-0 z-[80] flex items-center justify-center p-4 font-subtitle font-medium">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={`Faturação de ${name}`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative flex max-h-[min(88dvh,760px)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-5">
              <div>
                <h2 className="font-subtitle text-[17px] font-semibold tracking-tight text-onyx">Faturação de {name}</h2>
                <p className="mt-0.5 text-xs text-ink-3">Até dia {month.dayOfMonth}, com o que já está marcado</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx"
              >
                <X size={17} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              <p className="amount tabular mt-3 text-[36px] font-semibold leading-none tracking-tight text-onyx">{euros(month.revenue)}</p>
              <div className="mt-2">
                <Change value={month.revenueChange} label={`face a ${last} até ao mesmo dia`} withLabel />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'Já feito', cents: month.doneCents },
                  { label: 'Ainda por vir', cents: month.toComeCents },
                  { label: `${capital(last)} até dia ${month.dayOfMonth}`, cents: month.lastSoFarCents },
                  { label: `${capital(last)}, o mês todo`, cents: month.lastFullCents },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-onyx/[0.04] p-3">
                    <dt className="truncate text-xs text-ink-3">{item.label}</dt>
                    <dd className="amount tabular mt-0.5 text-[16px] font-semibold text-onyx">{euros(item.cents)}</dd>
                  </div>
                ))}
              </dl>

              <h3 className="mt-6 font-subtitle text-[14px] font-semibold tracking-tight text-onyx">Estado das marcações</h3>
              <div className="mt-3 flex items-center gap-5">
                <Ring
                  label="Estado das marcações"
                  size={132}
                  thickness={15}
                  parts={statuses}
                  center={
                    <>
                      <span className="amount tabular text-[16px] font-semibold leading-tight text-onyx">
                        {euros(statuses.reduce((a, p) => a + p.value, 0))}
                      </span>
                      <span className="text-[11px] text-ink-3">no mês</span>
                    </>
                  }
                />
                <RingLegend
                  format={euros}
                  parts={statuses}
                  notes={[
                    plural(month.sessions, 'sessão', 'sessões'),
                    plural(month.pendingCount, 'pedido', 'pedidos'),
                    plural(month.cancelledCount, 'sessão', 'sessões'),
                  ]}
                />
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-onyx/[0.04] px-4 py-3">
                <span className="text-[13px] text-onyx">Valor médio por sessão</span>
                <span className="amount tabular text-[14px] font-bold text-onyx">{euros(month.average)}</span>
              </div>

              <h3 className="mt-6 font-subtitle text-[14px] font-semibold tracking-tight text-onyx">Semana a semana</h3>
              <div
                role="img"
                aria-label={month.weeks.map((w) => `dias ${w.label}: ${euros(w.cents)}`).join('; ')}
                className="mt-3 flex h-32 items-end gap-2"
              >
                {month.weeks.map((w, i) => {
                  // By the day, so the month's short last week isn't "down" just for having fewer days.
                  const before = month.weeks[i - 1]
                  const colour = before && w.cents / w.days < before.cents / before.days ? 'var(--c-neg)' : 'var(--c-pos)'
                  return (
                    <div key={w.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span className="amount tabular text-[11px] text-ink-3">{w.cents ? euros(w.cents) : ''}</span>
                      <span
                        className="block w-full max-w-9 rounded-t-xl"
                        style={{
                          height: `${Math.max((w.cents / weekTop) * 100, w.cents ? 6 : 2)}%`,
                          background: w.cents
                            ? `linear-gradient(to bottom, color-mix(in srgb, ${colour} 70%, white), ${colour})`
                            : 'color-mix(in srgb, var(--color-onyx) 10%, transparent)',
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-1.5 flex gap-2">
                {month.weeks.map((w) => (
                  <span key={w.label} className="flex-1 text-center text-[11px] text-ink-3">
                    {w.label}
                  </span>
                ))}
              </div>

              <h3 className="mt-6 font-subtitle text-[14px] font-semibold tracking-tight text-onyx">Por penteado</h3>
              {month.services.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-3">Sem sessões confirmadas neste mês.</p>
              ) : (
                <div className="mt-3 flex items-center gap-5">
                  <Ring
                    label="Faturação por penteado"
                    size={132}
                    thickness={15}
                    parts={services}
                    center={
                      <>
                        <span className="amount tabular text-[16px] font-semibold leading-tight text-onyx">{euros(month.revenue)}</span>
                        <span className="text-[11px] text-ink-3">{plural(services.length, 'penteado', 'penteados')}</span>
                      </>
                    }
                  />
                  <RingLegend format={euros} parts={services} notes={services.map((sv) => plural(sv.count, 'sessão', 'sessões'))} />
                </div>
              )}
            </div>

            {onStats && (
              <div className="border-t border-onyx/[0.07] p-4">
                <button
                  type="button"
                  onClick={onStats}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-onyx text-[14px] font-semibold text-white"
                >
                  Ver estatísticas
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

type ChartView = 'barras' | 'linhas' | 'circular'

const CANCELLED = 'color-mix(in srgb, var(--color-onyx) 22%, transparent)'
/** Green when that month took in at least as much as the one before, red when less. */
const trend = (months: MonthFigures[], i: number) =>
  i > 0 && months[i].revenue < months[i - 1].revenue ? 'var(--c-neg)' : 'var(--c-pos)'

/** 2×2: what came in against what was cancelled, the last six months, as bars, lines or a ring. */
function InOutChart({ months }: { months: MonthFigures[] }) {
  const [view, setView] = useState<ChartView>(() => readStore<ChartView>(CHART_KEY, 'barras'))
  const choose = (next: ChartView) => {
    setView(next)
    writeStore(CHART_KEY, next)
  }
  const top = Math.max(1, ...months.flatMap((m) => [m.revenue, m.cancelled]))
  const totalIn = months.reduce((a, m) => a + m.revenue, 0)
  const totalOut = months.reduce((a, m) => a + m.cancelled, 0)
  const described = months.map((m) => `${monthLabel(m.key)}: ${euros(m.revenue)} de receita, ${euros(m.cancelled)} cancelados`).join('; ')
  const views: Array<{ id: ChartView; Icon: LucideIcon; label: string }> = [
    { id: 'barras', Icon: ChartColumn, label: 'Barras' },
    { id: 'linhas', Icon: ChartLine, label: 'Linhas' },
    { id: 'circular', Icon: ChartPie, label: 'Circular' },
  ]

  return (
    <>
      <BlockHeader
        title="Receita e cancelamentos"
        action={
          <div className="flex rounded-full bg-onyx/[0.06] p-0.5" role="tablist" aria-label="Tipo de gráfico">
            {views.map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                aria-label={label}
                onClick={() => choose(id)}
                className={`flex size-7 items-center justify-center rounded-full transition-colors ${
                  view === id ? 'bg-white text-onyx shadow-sm' : 'text-muted-dark'
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        }
      />
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: 'var(--c-pos)' }} aria-hidden="true" />
          A subir
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: 'var(--c-neg)' }} aria-hidden="true" />
          A descer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: CANCELLED }} aria-hidden="true" />
          Cancelado
        </span>
        <span className="ml-auto">Últimos 6 meses</span>
      </div>

      <div role="img" aria-label={`Receita e cancelamentos nos últimos 6 meses. ${described}.`} className="mt-3 flex min-h-0 flex-1 flex-col">
        {view === 'circular' ? (
          <div className="flex flex-1 items-center justify-center gap-5">
            <Ring
              label="Receita e cancelamentos, 6 meses"
              size={128}
              thickness={15}
              parts={[
                { label: 'Receita', value: totalIn, colour: 'var(--c-pos)' },
                { label: 'Cancelado', value: totalOut, colour: 'var(--c-neg)' },
              ]}
              center={
                <>
                  <span className="amount tabular text-[15px] font-semibold leading-tight text-onyx">{euros(totalIn)}</span>
                  <span className="text-[11px] text-ink-3">6 meses</span>
                </>
              }
            />
            <div className="max-w-[11rem] flex-1">
              <RingLegend
                format={euros}
                parts={[
                  { label: 'Receita', value: totalIn, colour: 'var(--c-pos)' },
                  { label: 'Cancelado', value: totalOut, colour: 'var(--c-neg)' },
                ]}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="relative min-h-0 flex-1">
              {view === 'barras' ? (
                <div className="absolute inset-0 flex items-end gap-2">
                  {months.map((m, i) => (
                    <div key={m.key} className="flex h-full flex-1 items-end justify-center gap-[3px]">
                      <span
                        className="block w-full max-w-4 rounded-t-full"
                        style={{
                          height: `${(m.revenue / top) * 100}%`,
                          background: `linear-gradient(to bottom, color-mix(in srgb, ${trend(months, i)} 70%, white), ${trend(months, i)})`,
                        }}
                      />
                      <span className="block w-full max-w-2.5 rounded-t-full" style={{ height: `${(m.cancelled / top) * 100}%`, background: CANCELLED }} />
                    </div>
                  ))}
                </div>
              ) : (
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                  <defs>
                    <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={trend(months, months.length - 1)} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={trend(months, months.length - 1)} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={`0,40 ${months.map((m, i) => `${(i / 5) * 100},${40 - (m.revenue / top) * 37 - 1.5}`).join(' ')} 100,40`}
                    fill="url(#revenue-area)"
                  />
                  {(['revenue', 'cancelled'] as const).map((field) => (
                    <polyline
                      key={field}
                      points={months.map((m, i) => `${(i / 5) * 100},${40 - (m[field] / top) * 37 - 1.5}`).join(' ')}
                      fill="none"
                      stroke={field === 'revenue' ? trend(months, months.length - 1) : CANCELLED}
                      strokeWidth={field === 'revenue' ? 2.5 : 1.75}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              )}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-ink-3">
              {months.map((m) => (
                <span key={m.key} className="flex-1 text-center capitalize">
                  {monthLabel(m.key)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

/** One colour per category (hairstyles, statuses…), in order; anything past them is grey. */
const PALETTE = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
const OTHER = 'color-mix(in srgb, var(--color-onyx) 25%, transparent)'
const STATUS = { confirmed: 'var(--c-pos)', waiting: '#f59e0b', cancelled: 'var(--c-neg)' }

interface RingPart {
  label: string
  value: number
  colour: string
}

/**
 * A thick ring with rounded ends and a small gap between its parts, starting at the top, with what goes in the middle
 * (usually the total). A part too small to draw still shows as a dot.
 */
function Ring({ parts, size, thickness = 14, center, label }: { parts: RingPart[]; size: number; thickness?: number; center?: ReactNode; label: string }) {
  const r = 50 - thickness / 2 - 1
  const C = 2 * Math.PI * r
  const total = parts.reduce((a, p) => a + p.value, 0)
  const shown = parts.filter((p) => p.value > 0)
  const gap = shown.length > 1 ? 5 : 0
  // Every part at least long enough to show as a short pill (its round ends plus the gap), the rest shared by value.
  const least = thickness * 2 + gap
  const small = shown.filter((p) => (p.value / total) * C < least)
  const bigTotal = shown.filter((p) => !small.includes(p)).reduce((a, p) => a + p.value, 0)
  const room = C - small.length * least
  const lengthOf = (p: RingPart) => (small.includes(p) || !bigTotal ? least : (p.value / bigTotal) * room)
  let start = 0
  return (
    <div
      role="img"
      aria-label={`${label}: ${parts.map((p) => `${p.label} ${Math.round(total ? (p.value / total) * 100 : 0)}%`).join(', ')}`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90 overflow-visible">
        {total === 0 ? (
          <circle cx="50" cy="50" r={r} fill="none" stroke="color-mix(in srgb, var(--color-onyx) 8%, transparent)" strokeWidth={thickness} />
        ) : shown.length === 1 ? (
          <circle cx="50" cy="50" r={r} fill="none" stroke={shown[0].colour} strokeWidth={thickness} />
        ) : (
          shown.map((part) => {
            const length = lengthOf(part)
            // Round ends reach half the thickness past the dash, on each side.
            const dash = Math.max(length - thickness - gap, 0.01)
            const offset = -(start + thickness / 2 + gap / 2)
            start += length
            return (
              <circle
                key={part.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={part.colour}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                strokeDashoffset={offset}
              />
            )
          })
        )}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  )
}

/** The ring's legend: a dot, the name, and the value in bold (with a small note under the name when given). */
function RingLegend({ parts, format, notes }: { parts: RingPart[]; format: (v: number) => string; notes?: string[] }) {
  return (
    <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
      {parts.map((p, i) => (
        <li key={p.label} className="flex min-w-0 items-center gap-2.5">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.colour }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-onyx">{p.label}</span>
            {notes?.[i] && <span className="block truncate text-[11px] text-ink-3">{notes[i]}</span>}
          </span>
          <span className="amount tabular shrink-0 text-[14px] font-bold text-onyx">{format(p.value)}</span>
        </li>
      ))}
    </ul>
  )
}

/** 2×1: how far the month is from the goal. */
function Goal({ goal, revenue, canEdit, onEdit }: { goal: number | null; revenue: number; canEdit: boolean; onEdit: () => void }) {
  const share = goal ? revenue / goal : 0
  return (
    <>
      <BlockHeader
        title="Meta mensal"
        action={
          canEdit &&
          !!goal && (
            <button type="button" onClick={onEdit} className="text-[13px] font-medium text-muted-dark">
              Editar
            </button>
          )
        }
      />
      {goal === null ? (
        <div className="mt-auto h-2.5 animate-pulse rounded-full bg-onyx/[0.08]" />
      ) : !goal ? (
        <Empty
          Icon={Target}
          text="Ainda sem meta para o mês."
          action={
            canEdit && (
              <button type="button" onClick={onEdit} className="glass-chip h-8 rounded-full px-3.5 text-xs font-semibold text-onyx">
                Definir
              </button>
            )
          }
        />
      ) : (
        <>
          <p className="tabular mt-2 text-[13px] text-ink-3">
            <span className="amount text-[22px] font-semibold tracking-tight text-ink">{euros(revenue)}</span>{' '}
            de <span className="amount">{euros(goal)}</span>
          </p>
          <div className="mt-auto">
            <div
              className="h-2.5 overflow-hidden rounded-full bg-onyx/[0.08]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              aria-label="Progresso da meta"
            >
              <div className="h-full rounded-full" style={{ width: `${Math.min(share, 1) * 100}%`, background: 'var(--c-pos)' }} />
            </div>
            <p className="mt-2 text-[12px] text-ink-3">
              {share >= 1 ? (
                <>
                  Ultrapassaste a meta em <span className="amount font-medium text-ink">{euros(revenue - goal)}</span> 🎉
                </>
              ) : (
                <>
                  {Math.round(share * 100)}% da meta · faltam <span className="amount font-medium text-ink">{euros(goal - revenue)}</span>
                </>
              )}
            </p>
          </div>
        </>
      )}
    </>
  )
}

function GoalSheet({
  current,
  onClose,
  onSaved,
}: {
  current: number
  onClose: () => void
  onSaved: (cents: number) => void
}) {
  // Mounted only while open, so it always starts from the current goal.
  const [value, setValue] = useState(current ? String(Math.round(current / 100)) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const euro = Number(value.replace(',', '.'))
  return (
    <Sheet
      open
      title="Meta mensal"
      description="Quanto queres faturar por mês. Aparece no Painel com o teu progresso."
      icon="bx bx-target-lock"
      submitLabel="Guardar"
      busy={busy}
      error={error}
      submitDisabled={!Number.isFinite(euro) || euro < 0}
      onClose={onClose}
      onSubmit={async () => {
        setBusy(true)
        setError(null)
        try {
          const saved = await api.put<{ monthlyCents: number }>('/admin/goal', { monthlyCents: Math.round(euro * 100) })
          onSaved(saved.monthlyCents)
        } catch (err) {
          setError(
            err instanceof ApiError && err.status === 404
              ? 'O servidor ainda não tem esta opção. Tenta depois da próxima atualização.'
              : 'Não foi possível guardar a meta.',
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <SheetField label="Valor (€)">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ''))}
          placeholder="Ex.: 3000"
          className={sheetFieldClass}
        />
      </SheetField>
    </Sheet>
  )
}

const RANK_COLOURS = PALETTE

/** 1×2: the five most booked hairstyles of the last 90 days. */
function Ranking({ items, total }: { items: BoardData['ranking']; total: number }) {
  return (
    <>
      <BlockHeader title="Mais pedidos" />
      {items.length === 0 ? (
        <Empty Icon={ChartColumn} text="Sem marcações nos últimos 90 dias." />
      ) : (
        <ol className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
          {items.map((item, i) => (
            <li key={item.label} className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: RANK_COLOURS[i] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{item.label}</span>
                <span className="tabular shrink-0 text-xs text-ink-3">
                  {item.count} · {Math.round(item.share * 100)}%
                </span>
              </div>
              <div className="ml-4 mt-1 h-1.5 overflow-hidden rounded-full bg-onyx/[0.08]">
                <div className="h-full rounded-full" style={{ width: `${item.share * 100}%`, background: RANK_COLOURS[i] }} />
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="tabular mt-auto pt-2 text-xs text-ink-3">{total} em 90 dias</p>
    </>
  )
}

const ACTIVITY_LOOK: Record<ActivityItem['kind'], { Icon: LucideIcon; tone: string }> = {
  pedido: { Icon: Hourglass, tone: 'var(--c-warn)' },
  confirmada: { Icon: CalendarCheck, tone: 'var(--c-pos)' },
  cancelada: { Icon: CalendarX2, tone: 'var(--c-neg)' },
  recusada: { Icon: CalendarX2, tone: 'var(--c-ink-3)' },
  testemunho: { Icon: MessageSquareQuote, tone: 'var(--c-brand)' },
}
const ACTIVITY_FILTERS: Array<{ id: 'todas' | ActivityItem['kind']; label: string }> = [
  { id: 'todas', label: 'Tudo' },
  { id: 'pedido', label: 'Pedidos' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'cancelada', label: 'Canceladas' },
  { id: 'testemunho', label: 'Testemunhos' },
]

/** 2×2: the latest of what happened, with a search and a filter; only the rows that fit. */
function Activity({ items, onOpen }: { items: ActivityItem[]; onOpen: (tab: Tab) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof ACTIVITY_FILTERS)[number]['id']>('todas')
  const [menu, setMenu] = useState(false)
  const shown = items.filter(
    (n) =>
      (filter === 'todas' || n.kind === filter) &&
      (!query.trim() || `${n.title} ${n.line}`.toLowerCase().includes(query.trim().toLowerCase())),
  )
  return (
    <>
      <BlockHeader title="Atividade recente" action={<HeaderLink label="Ver todos" onClick={() => onOpen('pedidos')} />} />
      <div className="mt-3 flex gap-2">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-onyx/[0.04] px-3">
          <Search size={15} className="shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar"
            aria-label="Pesquisar na atividade"
            className="min-w-0 flex-1 !border-0 !bg-transparent !p-0 text-[13px] text-onyx !shadow-none outline-none placeholder:text-muted-dark"
          />
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-onyx ${
              filter === 'todas' ? 'glass-chip' : 'glass-chip-on'
            }`}
          >
            <ListFilter size={15} />
            {filter === 'todas' ? 'Filtro' : ACTIVITY_FILTERS.find((f) => f.id === filter)?.label}
          </button>
          <AnimatePresence>
            {menu && (
              <motion.ul
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                role="menu"
                className="absolute right-0 top-full z-20 mt-1.5 w-44 origin-top-right overflow-hidden rounded-2xl bg-white p-1 shadow-[var(--shadow-pop)]"
              >
                {ACTIVITY_FILTERS.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={filter === f.id}
                      onClick={() => {
                        setFilter(f.id)
                        setMenu(false)
                      }}
                      className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-[13px] text-ink hover:bg-onyx/[0.04]"
                    >
                      {f.label}
                      {filter === f.id && <Check size={15} className="text-onyx" />}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
      {shown.length === 0 ? (
        <Empty Icon={Search} text={query || filter !== 'todas' ? 'Nenhum resultado encontrado.' : 'Ainda sem atividade.'} />
      ) : (
        <ul className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
          {shown.slice(0, 4).map((n, i) => {
            const { Icon, tone } = ACTIVITY_LOOK[n.kind]
            return (
              // Three fit on a phone, four on a wider screen.
              <li key={`${n.kind}-${n.id}`} className={i >= 3 ? 'hidden sm:block' : ''}>
                <button
                  type="button"
                  onClick={() => onOpen(n.kind === 'testemunho' ? 'testemunhos' : n.kind === 'pedido' ? 'pedidos' : 'agenda')}
                  className="flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left hover:bg-onyx/[0.04]"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{n.title}</span>
                    <span className="block truncate text-[12px] text-ink-3">{n.line}</span>
                  </span>
                  {n.cents !== null && (
                    <span className={`amount tabular shrink-0 text-[13px] font-semibold ${n.cents >= 0 ? 'text-pos' : 'text-neg'}`}>
                      {n.cents >= 0 ? '+' : '−'}
                      {euros(Math.abs(n.cents))}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/** 2×2: the next sessions; the one going on shows how far along it is. */
function Upcoming({ bookings, onOpen, onNewBooking }: { bookings: Booking[]; onOpen: () => void; onNewBooking: () => void }) {
  const now = Date.now()
  const today = todayKey()
  return (
    <>
      <BlockHeader title="Próximas marcações" action={<HeaderLink label="Gerir" onClick={onOpen} />} />
      {bookings.length === 0 ? (
        <Empty
          Icon={Clock}
          text="Sem marcações à frente."
          action={
            <button type="button" onClick={onNewBooking} className="glass-chip h-8 rounded-full px-3.5 text-xs font-semibold text-onyx">
              Adicionar
            </button>
          }
        />
      ) : (
        <ul className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
          {bookings.slice(0, 4).map((b) => {
            const start = new Date(b.slot.startsAt).getTime()
            const end = endsAt(b)
            const live = start <= now && now < end
            const key = dayKey(b.slot.startsAt)
            const day = key === today ? 'Hoje' : key === addDays(today, 1) ? 'Amanhã' : capital(weekdayShort(b.slot.startsAt))
            return (
              <li key={b.id}>
                <div className="flex items-center gap-3 rounded-xl px-1.5 py-1.5">
                  <span
                    className={`tabular flex size-9 shrink-0 flex-col items-center justify-center rounded-full text-[11px] font-semibold leading-none ${
                      live ? 'bg-onyx text-white' : 'bg-onyx/[0.04] text-onyx'
                    }`}
                  >
                    {time(start)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{b.customerName}</span>
                    <span className="block truncate text-[12px] text-ink-3">
                      {live ? `A decorrer · termina às ${time(end)}` : `${day} · ${bookingName(b)} · ${lengthLabel(end - start)}`}
                    </span>
                    {live && (
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-onyx/[0.08]">
                        <span className="block h-full rounded-full bg-onyx" style={{ width: `${((now - start) / (end - start)) * 100}%` }} />
                      </span>
                    )}
                  </span>
                  <span className="amount tabular shrink-0 text-[13px] font-semibold text-ink">{euros(bookingPrice(b))}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/** A new account: four steps that bring the Painel to life, instead of empty blocks. */
function FirstSteps({
  services,
  slots,
  onOpen,
  onNewBooking,
}: {
  services: Service[]
  slots: AvailabilitySlot[]
  onOpen: (tab: Tab) => void
  onNewBooking: () => void
}) {
  const info = getBusinessInfo()
  const steps = [
    { title: 'Adiciona o primeiro serviço', text: 'Os penteados que fazes, com duração e preço.', done: services.length > 0, label: 'Serviços', run: () => onOpen('servicos') },
    { title: 'Abre os teus horários', text: 'Os dias e horas em que as clientes podem marcar.', done: slots.length > 0, label: 'Horários', run: () => onOpen('disponibilidade') },
    { title: 'Preenche os dados do negócio', text: 'Contactos, morada e política de cancelamento.', done: !!(info.whatsappNumber || info.address), label: 'Definições', run: () => onOpen('definicoes') },
    { title: 'Regista a primeira marcação', text: 'Ou espera pelo primeiro pedido de uma cliente.', done: false, label: 'Nova marcação', run: onNewBooking },
  ]
  return (
    <section className="max-w-2xl rounded-3xl bg-card p-5 sm:p-6">
      <h2 className="font-subtitle text-[17px] font-semibold tracking-tight text-onyx">Primeiros passos</h2>
      <p className="mt-1 text-[14px] text-ink-3">Completa estes passos e o teu painel ganha vida.</p>
      <ol className="mt-5 flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              className={`tabular flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                step.done ? 'bg-onyx text-white' : 'bg-onyx/[0.06] text-ink-3'
              }`}
            >
              {step.done ? <Check size={14} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">{step.title}</p>
              <p className="text-[12px] text-ink-3">{step.text}</p>
            </div>
            {!step.done && (
              <button
                type="button"
                onClick={step.run}
                className="glass-chip h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold text-onyx"
              >
                {step.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
