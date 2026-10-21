import {
  ArrowUpRight,
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
import { motion } from 'motion/react'
import { customerWhatsappUrl } from '@/lib/site-config'
import { MonthCard, RequestsCard, TodayCard, WeekCard } from './home-cards'
import { cn } from '@/lib/utils'
import { bookingName, bookingPrice } from '@/lib/pricing'
import type { Booking } from '@/lib/types'
import { useAdmin } from '../admin-context'
import { addDaysKey, dateKey, dateParts, euros, greeting, longDate, plural, telHref, todayKey, whenLabel } from '../format'
import { Avatar, Cell, EmptyState, Screen, Section } from '../ios'

interface QuickActionItem {
  Icon: LucideIcon
  title: string
  hint: string
  onClick: () => void
  show: boolean
}

/**
 * What is done most, in reach: a large dark "Nova marcação" (the one done every day), and the rest as cards in two
 * columns, each with its icon, name and a line about it.
 */
function QuickActions({
  items,
  onNewBooking,
  nextFree,
  freeCount = 0,
}: {
  items: QuickActionItem[]
  onNewBooking?: () => void
  /** "Amanhã às 09:00": the first free time, to book straight into. */
  nextFree?: string | null
  freeCount?: number
}) {
  return (
    <Section flush header="Ações rápidas">
      {onNewBooking && (
        <motion.button
          type="button"
          onClick={onNewBooking}
          whileTap={{ scale: 0.98 }}
          className="relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-[var(--ios-tint)] p-4 pr-3 text-left text-[var(--ios-on-tint)] shadow-lg shadow-black/15"
        >
          {/* A soft gold glow behind the +, and a light sweeping across now and then. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-12 size-44 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.35),transparent_65%)]"
          />
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent"
            initial={{ left: '-40%' }}
            animate={{ left: ['-40%', '140%'] }}
            transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4.5 }}
          />
          <span className="relative flex size-14 shrink-0 items-center justify-center">
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full ring-2 ring-[#c9a84c]"
              animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
            <span className="flex size-14 items-center justify-center rounded-full bg-[#c9a84c] text-[#1c1c1e] shadow-[0_4px_14px_rgba(201,168,76,0.45)]">
              <Plus className="size-7" strokeWidth={2.4} />
            </span>
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-lg font-semibold leading-tight">Nova marcação</span>
            <span className="mt-0.5 block truncate text-xs opacity-75">
              {nextFree ? `Próxima vaga: ${nextFree}` : 'Por WhatsApp, Instagram ou ao balcão'}
            </span>
            {freeCount > 0 && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--ios-on-tint)_14%,transparent)] px-2.5 py-1 text-[11px] font-medium">
                <span className="size-1.5 rounded-full bg-[var(--ios-green)]" />
                {plural(freeCount, 'vaga livre', 'vagas livres')} esta semana
              </span>
            )}
          </span>
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ios-on-tint)_14%,transparent)]">
            <ArrowUpRight className="size-[18px]" strokeWidth={2.2} />
          </span>
        </motion.button>
      )}
      {items.length > 0 && (
        <div className={cn('grid grid-cols-2 gap-3', onNewBooking && 'mt-3')}>
          {items.map((item, i) => (
            <motion.button
              key={item.title}
              type="button"
              onClick={item.onClick}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'flex min-w-0 flex-col items-start gap-3 rounded-2xl bg-[var(--ios-cell)] p-4 text-left',
                items.length % 2 === 1 && i === items.length - 1 && 'col-span-2',
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ios-bg)] shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_0_0_0.5px_var(--ios-separator)]">
                  <item.Icon className="size-[18px]" strokeWidth={1.9} />
                </span>
                <ArrowUpRight className="size-4 text-[var(--ios-tertiary)]" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-[var(--ios-secondary)]">{item.hint}</span>
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </Section>
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
  const pending = bookings
    .filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const freeWeek = slots.filter((s) => {
    const t = new Date(s.startsAt).getTime()
    return s.status === 'OPEN' && t >= now && t < weekEnd
  }).length
  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING').length
  const nextFreeSlot = slots
    .filter((s) => s.status === 'OPEN' && new Date(s.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]

  const quick: QuickActionItem[] = [
    {
      Icon: CalendarPlus,
      title: 'Abrir horários',
      hint: freeWeek ? `${plural(freeWeek, 'livre', 'livres')} esta semana` : 'Semana sem vagas',
      onClick: () => goTab('agenda', { name: 'agenda', id: 'horarios' }),
      show: can('marcacoes'),
    },
    { Icon: CalendarX2, title: 'Fechar dias', hint: 'Férias, folgas, feriados', onClick: () => goTab('more', { name: 'closures' }), show: can('marcacoes') },
    { Icon: BellRing, title: 'Notificar', hint: 'Mensagem às clientes', onClick: () => goTab('more', { name: 'broadcast' }), show: can('notificacoes') },
    { Icon: Tag, title: 'Promoções', hint: 'Descontos por uns dias', onClick: () => goTab('more', { name: 'promotions' }), show: can('catalogo') },
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
            onNewBooking={() => newBooking(null)}
            items={quick}
            nextFree={nextFreeSlot ? whenLabel(nextFreeSlot.startsAt) : null}
            freeCount={freeWeek}
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
