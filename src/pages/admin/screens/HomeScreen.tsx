import {
  BellRing,
  CalendarCheck,
  CalendarPlus,
  CalendarX2,
  MessageCircle,
  MessageSquareQuote,
  Phone,
  Plus,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { customerWhatsappUrl } from '@/lib/site-config'
import { MonthCard, RequestsCard, TodayCard, WeekCard } from './home-cards'
import { bookingName, bookingPrice } from '@/lib/pricing'
import type { AvailabilitySlot, Booking } from '@/lib/types'
import { useAdmin } from '../admin-context'
import { addDaysKey, dateKey, dateParts, dayTitle, euros, greeting, longDate, plural, telHref, todayKey } from '../format'
import { Avatar, Cell, EmptyState, Screen, Section } from '../ios'

interface QuickActionItem {
  Icon: LucideIcon
  title: string
  hint: string
  onClick: () => void
  show: boolean
}

/**
 * What is done most, in reach: the black "Nova marcação" pill (as the agenda's "Nova" always was), the next free
 * times as plain chips that open the booking on that time, and the rest as a list.
 */
function QuickActions({
  items,
  onNewBooking,
  freeSlots = [],
}: {
  items: QuickActionItem[]
  /** Opens the booking sheet, on a free time when one was tapped. */
  onNewBooking?: (startsAt?: string) => void
  /** The next free times, to book straight into. */
  freeSlots?: AvailabilitySlot[]
}) {
  return (
    <>
      {onNewBooking && (
        <Section flush header="Marcar">
          <button
            type="button"
            onClick={() => onNewBooking()}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ios-tint)] text-[15px] font-medium text-[var(--ios-on-tint)] active:opacity-70"
          >
            <Plus className="size-5" strokeWidth={2.2} />
            Nova marcação
          </button>
          {freeSlots.length > 0 && (
            <>
              <p className="mt-4 px-1 text-xs text-[var(--ios-secondary)]">Ou marca já numa vaga livre:</p>
              <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {freeSlots.map((slot) => {
                  const title = dayTitle(slot.startsAt)
                  const { time, weekdayShort, day } = dateParts(slot.startsAt)
                  const dayLabel =
                    title === 'Hoje' || title === 'Amanhã' ? title : `${weekdayShort.charAt(0).toUpperCase()}${weekdayShort.slice(1)}, ${day}`
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onNewBooking(slot.startsAt)}
                      className="shrink-0 rounded-2xl border border-[var(--ios-separator)] bg-[var(--ios-bg)] px-4 py-2 text-center active:bg-[var(--ios-cell)]"
                    >
                      <span className="block text-xs text-[var(--ios-secondary)]">{dayLabel}</span>
                      <span className="block text-base font-semibold tabular-nums">{time}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </Section>
      )}
      {items.length > 0 && (
        <Section>
          {items.map((item) => (
            <Cell key={item.title} Icon={item.Icon} title={item.title} subtitle={item.hint} onClick={item.onClick} />
          ))}
        </Section>
      )}
    </>
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
          <span className="block truncate text-xs text-[var(--ios-secondary)]">A seguir · {when}</span>
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
  const pending = bookings
    .filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const freeWeek = slots.filter((s) => {
    const t = new Date(s.startsAt).getTime()
    return s.status === 'OPEN' && t >= now && t < weekEnd
  }).length
  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING').length
  const nextFreeSlots = slots
    .filter((s) => s.status === 'OPEN' && new Date(s.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6)

  const quick: QuickActionItem[] = [
    {
      Icon: CalendarPlus,
      title: 'Abrir horários',
      hint: freeWeek ? `${plural(freeWeek, 'vaga livre', 'vagas livres')} nos próximos 7 dias` : 'Sem vagas nos próximos 7 dias',
      onClick: () => goTab('agenda', { name: 'agenda', id: 'horarios' }),
      show: can('marcacoes'),
    },
    { Icon: CalendarX2, title: 'Fechar dias', hint: 'Folga, feriado ou férias', onClick: () => goTab('more', { name: 'closures' }), show: can('marcacoes') },
    { Icon: BellRing, title: 'Notificar clientes', hint: 'Uma mensagem a todas ou a algumas', onClick: () => goTab('more', { name: 'broadcast' }), show: can('notificacoes') },
    { Icon: Tag, title: 'Promoções', hint: 'Descontos num modelo ou em todos', onClick: () => goTab('more', { name: 'promotions' }), show: can('catalogo') },
  ].filter((q) => q.show)

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
            <TodayCard sessions={todaySessions} onClick={() => goTab('agenda')} />
            <RequestsCard pending={pending} onClick={() => goTab('requests')} />
            <WeekCard bookings={bookings} slots={slots} onClick={() => goTab('agenda', { name: 'agenda', id: 'horarios' })} />
            <MonthCard confirmed={confirmed} onClick={can('estatisticas') ? () => goTab('more', { name: 'stats' }) : undefined} />
          </div>

          <QuickActions
            onNewBooking={(startsAt) => newBooking(null, startsAt)}
            items={quick}
            freeSlots={nextFreeSlots}
          />

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
        <>
        {quick.length > 0 && <QuickActions items={quick} />}
        <EmptyState
          Icon={CalendarCheck}
          title={`Olá${firstName ? `, ${firstName}` : ''}`}
          text="Usa os separadores em baixo para o que tens acesso."
          action={can('clientes') ? { label: 'Abrir clientes', onClick: () => goTab('customers') } : undefined}
        />
        </>
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

      <div className="h-4" />
    </Screen>
  )
}
