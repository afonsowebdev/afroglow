import { motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, CalendarCheck, Clock, Euro, Inbox, type LucideIcon } from 'lucide-react'
import { bookingPrice } from '@/lib/pricing'
import type { AvailabilitySlot, Booking } from '@/lib/types'
import { cn } from '@/lib/utils'
import { addDaysKey, dateKey, dateParts, euros, getLisbonYearMonth, plural, timeAgo, todayKey } from '../format'

const disc =
  'flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ios-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_0_0_0.5px_var(--ios-separator)]'

/** The frame every card shares: the icon, the name, an arrow when it opens something. */
function CardShell({
  Icon,
  label,
  onClick,
  dark = false,
  className,
  children,
}: {
  Icon: LucideIcon
  label: string
  onClick?: () => void
  dark?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-2xl p-4 text-left transition-opacity active:opacity-70 disabled:active:opacity-100',
        dark ? 'bg-[var(--ios-tint)] text-[var(--ios-on-tint)]' : 'bg-[var(--ios-cell)]',
        className,
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span className={dark ? 'flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ios-on-tint)_16%,transparent)]' : disc}>
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', dark ? 'opacity-80' : 'text-[var(--ios-secondary)]')}>
          {label}
        </span>
      </span>
      {children}
    </motion.button>
  )
}

/** Small figures side by side under a card's main number. */
function Stats({ items, dark = false }: { items: Array<[string, string]>; dark?: boolean }) {
  return (
    <span
      className={cn('mt-3 grid w-full gap-2 border-t pt-3', dark ? 'border-white/15' : 'border-[var(--ios-separator)]')}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map(([value, label]) => (
        <span key={label} className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tabular-nums">{value}</span>
          <span className={cn('block truncate text-[11px]', dark ? 'opacity-70' : 'text-[var(--ios-secondary)]')}>{label}</span>
        </span>
      ))}
    </span>
  )
}

