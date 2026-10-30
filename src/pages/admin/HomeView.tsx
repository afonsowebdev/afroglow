import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { animate, AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  ArrowLeftRight,
  CalendarCheck,
  CalendarPlus,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChartColumn,
  ChartLine,
  ChartPie,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Hash,
  Hourglass,
  Maximize2,
  Minimize2,
  ListFilter,
  RotateCcw,
  SlidersHorizontal,
  MessageSquareQuote,
  Receipt,
  Scissors,
  Search,
  Target,
  UserPlus,
  X,
  Wallet,
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
const COMPARE_KEY = 'afroadmin:painel-comparacao'
const HIDE_KEY = 'afroadmin:esconder-valores'
const SIZE_KEY = 'afroadmin:painel-tamanhos'

type Tab = 'pedidos' | 'agenda' | 'disponibilidade' | 'clientes' | MoreTarget
type BlockId = 'faturacao' | 'sessoes' | 'hoje' | 'grafico' | 'clientes' | 'ticket' | 'meta' | 'servicos' | 'atividade' | 'proximas'

/** The board's blocks: their usual size, and the sizes they can take while personalising (smallest first). */
const BLOCKS: Array<{ id: BlockId; size: WidgetSize; label: string; sizes: WidgetSize[] }> = [
  { id: 'faturacao', size: 'lg', label: 'Faturação do mês', sizes: ['wide', 'lg'] },
  { id: 'sessoes', size: 'sm', label: 'Sessões do mês', sizes: ['sm', 'wide', 'lg'] },
  { id: 'hoje', size: 'sm', label: 'Marcações de hoje', sizes: ['sm', 'wide', 'lg'] },
  { id: 'grafico', size: 'lg', label: 'Receita e cancelamentos', sizes: ['wide', 'lg'] },
  { id: 'clientes', size: 'sm', label: 'Clientes novas', sizes: ['sm', 'wide', 'lg'] },
  { id: 'ticket', size: 'sm', label: 'Valor médio por sessão', sizes: ['sm', 'wide', 'lg'] },
  { id: 'meta', size: 'wide', label: 'Meta mensal', sizes: ['sm', 'wide'] },
  { id: 'servicos', size: 'tall', label: 'Mais pedidos', sizes: ['wide', 'tall', 'lg'] },
  { id: 'atividade', size: 'lg', label: 'Atividade recente', sizes: ['wide', 'lg'] },
  { id: 'proximas', size: 'lg', label: 'Próximas marcações', sizes: ['wide', 'lg'] },
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
/** "Out". */
const shortMonth = (key: string) => capital(monthName(key).slice(0, 3))
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

/** The saved order, with any block added since then at the end, each at its saved size (when it can take it). */
function loadOrder(): Array<WidgetItem & { id: BlockId }> {
  const saved = readStore<string[]>(ORDER_KEY, [])
  const sizes = readStore<Partial<Record<BlockId, WidgetSize>>>(SIZE_KEY, {})
  const known = saved.map((id) => BLOCKS.find((b) => b.id === id)).filter((b): b is (typeof BLOCKS)[number] => !!b)
  const all = [...known, ...BLOCKS.filter((b) => !known.includes(b))]
  return all.map(({ id, size, label, sizes: allowed }) => {
    const saved = sizes[id]
    return { id, size: saved && allowed.includes(saved) ? saved : size, label, sizes: allowed }
  })
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
  // The month the board shows (this one by default), chosen from the calendar button on top.
  const currentMonth = todayKey().slice(0, 7)
  const [viewMonth, setViewMonth] = useState(currentMonth)
  const [monthMenu, setMonthMenu] = useState(false)
  const pastMonth = viewMonth !== currentMonth

  useEffect(() => {
    api
      .get<{ monthlyCents: number }>('/admin/goal')
      .then((data) => setGoal(data.monthlyCents))
      .catch(() => setGoal(0))
  }, [])

  const header = (
    <div className="mb-7">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate font-subtitle text-[28px] font-semibold leading-tight tracking-tight text-onyx sm:text-[32px]">
          {homeGreeting(name)}
        </h1>
        {loaded && bookings.length > 0 && (
          // The board controls together in one glass pill; while personalising it turns into Repor and Concluir.
          <motion.div layout transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="glass-chip relative z-30 flex shrink-0 items-center gap-0.5 rounded-full p-1">
            <AnimatePresence mode="popLayout" initial={false}>
            {editing ? (
              <motion.span
                key="editing"
                className="flex items-center gap-0.5"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  aria-label="Repor a ordem dos cartões"
                  onClick={() => {
                    void tap()
                    writeStore(ORDER_KEY, BLOCKS.map((b) => b.id))
                    writeStore(SIZE_KEY, {})
                    setOrder(loadOrder())
                    setBoardKey((k) => k + 1)
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium text-muted-dark transition-colors hover:bg-onyx/[0.06]"
                >
                  <RotateCcw size={15} />
                  <span className="hidden sm:inline">Repor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void tap()
                    setEditing(false)
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-semibold text-onyx shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] transition-transform active:scale-95 dark:bg-onyx/[0.16]"
                >
                  <Check size={15} strokeWidth={2.6} style={{ color: 'var(--c-confirmed)' }} />
                  Concluir
                </button>
              </motion.span>
            ) : (
              <motion.span
                key="board"
                className="flex items-center gap-0.5"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  aria-label={hidden ? 'Mostrar valores' : 'Esconder valores'}
                  aria-pressed={hidden}
                  title={hidden ? 'Mostrar valores' : 'Esconder valores'}
                  onClick={() => {
                    void tap()
                    setHidden(!hidden)
                    writeStore(HIDE_KEY, !hidden)
                  }}
                  className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                    hidden ? 'bg-onyx text-white' : 'text-onyx hover:bg-onyx/[0.06]'
                  }`}
                >
                  {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <span className="h-4 w-px bg-onyx/15" aria-hidden="true" />
                {/* The month shown: this one, or one before it. */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Escolher o mês"
                    aria-expanded={monthMenu}
                    title="Mês"
                    onClick={() => {
                      void tap()
                      setMonthMenu((v) => !v)
                    }}
                    className={`flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-[13px] font-semibold transition-colors ${
                      pastMonth ? 'bg-onyx/[0.07] text-onyx' : 'text-onyx hover:bg-onyx/[0.06]'
                    }`}
                  >
                    <CalendarDays size={16} />
                    {pastMonth && <span className="capitalize">{shortMonth(viewMonth)}</span>}
                  </button>
                  <AnimatePresence>
                    {monthMenu && (
                      <>
                        <button type="button" aria-label="Fechar" className="fixed inset-0 z-30 cursor-default" onClick={() => setMonthMenu(false)} />
                        <motion.ul
                          role="menu"
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute right-0 top-full z-40 mt-2 max-h-80 w-48 origin-top-right overflow-y-auto rounded-[20px] bg-card p-1.5 shadow-[var(--shadow-pop)]"
                        >
                          {Array.from({ length: 12 }, (_, i) => shiftMonth(currentMonth, -i)).map((key, i) => (
                            <li key={key}>
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={viewMonth === key}
                                onClick={() => {
                                  void tap()
                                  setViewMonth(key)
                                  setMonthMenu(false)
                                }}
                                className={`flex h-10 w-full items-center justify-between rounded-xl px-3 text-left text-[14px] ${
                                  viewMonth === key ? 'bg-onyx/[0.06] font-semibold text-onyx' : 'text-onyx hover:bg-onyx/[0.04]'
                                }`}
                              >
                                <span className="capitalize">
                                  {monthName(key)}
                                  {key.slice(0, 4) !== currentMonth.slice(0, 4) && <span className="ml-1 text-muted-dark">{key.slice(0, 4)}</span>}
                                </span>
                                {i === 0 ? (
                                  <span className="text-[11px] font-medium text-muted-dark">Este mês</span>
                                ) : (
                                  viewMonth === key && <Check size={15} />
                                )}
                              </button>
                            </li>
                          ))}
                        </motion.ul>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <span className="h-4 w-px bg-onyx/15" aria-hidden="true" />
                <button
                  type="button"
                  aria-label="Personalizar os cartões"
                  title="Personalizar"
                  onClick={() => {
                    void tap()
                    setEditing(true)
                  }}
                  className="flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-medium text-onyx transition-colors hover:bg-onyx/[0.06] sm:px-3"
                >
                  <SlidersHorizontal size={16} />
                  <span className="hidden sm:inline">Personalizar</span>
                </button>
              </motion.span>
            )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      <p className="mt-2 max-w-xl text-sm text-muted-dark">
        {editing
          ? 'Arrasta os blocos para os mudar de lugar (no telemóvel, mantém o dedo premido) e usa os botões em baixo de cada um para o reduzir ou aumentar.'
          : hidden
            ? 'Os valores estão escondidos. Toca no olho para os voltares a ver.'
            : 'Fica a par do teu negócio e acompanha o teu progresso.'}
      </p>
      {pastMonth && !editing && (
        <div className="mt-3 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-onyx/[0.06] px-3 py-1.5 text-[12px] font-semibold text-onyx">
            <CalendarDays size={13} />
            <span className="capitalize">
              {monthName(viewMonth)} {viewMonth.slice(0, 4)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              void tap()
              setViewMonth(currentMonth)
            }}
            className="glass-chip flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-onyx"
          >
            <RotateCcw size={12} strokeWidth={2.4} />
            Voltar a este mês
          </button>
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

  const data = boardData({ bookings, testimonials: can('testemunhos') ? testimonials : [], month: viewMonth })
  const canStats = can('estatisticas')

  /** Makes a block smaller or bigger (one step through the sizes it can take); only that card changes on the board. */
  const resize = (id: BlockId, size: WidgetSize) => {
    void tap()
    const next = order.map((b) => (b.id === id ? { ...b, size } : b))
    writeStore(SIZE_KEY, Object.fromEntries(next.map((b) => [b.id, b.size])))
    setOrder(next)
  }

  const render = (id: BlockId, size: WidgetSize): ReactNode => {
    switch (id) {
      case 'faturacao':
        return (
          <Highlight data={data} compact={size === 'wide'} onNewBooking={() => onNewBooking()} onDetail={() => setDetailOpen(true)} onOpen={onOpen} />
        )
      case 'sessoes':
        return (
          <Stat
            label="Sessões do mês"
            Icon={CalendarCheck}
            value={String(data.month.sessions)}
            count={data.month.sessions}
            change={data.month.sessionsChange}
            series={data.months.map((m) => m.sessions)}
            seriesNames={data.months.map((m) => shortMonth(m.key))}
            seriesLabel="Sessões por mês, nos últimos 6 meses"
            size={size}
          />
        )
      case 'hoje':
        return (
          <Stat
            label="Marcações de hoje"
            Icon={CalendarClock}
            value={String(data.today.count)}
            count={data.today.count}
            change={data.today.change}
            changeLabel="face à semana passada"
            series={data.today.series}
            seriesNames={data.today.days}
            seriesLabel="Marcações por dia, nos últimos 6 dias"
            size={size}
          />
        )
      case 'clientes':
        return (
          <Stat
            label="Clientes novas"
            Icon={UserPlus}
            value={String(data.month.newClients)}
            count={data.month.newClients}
            change={data.month.newClientsChange}
            series={data.months.map((m) => m.newClients)}
            seriesNames={data.months.map((m) => shortMonth(m.key))}
            seriesLabel="Clientes novas por mês, nos últimos 6 meses"
            size={size}
          />
        )
      case 'ticket':
        return (
          <Stat
            label="Valor médio"
            Icon={Receipt}
            value={euros(data.month.average)}
            count={data.month.average}
            amount
            change={data.month.averageChange}
            series={data.months.map((m) => m.average)}
            seriesNames={data.months.map((m) => shortMonth(m.key))}
            seriesLabel="Valor médio por sessão, nos últimos 6 meses"
            size={size}
          />
        )
      case 'grafico':
        return <InOutChart months={data.months} goal={goal ?? 0} compact={size === 'wide'} />
      case 'meta':
        return <Goal goal={goal} revenue={data.month.revenue} canEdit={canStats} onEdit={() => setGoalOpen(true)} small={size === 'sm'} />
      case 'servicos':
        return <Ranking items={data.ranking} total={data.rankingTotal} rows={size === 'wide' ? 2 : 5} />
      case 'atividade':
        return <Activity items={data.activity} onOpen={onOpen} compact={size === 'wide'} />
      case 'proximas':
        return <Upcoming bookings={data.upcoming} onOpen={() => onOpen('agenda')} onNewBooking={() => onNewBooking()} compact={size === 'wide'} />
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
        onChange={(next) => {
          // A drop can also shrink the card it lands on: keep its new size too.
          setOrder(next)
          writeStore(ORDER_KEY, next.map((b) => b.id))
          writeStore(SIZE_KEY, Object.fromEntries(next.map((b) => [b.id, b.size])))
        }}
        renderItem={(item, size) => (
          <>
            <div className={`flex h-full flex-col p-4 2xl:p-5 ${editing ? 'pointer-events-none' : ''}`}>{render(item.id, size)}</div>
            {editing &&
              (() => {
                // Smaller and bigger, one step at a time through the sizes this block can take.
                const allowed = BLOCKS.find((b) => b.id === item.id)?.sizes ?? [item.size]
                const at = allowed.indexOf(item.size)
                const smaller = at > 0 ? allowed[at - 1] : null
                const bigger = at < allowed.length - 1 ? allowed[at + 1] : null
                if (!smaller && !bigger) return null
                return (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="glass-chip absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-card/80 p-1 shadow-[var(--card-shadow)]"
                  >
                    <button
                      type="button"
                      disabled={!smaller}
                      aria-label="Reduzir"
                      onClick={() => smaller && resize(item.id, smaller)}
                      className="flex size-8 items-center justify-center rounded-full text-onyx transition-transform active:scale-90 disabled:opacity-30"
                    >
                      <Minimize2 size={14} />
                    </button>
                    <span className="h-4 w-px bg-onyx/15" aria-hidden="true" />
                    <button
                      type="button"
                      disabled={!bigger}
                      aria-label="Aumentar"
                      onClick={() => bigger && resize(item.id, bigger)}
                      className="flex size-8 items-center justify-center rounded-full text-onyx transition-transform active:scale-90 disabled:opacity-30"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                )
              })()}
          </>
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

function boardData({ bookings, testimonials, month: chosen }: { bookings: Booking[]; testimonials: Testimonial[]; month?: string }) {
  const now = Date.now()
  const today = todayKey()
  // The month the board shows: this one, or one before it chosen on top (then compared whole, against the one before).
  const thisMonth = chosen ?? today.slice(0, 7)
  const isCurrent = thisMonth === today.slice(0, 7)
  const dayOfMonth = isCurrent ? Number(today.slice(8)) : new Date(Number(thisMonth.slice(0, 4)), Number(thisMonth.slice(5)), 0).getDate()
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
  // For the comparison in the Faturação detail: the last twelve months, each day by day as a running total.
  const daily = Array.from({ length: 12 }, (_, i) => {
    const key = shiftMonth(thisMonth, -i)
    const length = new Date(Number(key.slice(0, 4)), Number(key.slice(5)), 0).getDate()
    const perDay = Array<number>(length).fill(0)
    confirmed.forEach((b) => {
      if (monthOf(b.slot.startsAt) === key) perDay[Number(dayKey(b.slot.startsAt).slice(8)) - 1] += bookingPrice(b)
    })
    let total = 0
    return { key, running: perDay.map((v) => (total += v)) }
  })
  const current = months[5]
  // Against last month up to the same day, so a month just begun isn't "down".
  const lastSoFar = figuresFor(shiftMonth(thisMonth, -1), dayOfMonth)
  const currentSoFar = figuresFor(thisMonth, dayOfMonth)
  const last = months[4]

  // Today, against the same weekday last week; the series is the last six days.
  const countOn = (key: string) => bookings.filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && dayKey(b.slot.startsAt) === key).length
  const todayCount = countOn(today)

  const pendingAll = bookings.filter((b) =>
    isCurrent ? b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now : b.status === 'PENDING' && monthOf(b.slot.startsAt) === thisMonth,
  )
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
    daily,
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
      // "Sáb", "Dom", … "Hoje".
      days: [-5, -4, -3, -2, -1, 0].map((by) =>
        by === 0 ? 'Hoje' : capital(new Date(`${addDays(today, by)}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: 'short' }).slice(0, 3)),
      ),
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

/**
 * A figure: label and icon, the value and its change, then the last six periods as bars. Small, the bars run along the
 * bottom of the card; widened (2×1), the figure stays on the left and the bars take the rest, bigger, each with its name below
 * and its number above.
 */
function Stat({
  label,
  Icon,
  value,
  amount = false,
  change,
  changeLabel,
  series,
  seriesNames,
  seriesLabel,
  size = 'sm',
  count,
}: {
  label: string
  Icon: LucideIcon
  value: string
  amount?: boolean
  change: number | null
  changeLabel?: string
  series: number[]
  seriesNames: string[]
  seriesLabel: string
  size?: WidgetSize
  /** The figure as a number, so it counts up when it first shows (shown with `value`'s format: euros when `amount`). */
  count?: number
}) {
  const shownValue = count === undefined ? value : <CountUp value={count} format={amount ? euros : String} />
  const tone = change === null ? 'var(--c-ink-3)' : change >= 0 ? 'var(--c-pos)' : 'var(--c-neg)'
  // Big (2×2 or 1×2): the figure on top and the bars below, as large as the card allows.
  if (size === 'lg' || size === 'tall') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-subtitle text-[13px] font-semibold leading-tight tracking-tight text-onyx">{label}</h3>
          <IconCircle Icon={Icon} />
        </div>
        <div className="-mt-1 flex items-baseline justify-between gap-2">
          <p className={`tabular text-[28px] font-semibold leading-tight tracking-tight text-ink ${amount ? 'amount' : ''}`}>{shownValue}</p>
          <Change value={change} label={changeLabel} />
        </div>
        <div className="mt-3 flex min-h-0 flex-1">
          <MiniBars values={series} names={seriesNames} tone={tone} label={seriesLabel} amount={amount} large />
        </div>
      </div>
    )
  }
  const wide = size === 'wide'
  if (wide) {
    return (
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-[38%] shrink-0 flex-col">
          <h3 className="font-subtitle text-[13px] font-semibold leading-tight tracking-tight text-onyx">{label}</h3>
          <p className={`tabular mt-1 text-[26px] font-semibold leading-tight tracking-tight text-ink ${amount ? 'amount' : ''}`}>{shownValue}</p>
          <div className="mt-auto">
            <Change value={change} label={changeLabel} />
          </div>
        </div>
        <MiniBars values={series} names={seriesNames} tone={tone} label={seriesLabel} amount={amount} large />
      </div>
    )
  }
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-subtitle text-[13px] font-semibold leading-tight tracking-tight text-onyx">{label}</h3>
        <IconCircle Icon={Icon} />
      </div>
      <div className="-mt-1 flex items-baseline justify-between gap-2">
        <p className={`tabular text-[22px] font-semibold tracking-tight text-ink ${amount ? 'amount' : ''}`}>{shownValue}</p>
        <Change value={change} label={changeLabel} />
      </div>
      <div className="mt-auto pt-2">
        <MiniBars values={series} names={seriesNames} tone={tone} label={seriesLabel} amount={amount} />
      </div>
    </>
  )
}

/**
 * The last periods as thin bars standing on a base line, the latest in the figure's colour. At zero there is only the
 * line; as the numbers rise, the bars grow up from it.
 */
function MiniBars({ values, names, tone, label, amount = false, large = false }: { values: number[]; names: string[]; tone: string; label: string; amount?: boolean; large?: boolean }) {
  const top = Math.max(1, ...values)
  const last = values.length - 1
  const shown = (v: number) => (amount ? euros(v) : String(v))
  return (
    <div
      role="img"
      aria-label={`${label}: ${values.map((v, i) => `${names[i]} ${shown(v)}`).join(', ')}`}
      className={large ? 'flex min-w-0 flex-1 flex-col' : 'w-full'}
    >
      <div className={`flex items-end border-b-[1.5px] border-onyx/15 ${large ? 'min-h-0 flex-1 gap-1.5 pt-4' : 'h-9 gap-1.5'}`}>
        {values.map((v, i) => {
          const height = `${(v / top) * 100}%`
          return (
            <div key={i} className="relative h-full flex-1">
              <motion.span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 mx-auto block rounded-t-full ${large ? 'max-w-3' : 'max-w-2'}`}
                style={{
                  background:
                    i === last ? `linear-gradient(to bottom, color-mix(in srgb, ${tone} 70%, white), ${tone})` : 'color-mix(in srgb, var(--color-onyx) 16%, transparent)',
                }}
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
              {large && v > 0 && (
                <span
                  className={`tabular absolute inset-x-0 mb-1 text-center text-[10px] ${i === last ? 'font-bold text-onyx' : 'text-ink-3'} ${amount ? 'amount' : ''}`}
                  style={{ bottom: height }}
                >
                  {shown(v)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {large && (
        <div className="mt-1 flex gap-1.5">
          {names.map((n, i) => (
            <span key={i} className={`flex-1 truncate text-center text-[10px] ${i === last ? 'font-semibold text-onyx' : 'text-ink-3'}`}>
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** 2×2: the month's takings, the change, two actions, and the confirmed / waiting / cancelled split. */
function Highlight({
  data,
  compact = false,
  onNewBooking,
  onDetail,
  onOpen,
}: {
  data: BoardData
  /** 2×1: the takings, the change and the split as one bar, with Detalhes. */
  compact?: boolean
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
  if (compact) {
    const sum = parts.reduce((a, p) => a + p.value, 0) || 1
    return (
      <button type="button" onClick={onDetail} className="flex min-h-0 flex-1 flex-col text-left" aria-label="Ver os detalhes da faturação">
        <span className="flex items-center justify-between gap-2">
          <span className="font-subtitle text-[13px] font-semibold tracking-tight text-onyx">Faturação de {monthName(data.months[5].key)}</span>
          <ChevronRight size={16} className="shrink-0 text-ink-3" />
        </span>
        <span className="mt-1 flex items-end justify-between gap-3">
          <span className="amount tabular text-[26px] font-semibold leading-none tracking-tight text-ink">
            <CountUp value={month.revenue} format={euros} />
          </span>
          <Change value={month.revenueChange} />
        </span>
        <span className="mt-auto flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {parts.map((p, i) =>
            p.value > 0 ? (
              <motion.span
                key={p.label}
                className="h-full rounded-full"
                style={{ background: p.colour }}
                initial={{ width: 0 }}
                animate={{ width: `${(p.value / sum) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.12, ease: ENTER_EASE }}
              />
            ) : null,
          )}
        </span>
        <span className="mt-1.5 flex gap-3 text-[11px] text-ink-3">
          {parts.map((p) => (
            <span key={p.label} className="flex items-center gap-1 truncate">
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: p.colour }} />
              <span className="amount tabular font-medium text-ink">{euros(p.value)}</span>
            </span>
          ))}
        </span>
      </button>
    )
  }
  return (
    <>
      <BlockHeader title={`Faturação de ${monthName(data.months[5].key)}`} action={
          <button
            type="button"
            onClick={() => {
              void tap()
              onDetail()
            }}
            className="glass-chip flex h-8 shrink-0 items-center gap-1.5 rounded-full pe-2 ps-2.5 text-[12px] font-semibold text-onyx transition-transform active:scale-[0.96]"
          >
            <ChartPie size={14} strokeWidth={2.2} />
            Detalhes
            <ChevronRight size={14} strokeWidth={2.4} className="text-muted-dark" />
          </button>
        }
      />
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="amount tabular text-[30px] font-semibold leading-none tracking-tight text-ink">
          <CountUp value={month.revenue} format={euros} />
        </p>
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
              <span className="tabular text-[17px] font-semibold leading-none text-onyx"><CountUp value={month.sessions} /></span>
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
      <div className="mt-3 flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            void tap('medium')
            onNewBooking()
          }}
          // The same glass pill as Detalhes: icon and words, with the arrow in a round white chip like Pedidos.
          className="glass-chip flex h-11 min-w-0 flex-1 items-center gap-2 whitespace-nowrap rounded-full pe-1.5 ps-4 text-[13px] font-semibold text-onyx transition-transform active:scale-[0.97]"
        >
          <CalendarPlus size={16} strokeWidth={2.2} className="shrink-0" />
          <span className="truncate">Nova marcação</span>
          <span className="ms-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-onyx shadow-sm">
            <ArrowRight size={16} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            void tap()
            onOpen('pedidos')
          }}
          aria-label={month.pendingCount ? `Pedidos, ${month.pendingCount} à espera` : 'Pedidos'}
          className="glass-chip relative flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full pe-1.5 ps-3.5 text-[13px] font-semibold text-onyx transition-transform active:scale-[0.97]"
        >
          <span>Pedidos</span>
          {/* The requests waiting, as a badge on the button's top right corner. */}
          {month.pendingCount > 0 && (
            <span
              className="tabular absolute -right-1 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-[#ffffff] ring-2 ring-white"
              style={{ background: STATUS.cancelled }}
            >
              {month.pendingCount > 9 ? '9+' : month.pendingCount}
            </span>
          )}
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-onyx shadow-sm">
            <ArrowRight size={16} />
          </span>
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
  const servicesTotal = services.reduce((a, sv) => a + sv.value, 0)
  const doneShare = month.revenue ? month.doneCents / month.revenue : 0
  const change = month.revenueChange
  // Whether there is more above or below, to show that the card scrolls.
  const body = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })
  const measure = useCallback(() => {
    const el = body.current
    if (!el) return
    setEdges({ top: el.scrollTop > 4, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4 })
  }, [])
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(measure)
    // As the customer app's photo strips do sideways: the first time it opens, the content dips a little and comes
    // back, to show that it scrolls.
    let timers: number[] = []
    if (!detailNudged) {
      timers = [
        window.setTimeout(() => {
          const el = body.current
          if (!el || el.scrollHeight <= el.clientHeight + 4) return
          detailNudged = true
          el.scrollTo({ top: 72, behavior: 'smooth' })
          timers.push(window.setTimeout(() => el.scrollTo({ top: 0, behavior: 'smooth' }), 650))
        }, 500),
      ]
    }
    return () => {
      cancelAnimationFrame(frame)
      timers.forEach(clearTimeout)
    }
  }, [open, measure])

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
            className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-md"
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={`Faturação de ${name}`}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="relative flex max-h-[min(72dvh,620px)] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_70px_-15px_rgba(0,0,0,0.4)]"
          >
            {/* Stays at the top while the rest scrolls. */}
            <header className="flex items-center gap-3 px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                <Wallet size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-subtitle text-[16px] font-semibold tracking-tight text-onyx">Faturação de {name}</h2>
                <p className="text-xs text-ink-3">Até dia {month.dayOfMonth}, com o que já está marcado</p>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx"
              >
                <X size={17} />
              </button>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Soft edges where there is more to scroll to. */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ${edges.top ? 'opacity-100' : 'opacity-0'}`}
            />
            <div ref={body} onScroll={measure} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
              {/* The total, with the change and how much of it is done. */}
              <section className="rounded-3xl bg-onyx/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="amount tabular text-[34px] font-semibold leading-none tracking-tight text-onyx">{euros(month.revenue)}</p>
                  {change !== null && (
                    <span
                      className="tabular flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: `color-mix(in srgb, ${change >= 0 ? 'var(--c-pos)' : 'var(--c-neg)'} 14%, transparent)`,
                        color: change >= 0 ? 'var(--c-pos)' : 'var(--c-neg)',
                      }}
                    >
                      {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-ink-3">{change === null ? 'Ainda sem mês anterior para comparar' : `Face a ${last} até ao mesmo dia`}</p>

                <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-onyx/[0.08]">
                  <span className="h-full rounded-full" style={{ width: `${doneShare * 100}%`, background: STATUS.confirmed }} />
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-ink-3">
                      <span className="size-2 rounded-full" style={{ background: STATUS.confirmed }} aria-hidden="true" />
                      Já feito
                    </p>
                    <p className="amount tabular mt-0.5 text-[15px] font-bold text-onyx">{euros(month.doneCents)}</p>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1.5 text-xs text-ink-3">
                      <span className="size-2 rounded-full bg-onyx/20" aria-hidden="true" />
                      Ainda por vir
                    </p>
                    <p className="amount tabular mt-0.5 text-[15px] font-bold text-onyx">{euros(month.toComeCents)}</p>
                  </div>
                </div>
              </section>

              {/* Against any of the last months. */}
              <MonthCompare daily={data.daily} dayOfMonth={month.dayOfMonth} />

              {/* Confirmed, waiting, cancelled. */}
              <DetailSection Icon={CalendarCheck} title="Estado das marcações">
                <div className="flex items-center gap-5">
                  <Ring
                    label="Estado das marcações"
                    size={116}
                    thickness={15}
                    parts={statuses}
                    center={
                      <>
                        <span className="amount tabular text-[14px] font-semibold leading-tight text-onyx">
                          {euros(statuses.reduce((a, p) => a + p.value, 0))}
                        </span>
                        <span className="text-[10px] text-ink-3">no mês</span>
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
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <span className="text-[13px] text-onyx">Valor médio por sessão</span>
                  <span className="amount tabular text-[14px] font-bold text-onyx">{euros(month.average)}</span>
                </div>
              </DetailSection>

              {/* Week by week. */}
              <DetailSection Icon={CalendarClock} title="Semana a semana">
                <WeekChart weeks={month.weeks} dayOfMonth={month.dayOfMonth} />
              </DetailSection>

              {/* By hairstyle. */}
              <DetailSection Icon={Scissors} title="Por penteado">
                {services.length === 0 ? (
                  <p className="text-[13px] text-ink-3">Sem sessões confirmadas neste mês.</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <Ring
                      label="Faturação por penteado"
                      size={116}
                      thickness={15}
                      parts={services}
                      center={
                        <>
                          <span className="tabular text-[18px] font-semibold leading-none text-onyx">{services.length}</span>
                          <span className="mt-0.5 text-[10px] text-ink-3">{services.length === 1 ? 'penteado' : 'penteados'}</span>
                        </>
                      }
                    />
                    <RingLegend
                      format={euros}
                      parts={services}
                      notes={services.map(
                        (sv) => `${plural(sv.count, 'sessão', 'sessões')} · ${servicesTotal ? Math.round((sv.value / servicesTotal) * 100) : 0}%`,
                      )}
                    />
                  </div>
                )}
              </DetailSection>
            </div>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ${edges.bottom ? 'opacity-100' : 'opacity-0'}`}
            />
            </div>

            {onStats && (
              <div className="flex justify-center px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    void tap()
                    onStats()
                  }}
                  className="glass-chip flex h-11 items-center gap-2 rounded-full pe-1.5 ps-4 text-[13px] font-semibold text-onyx transition-transform active:scale-[0.97]"
                >
                  <ChartColumn size={16} />
                  Ver estatísticas
                  <span className="ms-1 flex size-8 items-center justify-center rounded-full bg-white text-onyx shadow-sm">
                    <ArrowRight size={16} />
                  </span>
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

