import {
  ArrowUpRight,
  BellRing,
  CalendarCheck,
  CalendarPlus,
  CalendarX2,
  Clock,
  Euro,
  Inbox,
  MessageCircle,
  MessageSquareQuote,
  Phone,
  Plus,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { customerWhatsappUrl } from '@/lib/site-config'
import { cn } from '@/lib/utils'
import { bookingName, bookingPrice } from '@/lib/pricing'
import type { Booking } from '@/lib/types'
import { useAdmin } from '../admin-context'
import { addDaysKey, dateKey, dateParts, euros, getLisbonYearMonth, greeting, longDate, plural, telHref, todayKey } from '../format'
import { Avatar, Cell, EmptyState, Screen, Section, type Tint } from '../ios'

/**
 * One of the four cards on top: the icon and what it counts, the number large, a line that says what it means, and
 * for some a thin bar (how full the week is, how the month goes against the last). `highlight`: dark, when it needs
 * doing (requests waiting).
 */
function Tile({
  Icon,
  label,
  value,
  hint,
  progress,
  highlight = false,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  value: string | number
  hint: string
  progress?: number
  highlight?: boolean
  onClick?: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      className={cn(
        'relative flex min-h-[8.5rem] min-w-0 flex-col overflow-hidden rounded-2xl p-4 text-left transition-colors',
        highlight ? 'bg-[var(--ios-tint)] text-[var(--ios-on-tint)]' : 'bg-[var(--ios-cell)]',
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            highlight
              ? 'bg-[color-mix(in_srgb,var(--ios-on-tint)_16%,transparent)]'
              : 'bg-[var(--ios-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_0_0_0.5px_var(--ios-separator)]',
          )}
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', highlight ? 'opacity-80' : 'text-[var(--ios-secondary)]')}>
          {label}
        </span>
        {onClick && <ArrowUpRight className={cn('size-4 shrink-0', highlight ? 'opacity-70' : 'text-[var(--ios-tertiary)]')} strokeWidth={2} />}
      </span>
      <span className="mt-auto truncate pt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</span>
      <span className={cn('mt-1.5 truncate text-xs', highlight ? 'opacity-75' : 'text-[var(--ios-secondary)]')}>{hint}</span>
      {/* The same room with or without the bar, so the numbers line up across the cards. */}
      {progress === undefined ? (
        <span className="mt-2.5 block h-1" />
      ) : (
        <span className={cn('mt-2.5 block h-1 overflow-hidden rounded-full', highlight ? 'bg-white/20' : 'bg-[var(--ios-fill-strong)]')}>
          <motion.span
            className={cn('block h-full rounded-full', highlight ? 'bg-[var(--ios-on-tint)]' : 'bg-[var(--ios-tint)]')}
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </span>
      )}
    </motion.button>
  )
}

/** The next session, large: who, what, when, and a call or a WhatsApp in one tap. */
function NextSession({ booking }: { booking: Booking }) {
  const { push, can } = useAdmin()
  const { time, weekdayShort, day, month } = dateParts(booking.slot.startsAt)
  const key = dateKey(booking.slot.startsAt)
  const when = key === todayKey() ? 'Hoje' : key === addDaysKey(todayKey(), 1) ? 'Amanhã' : `${weekdayShort}, ${day} ${month}`
  return (
    <div className="overflow-hidden rounded-[12px] bg-[var(--ios-cell)]">
      <button
        type="button"
        disabled={!can('clientes')}
        onClick={() => push({ name: 'customer', id: booking.customerId })}
        className="flex w-full items-center gap-3 p-4 text-left active:bg-[var(--ios-cell-pressed)] disabled:active:bg-[var(--ios-cell)]"
      >
        <Avatar name={booking.customerName} size={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium uppercase tracking-[0.12em] text-[var(--ios-gold)]">A seguir · {when}</span>
          <span className="block truncate text-lg font-semibold leading-tight">{booking.customerName}</span>
          <span className="block truncate text-[15px] text-[var(--ios-secondary)]">{bookingName(booking)}</span>
        </span>
        <span className="shrink-0 text-[28px] font-semibold tabular-nums">{time}</span>
      </button>
      <div className="ios-hairline-t grid grid-cols-2">
        <a
          href={customerWhatsappUrl(booking.customerPhone, `Olá ${booking.customerName}! Sobre a tua sessão de ${bookingName(booking)}...`)}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center gap-1.5 text-[15px] text-[var(--ios-tint)] active:bg-[var(--ios-cell-pressed)]"
        >
          <MessageCircle className="size-[18px]" strokeWidth={2.2} />
          WhatsApp
        </a>
        <a
          href={telHref(booking.customerPhone)}
          className="flex h-11 items-center justify-center gap-1.5 text-[15px] text-[var(--ios-tint)] shadow-[inset_0.5px_0_0_var(--ios-separator)] active:bg-[var(--ios-cell-pressed)]"
        >
          <Phone className="size-[17px]" strokeWidth={2.2} />
          Ligar
        </a>
      </div>
    </div>
  )
}

export function HomeScreen() {
  const { me, avatar, can, bookings, slots, testimonials, goTab, push, newBooking } = useAdmin()
  const now = Date.now()
  const today = todayKey()
  const weekEnd = now + 7 * 86_400_000
  const firstName = me.name.trim().split(/\s+/)[0]

  const confirmed = bookings.filter((b) => b.status === 'ACCEPTED')
  const todaySessions = confirmed
    .filter((b) => dateKey(b.slot.startsAt) === today)
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  const upcoming = confirmed
    .filter((b) => new Date(b.slot.startsAt).getTime() >= now)
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  const weekSessions = upcoming.filter((b) => new Date(b.slot.startsAt).getTime() < weekEnd)
  const pending = bookings
    .filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const thisMonth = getLisbonYearMonth(new Date())
  const monthRevenue = confirmed
    .filter((b) => {
      const m = getLisbonYearMonth(new Date(b.slot.startsAt))
      return m.year === thisMonth.year && m.month === thisMonth.month
    })
    .reduce((sum, b) => sum + bookingPrice(b), 0)
  const nextToday = todaySessions.find((b) => new Date(b.slot.startsAt).getTime() >= now)
  const urgent = pending.filter((b) => new Date(b.slot.startsAt).getTime() < now + 86_400_000).length
  const inMonth = (b: Booking, m: { year: number; month: number }) => {
    const x = getLisbonYearMonth(new Date(b.slot.startsAt))
    return x.year === m.year && x.month === m.month
  }
  const lastMonth = thisMonth.month === 1 ? { year: thisMonth.year - 1, month: 12 } : { year: thisMonth.year, month: thisMonth.month - 1 }
  const lastMonthRevenue = confirmed.filter((b) => inMonth(b, lastMonth)).reduce((sum, b) => sum + bookingPrice(b), 0)
  const lastMonthName = new Date(lastMonth.year, lastMonth.month - 1, 15).toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')
  const monthCount = confirmed.filter((b) => inMonth(b, thisMonth)).length
  const freeWeek = slots.filter((s) => {
    const t = new Date(s.startsAt).getTime()
    return s.status === 'OPEN' && t >= now && t < weekEnd
  }).length
  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING').length

  const quick: Array<{ Icon: LucideIcon; tint: Tint; title: string; onClick: () => void; show: boolean }> = [
    { Icon: Plus, tint: 'tint', title: 'Nova marcação', onClick: () => newBooking(null), show: can('marcacoes') },
    { Icon: CalendarPlus, tint: 'green', title: 'Abrir horários', onClick: () => goTab('agenda', { name: 'agenda', id: 'horarios' }), show: can('marcacoes') },
    { Icon: CalendarX2, tint: 'red', title: 'Fechar dias ou férias', onClick: () => goTab('more', { name: 'closures' }), show: can('marcacoes') },
    { Icon: BellRing, tint: 'orange', title: 'Notificar clientes', onClick: () => goTab('more', { name: 'broadcast' }), show: can('notificacoes') },
    { Icon: Tag, tint: 'pink', title: 'Promoções', onClick: () => goTab('more', { name: 'promotions' }), show: can('catalogo') },
  ]

  return (
    <Screen
      title="Início"
      subtitle={`${greeting()}${firstName ? `, ${firstName}` : ''} · ${longDate(today)}`}
      trailing={
        <button
          type="button"
          onClick={() => goTab('more', { name: 'profile' })}
          aria-label="O teu perfil"
          className="flex size-11 items-center justify-center active:opacity-50"
        >
          <Avatar name={me.name || me.email} src={avatar} size={32} />
        </button>
      }
    >
      {can('marcacoes') ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 px-4">
            <Tile
              Icon={CalendarCheck}
              label="Hoje"
              value={todaySessions.length}
              hint={
                nextToday
                  ? `Próxima às ${dateParts(nextToday.slot.startsAt).time}`
                  : todaySessions.length
                    ? 'Todas concluídas'
                    : 'Dia sem sessões'
              }
              onClick={() => goTab('agenda')}
            />
            <Tile
              Icon={Inbox}
              label="Pedidos"
              value={pending.length}
              highlight={pending.length > 0}
              hint={
                pending.length === 0
                  ? 'Tudo respondido'
                  : urgent
                    ? `${urgent} para as próximas 24h`
                    : 'Toca para responder'
              }
              onClick={() => goTab('requests')}
            />
            <Tile
              Icon={Clock}
              label="7 dias"
              value={weekSessions.length}
              hint={freeWeek ? `${plural(freeWeek, 'horário livre', 'horários livres')}` : 'Sem horários livres'}
              progress={weekSessions.length + freeWeek ? weekSessions.length / (weekSessions.length + freeWeek) : 0}
              onClick={() => goTab('agenda')}
            />
            <Tile
              Icon={Euro}
              label="Este mês"
              value={euros(monthRevenue)}
              hint={
                lastMonthRevenue
                  ? monthRevenue >= lastMonthRevenue
                    ? `+${euros(monthRevenue - lastMonthRevenue)} vs ${lastMonthName}`
                    : `${Math.round((monthRevenue / lastMonthRevenue) * 100)}% de ${lastMonthName}`
                  : `${plural(monthCount, 'sessão', 'sessões')} confirmadas`
              }
              progress={lastMonthRevenue ? monthRevenue / lastMonthRevenue : undefined}
              onClick={can('estatisticas') ? () => goTab('more', { name: 'stats' }) : undefined}
            />
          </div>

          {upcoming[0] && (
            <Section flush>
              <NextSession booking={upcoming[0]} />
            </Section>
          )}

          <Section
            header={`Hoje · ${plural(todaySessions.length, 'sessão', 'sessões')}`}
            footer={
              freeWeek === 0
                ? 'Não há horários livres nos próximos 7 dias. Abre horários para as clientes poderem marcar.'
                : `${plural(freeWeek, 'horário livre', 'horários livres')} nos próximos 7 dias.`
            }
          >
            {todaySessions.length === 0 ? (
              <Cell title="Sem sessões hoje" subtitle="Aproveita para abrir horários ou responder aos pedidos." />
            ) : (
              todaySessions.map((b) => {
                const past = new Date(b.slot.startsAt).getTime() < now
                return (
                  <Cell
                    key={b.id}
                    leading={
                      <span className={`w-12 text-[15px] font-semibold tabular-nums ${past ? 'text-[var(--ios-tertiary)]' : ''}`}>
                        {dateParts(b.slot.startsAt).time}
                      </span>
                    }
                    title={b.customerName}
                    subtitle={bookingName(b)}
                    detail={euros(bookingPrice(b))}
                    onClick={can('clientes') ? () => push({ name: 'customer', id: b.customerId }) : undefined}
                  />
                )
              })
            )}
          </Section>

          {pending.length > 0 && (
            <Section header="À espera de resposta">
              {pending.slice(0, 3).map((b) => (
                <Cell
                  key={b.id}
                  leading={<Avatar name={b.customerName} size={36} />}
                  title={b.customerName}
                  subtitle={`${b.service.name} · ${dateParts(b.slot.startsAt).day} ${dateParts(b.slot.startsAt).month}, ${dateParts(b.slot.startsAt).time}`}
                  onClick={() => goTab('requests')}
                />
              ))}
              {pending.length > 3 && <Cell tinted title={`Ver os ${pending.length} pedidos`} onClick={() => goTab('requests')} />}
            </Section>
          )}
        </>
      ) : (
        <EmptyState
          Icon={CalendarCheck}
          title={`Olá${firstName ? `, ${firstName}` : ''}`}
          text="Usa os separadores em baixo para o que tens acesso."
          action={can('clientes') ? { label: 'Abrir clientes', onClick: () => goTab('customers') } : undefined}
        />
      )}

      {can('testemunhos') && pendingTestimonials > 0 && (
        <Section>
          <Cell
            Icon={MessageSquareQuote}
            tint="purple"
            title="Testemunhos por rever"
            badge={pendingTestimonials}
            onClick={() => goTab('more', { name: 'testimonials' })}
          />
        </Section>
      )}

      {quick.some((q) => q.show) && (
        <Section header="Ações rápidas">
          {quick
            .filter((q) => q.show)
            .map((q) => (
              <Cell key={q.title} Icon={q.Icon} tint={q.tint} title={q.title} onClick={q.onClick} />
            ))}
        </Section>
      )}

      <div className="h-4" />
    </Screen>
  )
}