/** Today: how many sessions, how far into the day, each one on a line by its time, and what the day brings in. */
export function TodayCard({ sessions, onClick }: { sessions: Booking[]; onClick: () => void }) {
  const now = Date.now()
  const done = sessions.filter((b) => new Date(b.slot.startsAt).getTime() < now).length
  const next = sessions.find((b) => new Date(b.slot.startsAt).getTime() >= now)
  const revenue = sessions.reduce((sum, b) => sum + bookingPrice(b), 0)
  return (
    <CardShell Icon={CalendarCheck} label="Hoje" onClick={onClick} className="col-span-2">
      <span className="mt-3 flex w-full items-end justify-between gap-3">
        <span>
          <span className="block text-[32px] font-semibold leading-none tracking-tight tabular-nums">{sessions.length}</span>
          <span className="mt-1 block text-xs text-[var(--ios-secondary)]">
            {sessions.length === 0
              ? 'Dia sem sessões'
              : next
                ? `Próxima: ${next.customerName.split(' ')[0]} às ${dateParts(next.slot.startsAt).time}`
                : 'Todas concluídas'}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-xl font-semibold tabular-nums">{euros(revenue)}</span>
          <span className="block text-[11px] text-[var(--ios-secondary)]">previstos hoje</span>
        </span>
      </span>

      {sessions.length > 0 && (
        <>
          {/* The day as a line: one stop per session, filled once it has passed. */}
          <span className="mt-4 flex w-full items-center gap-1.5">
            {sessions.map((b) => {
              const past = new Date(b.slot.startsAt).getTime() < now
              return (
                <span
                  key={b.id}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-full px-2.5 py-1.5',
                    past ? 'bg-[var(--ios-tint)] text-[var(--ios-on-tint)]' : 'bg-[var(--ios-bg)] shadow-[inset_0_0_0_0.5px_var(--ios-separator)]',
                  )}
                >
                  <span className="text-xs font-semibold tabular-nums">{dateParts(b.slot.startsAt).time}</span>
                  <span className={cn('truncate text-xs', past ? 'opacity-75' : 'text-[var(--ios-secondary)]')}>
                    {b.customerName.split(' ')[0]}
                  </span>
                </span>
              )
            })}
          </span>
          <span className="mt-2.5 flex w-full items-center gap-2 text-[11px] text-[var(--ios-secondary)]">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--ios-fill-strong)]">
              <motion.span
                className="block h-full rounded-full bg-[var(--ios-tint)]"
                initial={{ width: 0 }}
                animate={{ width: `${(done / sessions.length) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            {done} de {sessions.length} feitas
          </span>
        </>
      )}
    </CardShell>
  )
}

/** Requests waiting: how many, the faces of who asked, how much is waiting and since when. */
export function RequestsCard({ pending, onClick }: { pending: Booking[]; onClick: () => void }) {
  const dark = pending.length > 0
  const value = pending.reduce((sum, b) => sum + bookingPrice(b), 0)
  const oldest = [...pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
  const urgent = pending.filter((b) => new Date(b.slot.startsAt).getTime() < Date.now() + 86_400_000).length
  return (
    <CardShell Icon={Inbox} label="Pedidos" onClick={onClick} dark={dark}>
      <span className="mt-3 flex w-full items-center justify-between gap-2">
        <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">{pending.length}</span>
        {pending.length > 0 && (
          <span className="flex -space-x-2">
            {pending.slice(0, 3).map((b) => (
              <span
                key={b.id}
                className="flex size-7 items-center justify-center rounded-full bg-[var(--ios-on-tint)] text-xs font-semibold text-[var(--ios-tint)] ring-2 ring-[var(--ios-tint)]"
              >
                {b.customerName.trim().charAt(0).toUpperCase()}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className={cn('mt-1 block text-xs', dark ? 'opacity-75' : 'text-[var(--ios-secondary)]')}>
        {pending.length === 0 ? 'Tudo respondido' : urgent ? `${urgent} para as próximas 24h` : 'À espera da tua resposta'}
      </span>
      {pending.length > 0 ? (
        <Stats
          dark
          items={[
            [euros(value), 'valor'],
            [oldest ? timeAgo(oldest.createdAt).replace('Há ', '') : '—', 'a esperar'],
          ]}
        />
      ) : (
        <Stats items={[['0 €', 'valor'], ['—', 'a esperar']]} />
      )}
    </CardShell>
  )
}

/** The next seven days as bars: what is booked (dark) on what is still free (light), today first. */
export function WeekCard({ bookings, slots, onClick }: { bookings: Booking[]; slots: AvailabilitySlot[]; onClick: () => void }) {
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = addDaysKey(today, i)
    const booked = bookings.filter(
      (b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && dateKey(b.slot.startsAt) === key,
    ).length
    const free = slots.filter((s) => s.status === 'OPEN' && dateKey(s.startsAt) === key && new Date(s.startsAt).getTime() > Date.now()).length
    const letter = new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: 'narrow' })
    return { key, booked, free, letter }
  })
  const max = Math.max(1, ...days.map((d) => d.booked + d.free))
  const booked = days.reduce((sum, d) => sum + d.booked, 0)
  const free = days.reduce((sum, d) => sum + d.free, 0)
  const occupancy = booked + free ? Math.round((booked / (booked + free)) * 100) : 0
  return (
    <CardShell Icon={Clock} label="7 dias" onClick={onClick}>
      <span className="mt-3 flex w-full items-end justify-between gap-2">
        <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">{booked}</span>
        <span className="text-right text-xs font-semibold tabular-nums">{occupancy}%</span>
      </span>
      <span className="mt-1 block text-xs text-[var(--ios-secondary)]">{free ? plural(free, 'horário livre', 'horários livres') : 'Sem horários livres'}</span>
      <span className="mt-3 flex h-14 w-full items-end gap-1.5">
        {days.map((d, i) => {
          const total = d.booked + d.free
          return (
            <span key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-[5px] bg-[var(--ios-fill)]">
                <motion.span
                  className="flex w-full flex-col justify-end"
                  initial={{ height: 0 }}
                  animate={{ height: `${(total / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="w-full bg-[var(--ios-fill-strong)]" style={{ height: total ? `${(d.free / total) * 100}%` : 0 }} />
                  <span className="w-full bg-[var(--ios-tint)]" style={{ height: total ? `${(d.booked / total) * 100}%` : 0 }} />
                </motion.span>
              </span>
              <span className={cn('text-[10px] uppercase', i === 0 ? 'font-semibold' : 'text-[var(--ios-secondary)]')}>{d.letter}</span>
            </span>
          )
        })}
      </span>
    </CardShell>
  )
}

/**
 * The month: revenue so far, against the last month at the same day (up or down, in %), the two months as lines
 * day by day, and sessions, the average per session and how many clients.
 */
