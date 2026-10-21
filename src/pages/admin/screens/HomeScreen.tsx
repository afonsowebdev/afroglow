import {
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
import { customerWhatsappUrl } from '@/lib/site-config'
import { bookingName, bookingPrice } from '@/lib/pricing'
import type { Booking } from '@/lib/types'
import { useAdmin } from '../admin-context'
import { addDaysKey, dateKey, dateParts, euros, getLisbonYearMonth, greeting, longDate, plural, telHref, todayKey } from '../format'
import { Avatar, Cell, EmptyState, Screen, Section, tintVar, type Tint } from '../ios'

/** A big tappable number, like the smart lists in Reminders. */
function Tile({
  Icon,
  tint,
  value,
  label,
  onClick,
}: {
  Icon: LucideIcon
  tint: Tint
  value: string | number
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex min-w-0 flex-col rounded-[12px] bg-[var(--ios-cell)] p-3 text-left active:bg-[var(--ios-cell-pressed)] disabled:active:bg-[var(--ios-cell)]"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="flex size-[30px] items-center justify-center rounded-full text-white" style={{ background: tintVar(tint) }}>
          <Icon className="size-[17px]" strokeWidth={2.4} />
        </span>
        <span className="truncate text-[28px] font-bold leading-[30px] tabular-nums">{value}</span>
      </span>
      <span className="mt-2 truncate text-[15px] font-semibold text-[var(--ios-secondary)]">{label}</span>
    </button>
  )
}

/** The next session, large: who, what, when, and a call or a WhatsApp in one tap. */
function NextSession({ booking }: { booking: Booking }) {
  const { push, can } = useAdmin()
  const { time } = dateParts(booking.slot.startsAt)
  const key = dateKey(booking.slot.startsAt)
  const when = key === todayKey() ? 'Hoje' : key === addDaysKey(todayKey(), 1) ? 'Amanhã' : longDate(key)
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
          <span className="block text-[13px] font-semibold uppercase text-[var(--ios-tint)]">A seguir · {when}</span>
          <span className="block truncate text-[20px] font-semibold leading-tight">{booking.customerName}</span>
          <span className="block truncate text-[15px] text-[var(--ios-secondary)]">{bookingName(booking)}</span>
        </span>
        <span className="shrink-0 text-[28px] font-bold tabular-nums">{time}</span>
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
          <div className="mt-2 grid grid-cols-2 gap-3 px-4">
            <Tile Icon={CalendarCheck} tint="blue" value={todaySessions.length} label="Hoje" onClick={() => goTab('agenda')} />
            <Tile
              Icon={Inbox}
              tint={pending.length ? 'red' : 'gray'}
              value={pending.length}
              label="Pedidos"
              onClick={() => goTab('requests')}
            />
            <Tile Icon={Clock} tint="indigo" value={weekSessions.length} label="Próx. 7 dias" onClick={() => goTab('agenda')} />
            <Tile
              Icon={Euro}
              tint="green"
              value={euros(monthRevenue)}
              label="Este mês"
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
                      <span className={`w-12 text-[17px] font-semibold tabular-nums ${past ? 'text-[var(--ios-tertiary)]' : ''}`}>
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