type CompareView = 'barras' | 'linhas' | 'numeros'

/** How much a running total grew between two days (both counted, 1-based); 0 when the days aren't in the month. */
function spanOf(running: number[], from: number, to: number) {
  const end = Math.min(to, running.length)
  if (end < from) return 0
  return running[end - 1] - (from > 1 ? running[from - 2] : 0)
}

/**
 * This month against any of the last eleven (the one before by default). On top, always, how far ahead or behind this
 * month is up to the same day; then one of three ways to look at it: lines (both months day by day, a finger along the
 * chart reads any day, the rest of this month projected at its pace), bars (week against week, a tap reads a week) or
 * figures (a small table: so far, per day, best day, the whole month). The chosen way is remembered on the device.
 */
function MonthCompare({ daily, dayOfMonth }: { daily: BoardData['daily']; dayOfMonth: number }) {
  const [otherKey, setOtherKey] = useState(daily[1]?.key ?? daily[0].key)
  const [view, setView] = useState<CompareView>(() => readStore<CompareView>(COMPARE_KEY, 'linhas'))
  const choose = (next: CompareView) => {
    void tap()
    setView(next)
    writeStore(COMPARE_KEY, next)
  }
  const current = daily[0]
  const other = daily.find((d) => d.key === otherKey) ?? daily[1] ?? current
  const now = current.running[dayOfMonth - 1] ?? 0
  const otherSameDay = other.running[Math.min(dayOfMonth, other.running.length) - 1] ?? 0
  const diff = now - otherSameDay
  const pctDiff = otherSameDay ? Math.round((diff / otherSameDay) * 100) : null
  const up = diff >= 0
  const tone = up ? 'var(--c-pos)' : 'var(--c-neg)'
  const thisName = capital(monthName(current.key))
  const otherName = capital(monthName(other.key))
  const otherYear = other.key.slice(0, 4) !== current.key.slice(0, 4) ? ` ${other.key.slice(0, 4)}` : ''
  const views: Array<{ id: CompareView; Icon: LucideIcon; label: string }> = [
    { id: 'linhas', Icon: ChartLine, label: 'Linhas' },
    { id: 'barras', Icon: ChartColumn, label: 'Semanas' },
    { id: 'numeros', Icon: Hash, label: 'Números' },
  ]

  return (
    <section className="rounded-3xl bg-onyx/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-subtitle text-[14px] font-semibold tracking-tight text-onyx">
          <span className="flex size-7 items-center justify-center rounded-full bg-white text-onyx">
            <ArrowLeftRight size={14} />
          </span>
          Comparação
        </h3>
        <div className="flex rounded-full bg-white p-0.5 shadow-sm" role="tablist" aria-label="Forma de ver a comparação">
          {views.map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              aria-label={label}
              onClick={() => choose(id)}
              className={`flex size-7 items-center justify-center rounded-full transition-colors ${view === id ? 'bg-onyx text-white' : 'text-muted-dark'}`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Which month to compare with. */}
      <label className="glass-chip relative flex h-9 w-fit items-center gap-2 rounded-full ps-3.5 pe-3 text-[13px] font-semibold text-onyx">
        <span className="text-muted-dark font-medium">{thisName} vs</span>
        <span>
          {otherName}
          {otherYear}
        </span>
        <ChevronDown size={14} className="text-muted-dark" />
        <select
          value={other.key}
          onChange={(e) => setOtherKey(e.target.value)}
          aria-label="Comparar com o mês"
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {daily.slice(1).map((d) => (
            <option key={d.key} value={d.key}>
              {capital(monthName(d.key))} {d.key.slice(0, 4)}
            </option>
          ))}
        </select>
      </label>

      {/* The answer first, the same in every view. */}
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-3">
            {up ? 'À frente de' : 'Atrás de'} {otherName.toLowerCase()} até dia {dayOfMonth}
          </p>
          <p className="amount tabular text-[26px] font-bold leading-tight tracking-tight" style={{ color: tone }}>
            {up ? '+' : '−'}
            {euros(Math.abs(diff))}
          </p>
        </div>
        {pctDiff !== null && (
          <span
            className="tabular mb-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ color: tone, background: `color-mix(in srgb, ${tone} 13%, transparent)` }}
          >
            {up ? '↑' : '↓'}
            {Math.abs(pctDiff)}%
          </span>
        )}
      </div>

      <div className="mt-4">
        {view === 'linhas' && (
          <CompareLines current={current.running} other={other.running} dayOfMonth={dayOfMonth} tone={tone} thisName={thisName} otherName={otherName} />
        )}
        {view === 'barras' && <CompareWeeks current={current.running} other={other.running} dayOfMonth={dayOfMonth} thisName={thisName} otherName={otherName} />}
        {view === 'numeros' && (
          <CompareFigures current={current.running} other={other.running} dayOfMonth={dayOfMonth} thisName={thisName} otherName={otherName} />
        )}
      </div>
    </section>
  )
}

/** The scale at the side of a comparison chart: its top, the middle and zero. */
function CompareScale({ top }: { top: number }) {
  return (
    <div className="flex h-36 w-10 shrink-0 flex-col justify-between text-right">
      {[top, top / 2, 0].map((v) => (
        <span key={v} className="amount tabular -translate-y-1/2 text-[10px] text-ink-3 first:translate-y-0 last:translate-y-0">
          {v ? euros(v) : '0'}
        </span>
      ))}
    </div>
  )
}

/** The line above a comparison chart that reads the chosen day or week: this month and the other side by side. */
function CompareReadout({ title, mine, theirs, thisName, otherName, tone }: { title: string; mine: number | null; theirs: number | null; thisName: string; otherName: string; tone: string }) {
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-[12px]">
      <span className="min-w-0 flex-1 truncate font-semibold text-onyx">{title}</span>
      <span className="flex items-center gap-1.5 text-ink-3">
        <span className="size-2 rounded-full" style={{ background: tone }} aria-hidden="true" />
        <span className="sr-only">{thisName}</span>
        <span className="amount tabular font-bold text-onyx">{mine === null ? '–' : euros(mine)}</span>
      </span>
      <span className="flex items-center gap-1.5 text-ink-3">
        <span className="size-2 rounded-full bg-onyx/25" aria-hidden="true" />
        <span className="sr-only">{otherName}</span>
        <span className="amount tabular font-semibold text-muted-dark">{theirs === null ? '–' : euros(theirs)}</span>
      </span>
    </div>
  )
}