export function MonthCard({ confirmed, onClick }: { confirmed: Booking[]; onClick?: () => void }) {
  const now = new Date()
  const ym = getLisbonYearMonth(now)
  const prev = ym.month === 1 ? { year: ym.year - 1, month: 12 } : { year: ym.year, month: ym.month - 1 }
  const todayDay = Number(todayKey().slice(8, 10))
  const daysIn = new Date(ym.year, ym.month, 0).getDate()
  const prevDaysIn = new Date(prev.year, prev.month, 0).getDate()

  const inMonth = (b: Booking, m: { year: number; month: number }) => {
    const x = getLisbonYearMonth(new Date(b.slot.startsAt))
    return x.year === m.year && x.month === m.month
  }
  const dayOf = (b: Booking) => Number(dateKey(b.slot.startsAt).slice(8, 10))
  const thisMonth = confirmed.filter((b) => inMonth(b, ym))
  const lastMonth = confirmed.filter((b) => inMonth(b, prev))

  // Running totals day by day (this month up to today; the last month all of it).
  const running = (list: Booking[], days: number) => {
    const perDay = Array.from({ length: days }, () => 0)
    for (const b of list) perDay[dayOf(b) - 1] += bookingPrice(b)
    let sum = 0
    return perDay.map((v) => (sum += v))
  }
  const cur = running(thisMonth, daysIn)
  const last = running(lastMonth, prevDaysIn)
  const revenue = thisMonth.reduce((sum, b) => sum + bookingPrice(b), 0)
  const soFar = cur[todayDay - 1] ?? 0
  const lastSameDay = last[Math.min(todayDay, prevDaysIn) - 1] ?? 0
  const change = lastSameDay ? Math.round(((soFar - lastSameDay) / lastSameDay) * 100) : null
  const clients = new Set(thisMonth.map((b) => b.customerId)).size

  const W = 300
  const H = 64
  const max = Math.max(1, cur[daysIn - 1], last[prevDaysIn - 1])
  const point = (v: number, i: number, n: number) => `${((i / Math.max(1, n - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 4) - 2).toFixed(1)}`
  const curLine = cur.slice(0, todayDay).map((v, i) => point(v, i, daysIn)).join(' ')
  const lastLine = last.map((v, i) => point(v, i, prevDaysIn)).join(' ')
  const area = `0,${H} ${curLine} ${point(cur[todayDay - 1] ?? 0, todayDay - 1, daysIn).split(',')[0]},${H}`
  const monthName = (m: { year: number; month: number }) =>
    new Date(m.year, m.month - 1, 15).toLocaleDateString('pt-PT', { month: 'long' })

  return (
    <CardShell Icon={Euro} label={`Este mês · ${monthName(ym)}`} onClick={onClick} className="col-span-2">
      <span className="mt-3 flex w-full items-end justify-between gap-3">
        <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">{euros(revenue)}</span>
        {change !== null && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold tabular-nums',
              change >= 0
                ? 'bg-[color-mix(in_srgb,var(--ios-green)_15%,transparent)] text-[var(--ios-green)]'
                : 'bg-[color-mix(in_srgb,var(--ios-red)_12%,transparent)] text-[var(--ios-red)]',
            )}
          >
            {change >= 0 ? <ArrowUpRight className="size-3.5" strokeWidth={2.4} /> : <ArrowDownRight className="size-3.5" strokeWidth={2.4} />}
            {Math.abs(change)}%
          </span>
        )}
      </span>
      <span className="mt-1 block text-xs text-[var(--ios-secondary)]">
        {change === null ? 'Sessões confirmadas deste mês' : `Comparado com ${monthName(prev)} até ao dia ${todayDay}`}
      </span>

      <span className="relative mt-3 block h-16 w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {lastLine && <polyline points={lastLine} fill="none" stroke="var(--ios-tertiary)" strokeWidth="1.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />}
        {curLine && (
          <>
            <motion.polygon points={area} fill="var(--ios-tint)" initial={{ opacity: 0 }} animate={{ opacity: 0.06 }} transition={{ duration: 0.8 }} />
            <motion.polyline
              points={curLine}
              fill="none"
              stroke="var(--ios-tint)"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </>
        )}
      </svg>
        {curLine && (
          <motion.span
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ios-tint)] ring-2 ring-[var(--ios-cell)]"
            style={{
              left: `${((todayDay - 1) / Math.max(1, daysIn - 1)) * 100}%`,
              top: `${((H - (soFar / max) * (H - 4) - 2) / H) * 100}%`,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 400, damping: 20 }}
          />
        )}
      </span>
      <span className="mt-1 flex w-full justify-between text-[10px] text-[var(--ios-secondary)]">
        <span>1</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 rounded-full bg-[var(--ios-tint)]" /> {monthName(ym)}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0 w-3 border-t border-dashed border-[var(--ios-tertiary)]" /> {monthName(prev)}
          </span>
        </span>
        <span>{daysIn}</span>
      </span>

      <Stats
        items={[
          [String(thisMonth.length), thisMonth.length === 1 ? 'sessão' : 'sessões'],
          [thisMonth.length ? euros(Math.round(revenue / thisMonth.length / 100) * 100) : '—', 'por sessão'],
          [String(clients), clients === 1 ? 'cliente' : 'clientes'],
        ]}
      />
    </CardShell>
  )
}
