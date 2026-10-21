import { bookingPrice } from '@/lib/pricing'
import { formatPrice, type AvailabilitySlot, type Booking, type Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, dayKey, group, Row, Section, shortDay, todayKey } from './admin-ui'

const TZ = 'Europe/Lisbon'
const euros = (cents: number) => formatPrice(cents).replace(/,00/, '')
const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const monthOf = (d: Date) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7)

function greeting() {
  const hour = Number(new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  return hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'
}

/** "Hoje", "Amanhã" or "Sexta, 24 out". */
function dayLabel(iso: string) {
  const key = dayKey(iso)
  if (key === todayKey()) return 'Hoje'
  if (key === addDays(todayKey(), 1)) return 'Amanhã'
  const weekday = new Date(iso).toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'long' }).split('-')[0]
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${shortDay(key)}`
}

/**
 * The day at a glance, as plain grouped lists like the Mais page: today, the requests, the week and the month, each
 * line with its figure on the right and a tap to where it is; then what is done most.
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
  const today = todayKey()
  const weekEnd = now + 7 * 86_400_000
  const firstName = name.trim().split(/\s+/)[0]

  const confirmed = bookings.filter((b) => b.status === 'ACCEPTED')
  const todaySessions = confirmed.filter((b) => dayKey(b.slot.startsAt) === today).sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  const upcoming = confirmed.filter((b) => new Date(b.slot.startsAt).getTime() >= now).sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  const next = upcoming[0]
  const nextToday = todaySessions.find((b) => new Date(b.slot.startsAt).getTime() >= now)
  const pending = bookings
    .filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now)
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  const weekBooked = upcoming.filter((b) => new Date(b.slot.startsAt).getTime() < weekEnd).length
  const freeSlots = slots
    .filter((s) => s.status === 'OPEN' && new Date(s.startsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const weekFree = freeSlots.filter((s) => new Date(s.startsAt).getTime() < weekEnd).length

  const thisMonth = monthOf(new Date())
  const prev = new Date()
  prev.setDate(1)
  prev.setMonth(prev.getMonth() - 1)
  const lastMonth = monthOf(prev)
  const monthRevenue = confirmed.filter((b) => monthOf(new Date(b.slot.startsAt)) === thisMonth).reduce((sum, b) => sum + bookingPrice(b), 0)
  const lastRevenue = confirmed.filter((b) => monthOf(new Date(b.slot.startsAt)) === lastMonth).reduce((sum, b) => sum + bookingPrice(b), 0)
  const lastName = prev.toLocaleDateString('pt-PT', { month: 'long' })
  const waitingCents = pending.reduce((sum, b) => sum + bookingPrice(b), 0)
  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING').length

  // A figure on the right of a row, and the chevron when the row opens something.
  const value = (text: string, strong = false) => (
    <span className="flex shrink-0 items-center gap-1">
      <span className={`font-subtitle text-[15px] lining-nums ${strong ? 'font-semibold text-onyx' : 'text-muted-dark'}`}>{text}</span>
      <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
    </span>
  )

  return (
    <div className="mt-2 flex flex-col gap-7">
      <p className="font-subtitle text-sm text-muted-dark">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}.
      </p>

      {can('marcacoes') && (
        <>
          <Section title="Hoje">
            <div className={group}>
              <Row icon="bx bx-calendar-check" title="Sessões hoje" onClick={() => onOpen('agenda')} right={value(String(todaySessions.length), true)} />
              <Row
                icon="bx bx-time-five"
                title={next ? `Próxima: ${next.customerName}` : 'Próxima'}
                text={next ? `${dayLabel(next.slot.startsAt)} · ${next.service.name}` : 'Nenhuma sessão marcada'}
                onClick={() => onOpen('agenda')}
                right={next ? value(time(next.slot.startsAt), true) : undefined}
              />
              <Row
                icon="bx bx-euro"
                title="Previstos hoje"
                text={nextToday ? undefined : todaySessions.length ? 'Todas concluídas' : undefined}
                right={
                  <span className="shrink-0 font-subtitle text-[15px] font-semibold lining-nums text-onyx">
                    {euros(todaySessions.reduce((sum, b) => sum + bookingPrice(b), 0))}
                  </span>
                }
              />
            </div>
          </Section>

          <Section title="Pedidos">
            <div className={group}>
              <Row
                icon="bx bx-bell"
                title="À espera de resposta"
                text={pending[0] ? `O próximo: ${pending[0].customerName}, ${dayLabel(pending[0].slot.startsAt)}` : 'Tudo respondido'}
                onClick={() => onOpen('pedidos')}
                right={
                  pending.length ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 font-subtitle text-xs text-[#ffffff]">
                        {pending.length}
                      </span>
                      <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
                    </span>
                  ) : (
                    value('0')
                  )
                }
              />
              {pending.length > 0 && (
                <Row
                  icon="bx bx-wallet"
                  title="Valor em espera"
                  right={<span className="shrink-0 font-subtitle text-[15px] font-semibold lining-nums text-onyx">{euros(waitingCents)}</span>}
                />
              )}
            </div>
          </Section>

          <Section title="Esta semana">
            <div className={group}>
              <Row icon="bx bx-calendar-week" title="Sessões nos próximos 7 dias" onClick={() => onOpen('agenda')} right={value(String(weekBooked), true)} />
              <Row
                icon="bx bx-time"
                title="Horários livres"
                text={weekFree ? undefined : 'Abre horários para as clientes poderem marcar'}
                onClick={() => onOpen('disponibilidade')}
                right={value(String(weekFree), true)}
              />
              <Row
                icon="bx bx-bar-chart-alt-2"
                title="Receita do mês"
                text={
                  lastRevenue
                    ? monthRevenue >= lastRevenue
                      ? `+${euros(monthRevenue - lastRevenue)} que em ${lastName}`
                      : `${Math.round((monthRevenue / lastRevenue) * 100)}% de ${lastName}`
                    : undefined
                }
                onClick={can('estatisticas') ? () => onOpen('estatisticas') : undefined}
                right={
                  can('estatisticas') ? (
                    value(euros(monthRevenue), true)
                  ) : (
                    <span className="shrink-0 font-subtitle text-[15px] font-semibold lining-nums text-onyx">{euros(monthRevenue)}</span>
                  )
                }
              />
            </div>
          </Section>
        </>
      )}

      <Section title="Ações">
        <div className={group}>
          {can('marcacoes') && (
            <>
              <Row icon="bx bx-plus" title="Nova marcação" text="Por WhatsApp, Instagram ou ao balcão" onClick={() => onNewBooking()} />
              <Row icon="bx bx-calendar-plus" title="Abrir horários" text="Um dia ou a semana" onClick={() => onOpen('disponibilidade')} />
              <Row icon="bx bx-calendar-x" title="Dias fechados" text="Folga, feriado ou férias" onClick={() => onOpen('fechos')} />
            </>
          )}
          {can('notificacoes') && <Row icon="bx bx-bell-plus" title="Notificar clientes" text="Uma mensagem a todas ou a algumas" onClick={() => onOpen('notificar')} />}
          {can('catalogo') && <Row icon="bx bx-purchase-tag" title="Promoções" text="Descontos num modelo ou em todos" onClick={() => onOpen('promocoes')} />}
          {can('testemunhos') && pendingTestimonials > 0 && (
            <Row icon="bx bx-message-rounded-dots" title="Testemunhos por rever" onClick={() => onOpen('testemunhos')} right={value(String(pendingTestimonials), true)} />
          )}
          {can('clientes') && <Row icon="bx bx-user" title="Clientes" text="Fichas, notas e fotos" onClick={() => onOpen('clientes')} />}
        </div>
      </Section>
    </div>
  )
}