/**
 * Both months day by day as running totals: this month up to today in its colour over a soft area, then dotted to the
 * month's end at the pace so far; the other in full, dashed. A finger along the chart picks a day (today to start with)
 * and the line above reads both months on it.
 */
function CompareLines({ current, other, dayOfMonth, tone, thisName, otherName }: { current: number[]; other: number[]; dayOfMonth: number; tone: string; thisName: string; otherName: string }) {
  const [day, setDay] = useState(dayOfMonth)
  const length = current.length
  const days = Math.max(length, other.length)
  const mine = current.slice(0, dayOfMonth)
  const now = mine[mine.length - 1] ?? 0
  const forecast = dayOfMonth ? Math.round((now / dayOfMonth) * length) : 0
  const top = niceTop(Math.max(1, now, forecast, ...other))
  const W = 300
  const H = 144
  const x = (d: number) => ((d - 1) / (days - 1)) * W
  const y = (v: number) => H - (v / top) * H
  const path = (values: number[]) => values.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const next = Math.min(days, Math.max(1, Math.round(((e.clientX - box.left) / box.width) * (days - 1)) + 1))
    setDay(next)
  }
  const mineAt = day <= dayOfMonth ? mine[day - 1] : null
  const theirsAt = day <= other.length ? other[day - 1] : null
  const at = (d: number) => `${(x(d) / W) * 100}%`
  const height = (v: number) => `${(v / top) * 100}%`
  const ticks = [1, 8, 15, 22, days]

  return (
    <div>
      <CompareReadout
        title={day === dayOfMonth ? `Hoje, dia ${day}` : day > dayOfMonth ? `Dia ${day} · ainda não chegou` : `Até dia ${day}`}
        mine={mineAt}
        theirs={theirsAt}
        thisName={thisName}
        otherName={otherName}
        tone={tone}
      />
      <div className="flex gap-2">
        <CompareScale top={top} />
        <div
          role="img"
          aria-label={`${thisName} até hoje: ${euros(now)}; ${otherName} completo: ${euros(other[other.length - 1] ?? 0)}; previsão de ${thisName}: ${euros(forecast)}`}
          className="relative h-36 flex-1 touch-pan-y select-none"
          onPointerDown={pick}
          onPointerMove={(e) => e.buttons && pick(e)}
        >
          {[0, 50, 100].map((p) => (
            <span key={p} aria-hidden="true" className="absolute inset-x-0 border-t border-onyx/[0.08]" style={{ top: `${p}%` }} />
          ))}
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id="compare-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={tone} stopOpacity="0.2" />
                <stop offset="100%" stopColor={tone} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points={path(other)} fill="none" stroke="color-mix(in srgb, var(--color-onyx) 32%, transparent)" strokeWidth="1.25" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            {mine.length > 1 && <polygon points={`${x(1)},${H} ${path(mine)} ${x(dayOfMonth)},${H}`} fill="url(#compare-area)" />}
            {dayOfMonth < length && (
              <line x1={x(dayOfMonth)} y1={y(now)} x2={x(length)} y2={y(forecast)} stroke={tone} strokeOpacity="0.5" strokeWidth="1.75" strokeDasharray="0.5 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            )}
            <polyline points={path(mine)} fill="none" stroke={tone} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* The chosen day: a soft line down and a dot on each month. */}
          <span aria-hidden="true" className="absolute inset-y-0 w-px -translate-x-1/2 bg-onyx/20" style={{ left: at(day) }} />
          {theirsAt !== null && (
            <span aria-hidden="true" className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-onyx/40 ring-2 ring-white" style={{ left: at(day), bottom: height(theirsAt) }} />
          )}
          {mineAt !== null && (
            <span aria-hidden="true" className="absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-white" style={{ left: at(day), bottom: height(mineAt), background: tone }} />
          )}
        </div>
      </div>
      <div className="relative ml-12 mt-1.5 h-3.5 text-[10px] text-ink-3">
        {ticks.map((d, i) => (
          <span key={d} className={`absolute ${i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: at(d) }}>
            {i === 0 ? 'dia 1' : d}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: tone }} aria-hidden="true" />
          {thisName}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t-[1.5px] border-dashed border-onyx/40" aria-hidden="true" />
          {otherName}
        </span>
        {dayOfMonth < length && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dotted" style={{ borderColor: tone }} aria-hidden="true" />
            Previsão <span className="amount tabular font-semibold text-onyx">{euros(forecast)}</span>
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Week against week (days 1–7, 8–14, 15–21, 22–28 and the rest): for each, this month's bar beside the other's, green
 * when it's ahead and red when behind. The week now is set against the same days of the other month, so it isn't
 * "behind" just for not being over. A tap picks a week (this one to start with) and the line above reads it.
 */
function CompareWeeks({ current, other, dayOfMonth, thisName, otherName }: { current: number[]; other: number[]; dayOfMonth: number; thisName: string; otherName: string }) {
  const days = Math.max(current.length, other.length)
  const weeks = [1, 8, 15, 22, 29]
    .filter((from) => from <= days)
    .map((from) => {
      const to = from === 29 ? days : from + 6
      const upTo = Math.min(to, dayOfMonth)
      return {
        from,
        to,
        label: from === to ? `${from}` : `${from}–${to}`,
        mine: from > dayOfMonth ? null : spanOf(current, from, upTo),
        theirs: spanOf(other, from, to),
        theirsSoFar: spanOf(other, from, upTo),
        now: dayOfMonth >= from && dayOfMonth <= to,
      }
    })
  const [chosen, setChosen] = useState(() => Math.max(0, weeks.findIndex((w) => w.now)))
  const week = weeks[Math.min(chosen, weeks.length - 1)]
  const top = niceTop(Math.max(1, ...weeks.map((w) => Math.max(w.mine ?? 0, w.theirs))))
  const colourOf = (w: (typeof weeks)[number]) => ((w.mine ?? 0) >= (w.now ? w.theirsSoFar : w.theirs) ? 'var(--c-pos)' : 'var(--c-neg)')

  return (
    <div>
      <CompareReadout
        title={week.now ? `Dias ${week.label} · até hoje` : week.mine === null ? `Dias ${week.label} · ainda não chegou` : `Dias ${week.label}`}
        mine={week.mine}
        theirs={week.now ? week.theirsSoFar : week.theirs}
        thisName={thisName}
        otherName={otherName}
        tone={colourOf(week)}
      />
      <div className="flex gap-2">
        <CompareScale top={top} />
        <div className="relative h-36 flex-1">
          {[0, 50, 100].map((p) => (
            <span key={p} aria-hidden="true" className="absolute inset-x-0 border-t border-onyx/[0.08]" style={{ top: `${p}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-1">
            {weeks.map((w, i) => {
              const selected = w === week
              return (
                <button
                  key={w.from}
                  type="button"
                  aria-label={`Dias ${w.label}: ${thisName} ${w.mine === null ? 'ainda não chegou' : euros(w.mine)}, ${otherName} ${euros(w.theirs)}`}
                  aria-pressed={selected}
                  onClick={() => {
                    void tap()
                    setChosen(i)
                  }}
                  className={`relative flex h-full flex-1 items-end justify-center gap-1 rounded-xl transition-colors ${selected ? 'bg-white/80' : ''}`}
                >
                  {/* The other month's week; while this week is still going, only its same days are solid, the rest faint behind. */}
                  <span className="relative flex w-2.5 items-end rounded-full bg-onyx/[0.08]" style={{ height: `${Math.max((w.theirs / top) * 100, w.theirs ? 3 : 0)}%` }}>
                    <span className="block w-full rounded-full bg-onyx/[0.22]" style={{ height: `${w.now ? (w.theirs ? (w.theirsSoFar / w.theirs) * 100 : 0) : 100}%` }} />
                  </span>
                  {w.mine === null ? (
                    <span className="block h-1.5 w-2.5 rounded-full bg-onyx/[0.08]" />
                  ) : (
                    <span className="block w-2.5 rounded-full" style={{ height: `${Math.max((w.mine / top) * 100, w.mine ? 3 : 0)}%`, background: colourOf(w) }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="ml-12 mt-1.5 flex gap-1">
        {weeks.map((w) => (
          <span key={w.from} className={`flex-1 text-center text-[10px] ${w === week ? 'font-bold text-onyx' : 'text-ink-3'}`}>
            {w.now ? 'Esta' : w.label}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-onyx/25" aria-hidden="true" />
          {otherName}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: 'var(--c-pos)' }} aria-hidden="true" />
          {thisName} à frente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: 'var(--c-neg)' }} aria-hidden="true" />
          atrás
        </span>
      </div>
    </div>
  )
}

/** The two months in a small table (so far, per day, best day, the whole month) and what it takes to match the other. */
function CompareFigures({ current, other, dayOfMonth, thisName, otherName }: { current: number[]; other: number[]; dayOfMonth: number; thisName: string; otherName: string }) {
  const length = current.length
  const now = current[dayOfMonth - 1] ?? 0
  const otherSameDay = other[Math.min(dayOfMonth, other.length) - 1] ?? 0
  const otherFull = other[other.length - 1] ?? 0
  const forecast = dayOfMonth ? Math.round((now / dayOfMonth) * length) : 0
  const best = (running: number[], upTo: number) => Math.max(0, ...running.slice(0, upTo).map((v, i) => v - (i ? running[i - 1] : 0)))
  const left = length - dayOfMonth
  const missing = otherFull - now
  const rows: Array<{ label: string; mine: number; theirs: number; note?: string }> = [
    { label: `Até dia ${dayOfMonth}`, mine: now, theirs: otherSameDay },
    { label: 'Média por dia', mine: dayOfMonth ? Math.round(now / dayOfMonth) : 0, theirs: Math.round(otherFull / other.length) },
    { label: 'Melhor dia', mine: best(current, dayOfMonth), theirs: best(other, other.length) },
    { label: 'Mês completo', mine: forecast, theirs: otherFull, note: dayOfMonth < length ? 'previsão' : undefined },
  ]
  return (
    <div>
      <div className="rounded-2xl bg-white px-3 py-1">
        <div className="flex items-center gap-2 py-2 text-[11px] font-semibold text-ink-3">
          <span className="flex-1" />
          <span className="w-[5.5rem] text-right text-onyx">{thisName}</span>
          <span className="w-[5.5rem] text-right">{otherName}</span>
        </div>
        {rows.map((r) => {
          const ahead = r.mine >= r.theirs
          return (
            <div key={r.label} className="flex items-center gap-2 border-t border-onyx/[0.06] py-2.5 text-[13px]">
              <span className="min-w-0 flex-1 truncate text-muted-dark">{r.label}</span>
              <span className="w-[5.5rem] text-right">
                <span className="amount tabular font-bold" style={{ color: ahead ? 'var(--c-pos)' : 'var(--c-neg)' }}>
                  {euros(r.mine)}
                </span>
                {r.note && <span className="block text-[10px] font-normal text-ink-3">{r.note}</span>}
              </span>
              <span className="amount tabular w-[5.5rem] text-right font-semibold text-onyx">{euros(r.theirs)}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 px-1 text-xs text-ink-3">
        {missing <= 0 ? (
          <>
            Já passaste {otherName.toLowerCase()} completo ({<span className="amount">{euros(otherFull)}</span>}).
          </>
        ) : left > 0 ? (
          <>
            Faltam <span className="amount font-semibold text-onyx">{euros(missing)}</span> para igualar {otherName.toLowerCase()} completo: cerca de{' '}
            <span className="amount font-semibold text-onyx">{euros(Math.ceil(missing / left))}</span> por dia nos {left} dias que faltam.
          </>
        ) : (
          <>
            Ficaste a <span className="amount font-semibold text-onyx">{euros(missing)}</span> de {otherName.toLowerCase()} completo.
          </>
        )}
      </p>
    </div>
  )
}

/** A round, easy-to-read top for the chart's scale (e.g. 1140 € → 1200 €). */
function niceTop(cents: number) {
  const whole = Math.max(cents / 100, 1)
  const step = 10 ** Math.floor(Math.log10(whole))
  const nice = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((n) => n * step).find((n) => n >= whole) ?? whole
  return nice * 100
}

/**
 * The month week by week, as easy to read as possible: a scale at the side with soft guide lines, each bar on a light
 * track with its amount in bold above, a dashed line for the average week, and under each week how much it rose or fell
 * against the one before (by the day, so the month's short last week isn't "down" just for having fewer days); the
 * current week ringed and named.
 */
function WeekChart({ weeks, dayOfMonth }: { weeks: BoardData['month']['weeks']; dayOfMonth: number }) {
  const top = niceTop(Math.max(...weeks.map((w) => w.cents)))
  const done = weeks.filter((w) => w.from <= dayOfMonth)
  const average = done.length ? done.reduce((a, w) => a + w.cents, 0) / done.length : 0
  const changes = weeks.map((w, i) => {
    const before = weeks[i - 1]
    if (!before || !before.cents || !w.cents) return null
    return Math.round(((w.cents / w.days - before.cents / before.days) / (before.cents / before.days)) * 100)
  })
  const isNow = (w: (typeof weeks)[number]) => dayOfMonth >= w.from && dayOfMonth < w.from + w.days
  return (
    <div>
      <div className="flex gap-2">
        {/* The scale. */}
        <div className="flex h-36 w-10 shrink-0 flex-col justify-between pb-0 text-right">
          {[top, top / 2, 0].map((v) => (
            <span key={v} className="amount tabular -translate-y-1/2 text-[10px] text-ink-3 first:translate-y-0 last:translate-y-0">
              {v ? euros(v) : '0'}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={weeks.map((w) => `dias ${w.label}: ${euros(w.cents)}`).join('; ')}
          className="relative h-36 flex-1"
        >
          {/* Guide lines at the top, the middle and the bottom. */}
          {[0, 50, 100].map((p) => (
            <span key={p} aria-hidden="true" className="absolute inset-x-0 border-t border-onyx/[0.08]" style={{ top: `${p}%` }} />
          ))}
          {/* The average week. */}
          {average > 0 && (
            // Behind the bars and their amounts, so it never covers a number; its value is in the legend.
            <span
              aria-hidden="true"
              className="absolute inset-x-0 border-t-[1.5px] border-dashed border-onyx/35"
              style={{ bottom: `${(average / top) * 100}%` }}
            />
          )}
          <div className="absolute inset-0 flex items-end gap-2.5 px-1">
            {weeks.map((w, i) => {
              const before = weeks[i - 1]
              const colour = before && w.cents / w.days < before.cents / before.days ? 'var(--c-neg)' : 'var(--c-pos)'
              const now = isNow(w)
              const height = (w.cents / top) * 100
              return (
                <div key={w.label} className="relative flex h-full flex-1 items-end justify-center">
                  {/* The track, so a small week still reads against the full height. */}
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 top-0 mx-auto w-2.5 rounded-full bg-onyx/[0.05]" />
                  <span
                    className="relative block w-2.5 rounded-full"
                    style={{
                      height: `${Math.max(height, w.cents ? 6 : 0)}%`,
                      background: `linear-gradient(to bottom, color-mix(in srgb, ${colour} 70%, white), ${colour})`,
                      boxShadow: now ? `0 0 0 2px var(--color-white), 0 0 0 3.5px ${colour}` : undefined,
                    }}
                  >
                    {w.cents > 0 && (
                      <span className="amount tabular absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold text-onyx">
                        {euros(w.cents)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* Under each week: its days and how it moved. */}
      <div className="mt-2 flex gap-2 pl-12">
        {weeks.map((w, i) => {
          const now = isNow(w)
          const change = changes[i]
          return (
            <div key={w.label} className="flex flex-1 flex-col items-center gap-0.5 px-0.5">
              <span className={`text-[11px] ${now ? 'font-bold text-onyx' : 'text-ink-3'}`}>{now ? 'Esta' : w.label}</span>
              <span
                className="tabular text-[10px] font-semibold"
                style={{ color: change === null ? 'var(--c-ink-3)' : change >= 0 ? 'var(--c-pos)' : 'var(--c-neg)' }}
              >
                {change === null ? '–' : `${change >= 0 ? '↑' : '↓'}${Math.abs(change)}%`}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: 'var(--c-pos)' }} aria-hidden="true" />
          Subiu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: 'var(--c-neg)' }} aria-hidden="true" />
          Desceu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t-[1.5px] border-dashed border-onyx/40" aria-hidden="true" />
          Média por semana <span className="amount tabular font-semibold text-onyx">{euros(average)}</span>
        </span>
      </div>
    </div>
  )
}

/** The Faturação detail has shown that it scrolls (once per launch of the app, like the photo strips). */
let detailNudged = false

/** A part of the Faturação detail: a light block with a small icon and its title. */
function DetailSection({ Icon, title, children }: { Icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-onyx/[0.04] p-4">
      <h3 className="mb-3 flex items-center gap-2 font-subtitle text-[14px] font-semibold tracking-tight text-onyx">
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-onyx">
          <Icon size={14} />
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

type ChartView = 'barras' | 'linhas' | 'circular'

const CANCELLED = 'color-mix(in srgb, var(--color-onyx) 22%, transparent)'
/** Green when that month took in at least as much as the one before, red when less. */
const trend = (months: MonthFigures[], i: number) =>
  i > 0 && months[i].revenue < months[i - 1].revenue ? 'var(--c-neg)' : 'var(--c-pos)'

/**
 * 2×2: what came in against what was cancelled, the last six months, as bars, lines or a ring. Bars and lines read like
 * the Semana a semana: a scale at the side with soft guide lines, each month's takings above it, a dashed line for the
 * average of the months before this one and, when there is one, a line for the monthly goal; under each month how much
 * it rose or fell against the one before.
 */
function InOutChart({ months, goal, compact = false }: { months: MonthFigures[]; goal: number; compact?: boolean }) {
  const [view, setView] = useState<ChartView>(() => readStore<ChartView>(CHART_KEY, 'barras'))
  const choose = (next: ChartView) => {
    setView(next)
    writeStore(CHART_KEY, next)
  }
  const before = months.slice(0, -1).filter((m) => m.revenue > 0)
  const average = before.length ? before.reduce((a, m) => a + m.revenue, 0) / before.length : 0
  const top = niceTop(Math.max(1, goal, ...months.flatMap((m) => [m.revenue, m.cancelled])))
  const changes = months.map((m, i) => {
    const prev = months[i - 1]
    return prev && prev.revenue && m.revenue ? Math.round(((m.revenue - prev.revenue) / prev.revenue) * 100) : null
  })
  const at = (i: number) => `${((i + 0.5) / months.length) * 100}%`
  const height = (v: number) => `${(v / top) * 100}%`
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
      {/* 2×1: no legend, values or changes, just the chart. */}
      <div className={`mt-2 flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap text-xs text-ink-3 ${compact ? 'hidden' : 'flex'}`}>
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
        {view !== 'circular' && average > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-[1.5px] border-dashed border-onyx/40" aria-hidden="true" />
            Média <span className="amount tabular font-semibold text-onyx">{euros(average)}</span>
          </span>
        )}
        {view !== 'circular' && goal > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-[1.5px] border-onyx/70" aria-hidden="true" />
            Meta <span className="amount tabular font-semibold text-onyx">{euros(goal)}</span>
          </span>
        )}
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
            <div className={`${compact ? 'mt-3' : 'mt-5'} flex min-h-0 flex-1 gap-2`}>
              {/* The scale. */}
              <div className={`w-10 shrink-0 flex-col justify-between text-right ${compact ? 'hidden' : 'flex'}`}>
                {[top, top / 2, 0].map((v) => (
                  <span key={v} className="amount tabular -translate-y-1/2 text-[10px] text-ink-3 first:translate-y-0 last:translate-y-0">
                    {v ? euros(v) : '0'}
                  </span>
                ))}
              </div>
              <div className="relative min-h-0 flex-1">
                {[0, 50, 100].map((p) => (
                  <span key={p} aria-hidden="true" className="absolute inset-x-0 border-t border-onyx/[0.08]" style={{ top: `${p}%` }} />
                ))}
                {/* The average month and the goal, behind the bars so they never cover a number; their values are in the legend. */}
                {average > 0 && (
                  <span aria-hidden="true" className="absolute inset-x-0 border-t-[1.5px] border-dashed border-onyx/35" style={{ bottom: height(average) }} />
                )}
                {goal > 0 && <span aria-hidden="true" className="absolute inset-x-0 border-t-[1.5px] border-onyx/60" style={{ bottom: height(goal) }} />}
                {view === 'barras' ? (
                  <div className="absolute inset-0 flex items-end gap-2">
                    {months.map((m, i) => (
                      <div key={m.key} className="relative flex h-full flex-1 items-end justify-center gap-[3px]">
                        <motion.span
                          className="block w-full max-w-3 rounded-t-full"
                          style={{ background: `linear-gradient(to bottom, color-mix(in srgb, ${trend(months, i)} 70%, white), ${trend(months, i)})` }}
                          initial={{ height: 0 }}
                          animate={{ height: height(m.revenue) }}
                          transition={{ duration: 0.8, delay: i * 0.06, ease: ENTER_EASE }}
                        />
                        <motion.span
                          className="block w-full max-w-2 rounded-t-full"
                          style={{ background: CANCELLED }}
                          initial={{ height: 0 }}
                          animate={{ height: height(m.cancelled) }}
                          transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: ENTER_EASE }}
                        />
                        {m.revenue > 0 && !compact && (
                          <span
                            className="amount tabular absolute inset-x-0 mb-1 whitespace-nowrap text-center text-[10px] font-bold text-onyx"
                            style={{ bottom: height(Math.max(m.revenue, m.cancelled)) }}
                          >
                            {euros(m.revenue)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* The lines draw in from left to right. */}
                    <motion.div
                      className="absolute inset-0"
                      initial={{ clipPath: 'inset(-10% 100% -10% 0)' }}
                      animate={{ clipPath: 'inset(-10% 0% -10% 0)' }}
                      transition={{ duration: 1.1, ease: ENTER_EASE }}
                    >
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                      <defs>
                        <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor={trend(months, months.length - 1)} stopOpacity="0.22" />
                          <stop offset="100%" stopColor={trend(months, months.length - 1)} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={`${parseFloat(at(0))},100 ${months.map((m, i) => `${parseFloat(at(i))},${100 - (m.revenue / top) * 100}`).join(' ')} ${parseFloat(at(months.length - 1))},100`}
                        fill="url(#revenue-area)"
                      />
                      {(['cancelled', 'revenue'] as const).map((field) => (
                        <polyline
                          key={field}
                          points={months.map((m, i) => `${parseFloat(at(i))},${100 - (m[field] / top) * 100}`).join(' ')}
                          fill="none"
                          stroke={field === 'revenue' ? trend(months, months.length - 1) : CANCELLED}
                          strokeWidth={field === 'revenue' ? 1.75 : 1.25}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </svg>
                    </motion.div>
                    {/* Each month's point, in its colour, with its takings above. */}
                    {months.map((m, i) => (
                      <span key={m.key} aria-hidden="true">
                        <span
                          className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-white"
                          style={{ left: at(i), bottom: height(m.revenue), background: trend(months, i) }}
                        />
                        {m.revenue > 0 && !compact && (
                          <span
                            className="amount tabular absolute mb-2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-onyx"
                            style={{ left: at(i), bottom: height(m.revenue) }}
                          >
                            {euros(m.revenue)}
                          </span>
                        )}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
            {/* Under each month: its name and how it moved. */}
            <div className={`mt-1.5 flex gap-2 ${compact ? '' : 'pl-12'}`}>
              {months.map((m, i) => {
                const change = changes[i]
                const last = i === months.length - 1
                return (
                  <div key={m.key} className="flex flex-1 flex-col items-center gap-0.5">
                    <span className={`text-[11px] capitalize ${last ? 'font-bold text-onyx' : 'text-ink-3'}`}>{monthLabel(m.key)}</span>
                    <span
                      className={`tabular text-[10px] font-semibold ${compact ? 'hidden' : ''}`}
                      style={{ color: change === null ? 'var(--c-ink-3)' : change >= 0 ? 'var(--c-pos)' : 'var(--c-neg)' }}
                    >
                      {change === null ? '–' : `${change >= 0 ? '↑' : '↓'}${Math.abs(change)}%`}
                    </span>
                  </div>
                )
              })}
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
const STATUS = { confirmed: 'var(--c-confirmed)', waiting: 'var(--c-waiting)', cancelled: 'var(--c-cancelled)' }

interface RingPart {
  label: string
  value: number
  colour: string
}

/**
 * A thick ring with rounded ends and a small gap between its parts, starting at the top, with what goes in the middle
 * (usually the total). A part too small to draw still shows as a dot.
 */
/** The board's entrance: one gentle ease, so everything that grows or fills arrives the same way. */
const ENTER_EASE = [0.22, 1, 0.36, 1] as const

/** A number that counts up from zero when it first shows (or straight to it when the phone asks for less motion). */
function CountUp({ value, format = String, duration = 0.9 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)
  const first = useRef(true)
  useEffect(() => {
    if (reduce) {
      setShown(value)
      return
    }
    // The first time from zero; later changes from where it was.
    const from = first.current ? 0 : shown
    first.current = false
    const controls = animate(from, value, {
      duration,
      ease: ENTER_EASE,
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => setShown(value),
    })
    // Stopped early (the block left or the value changed): never leave a number half-way.
    return () => {
      controls.stop()
      setShown(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce, duration])
  return <>{format(shown)}</>
}

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
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={shown[0].colour}
            strokeWidth={thickness}
            strokeDasharray={`${C} ${C}`}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.9, ease: ENTER_EASE }}
          />
        ) : (
          shown.map((part, index) => {
            const length = lengthOf(part)
            // Round ends reach half the thickness past the dash, on each side.
            const dash = Math.max(length - thickness - gap, 0.01)
            const offset = -(start + thickness / 2 + gap / 2)
            start += length
            // Each part draws itself round from its start, one after the other.
            return (
              <motion.circle
                key={part.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={part.colour}
                strokeWidth={thickness}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0.01 ${C}`, opacity: 0 }}
                animate={{ strokeDasharray: `${dash} ${C}`, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.15 + index * 0.18, ease: ENTER_EASE, opacity: { duration: 0.15, delay: 0.15 + index * 0.18 } }}
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
function Goal({
  goal,
  revenue,
  canEdit,
  onEdit,
  small = false,
}: {
  goal: number | null
  revenue: number
  canEdit: boolean
  onEdit: () => void
  /** 1×1: the share of the goal large, the bar below. */
  small?: boolean
}) {
  const share = goal ? revenue / goal : 0
  if (small && goal === 0) {
    return (
      <>
        <BlockHeader title="Meta mensal" />
        <p className="mt-1 text-[12px] leading-snug text-ink-3">Ainda sem meta para o mês.</p>
        {canEdit && (
          <button type="button" onClick={onEdit} className="glass-chip mt-auto h-8 self-start rounded-full px-3.5 text-xs font-semibold text-onyx">
            Definir
          </button>
        )}
      </>
    )
  }
  if (small && goal) {
    return (
      <>
        <BlockHeader title="Meta mensal" />
        <p className="tabular -mt-0.5 text-[24px] font-semibold tracking-tight text-ink">
          <CountUp value={Math.round(share * 100)} format={(n) => `${n}%`} />
        </p>
        <div className="mt-auto">
          <div className="h-2 overflow-hidden rounded-full bg-onyx/[0.08]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label="Progresso da meta">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--c-pos)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(share, 1) * 100}%` }}
              transition={{ duration: 1, ease: ENTER_EASE }}
            />
          </div>
          <p className="mt-1.5 truncate text-[11px] text-ink-3">
            <span className="amount">{euros(revenue)}</span> de <span className="amount">{euros(goal)}</span>
          </p>
        </div>
      </>
    )
  }
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
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--c-pos)' }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(share, 1) * 100}%` }}
                transition={{ duration: 1, ease: ENTER_EASE }}
              />
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
function Ranking({ items, total, rows = 5 }: { items: BoardData['ranking']; total: number; rows?: number }) {
  return (
    <>
      <BlockHeader title="Mais pedidos" />
      {items.length === 0 ? (
        <Empty Icon={ChartColumn} text="Sem marcações nos últimos 90 dias." />
      ) : (
        <ol className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
          {items.slice(0, rows).map((item, i) => (
            <li key={item.label} className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: RANK_COLOURS[i] }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{item.label}</span>
                <span className="tabular shrink-0 text-xs text-ink-3">
                  {item.count} · {Math.round(item.share * 100)}%
                </span>
              </div>
              <div className="ml-4 mt-1 h-1.5 overflow-hidden rounded-full bg-onyx/[0.08]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: RANK_COLOURS[i] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.share * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: ENTER_EASE }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
      {rows > 2 && <p className="tabular mt-auto pt-2 text-xs text-ink-3">{total} em 90 dias</p>}
    </>
  )
}

const ACTIVITY_LOOK: Record<ActivityItem['kind'], { Icon: LucideIcon; tone: string }> = {
  pedido: { Icon: Hourglass, tone: 'var(--c-waiting)' },
  confirmada: { Icon: CalendarCheck, tone: 'var(--c-confirmed)' },
  cancelada: { Icon: CalendarX2, tone: 'var(--c-cancelled)' },
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
function Activity({ items, onOpen, compact = false }: { items: ActivityItem[]; onOpen: (tab: Tab) => void; compact?: boolean }) {
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
      {/* 2×1: no search or filter, just the latest two. */}
      <div className={`mt-3 gap-2 ${compact ? 'hidden' : 'flex'}`}>
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
          {shown.slice(0, compact ? 2 : 4).map((n, i) => {
            const { Icon, tone } = ACTIVITY_LOOK[n.kind]
            return (
              // Three fit on a phone, four on a wider screen.
              <li key={`${n.kind}-${n.id}`} className={i >= 3 ? 'hidden sm:block' : ''}>
                <button
                  type="button"
                  onClick={() => onOpen(n.kind === 'testemunho' ? 'testemunhos' : n.kind === 'pedido' ? 'pedidos' : 'agenda')}
                  className={`flex w-full items-center gap-3 rounded-xl px-1.5 text-left hover:bg-onyx/[0.04] ${compact ? 'py-0.5' : 'py-1.5'}`}
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
function Upcoming({
  bookings,
  onOpen,
  onNewBooking,
  compact = false,
}: {
  bookings: Booking[]
  onOpen: () => void
  onNewBooking: () => void
  /** 2×1: just the next two. */
  compact?: boolean
}) {
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
          {bookings.slice(0, compact ? 2 : 4).map((b) => {
            const start = new Date(b.slot.startsAt).getTime()
            const end = endsAt(b)
            const live = start <= now && now < end
            const key = dayKey(b.slot.startsAt)
            const day = key === today ? 'Hoje' : key === addDays(today, 1) ? 'Amanhã' : capital(weekdayShort(b.slot.startsAt))
            return (
              <li key={b.id}>
                <div className={`flex items-center gap-3 rounded-xl px-1.5 ${compact ? 'py-0.5' : 'py-1.5'}`}>
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
                    {live && !compact && (
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
