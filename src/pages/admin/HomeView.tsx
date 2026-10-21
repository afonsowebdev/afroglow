import { bookingName, bookingPrice } from '@/lib/pricing'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, dayKey, group, plural, Row, Section, shortDay, todayKey } from './admin-ui'

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

/** One of the four figures on top, in the admin's white card (dark when something waits for an answer). */
function Figure({
  label,
  value,
  hint,
  bar,
  dark = false,
  onClick,
}: {
  label: string
  value: string
  hint: string
  bar?: number
  dark?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex min-w-0 flex-col rounded-2xl p-4 text-left shadow-sm shadow-black/5 ${
        dark ? 'bg-onyx text-white' : 'border border-onyx/10 bg-white'
      }`}
    >
      <span className={`font-subtitle text-[11px] font-medium uppercase tracking-[0.14em] ${dark ? 'opacity-60' : 'text-muted-dark'}`}>{label}</span>
      <span className="mt-1.5 truncate font-subtitle text-[28px] font-semibold lining-nums leading-none tracking-tight">{value}</span>
      <span className={`mt-1.5 truncate font-subtitle text-xs ${dark ? 'opacity-70' : 'text-muted-dark'}`}>{hint}</span>
      {bar !== undefined && (
        <span className={`mt-2.5 block h-1.5 overflow-hidden rounded-full ${dark ? 'bg-white/20' : 'bg-onyx/10'}`}>
          <span className={`block h-full rounded-full ${dark ? 'bg-white' : 'bg-onyx'}`} style={{ width: `${Math.round(Math.min(1, bar) * 100)}%` }} />
        </span>
      )}
    </button>
  )
}

/**
 * The day at a glance, in the admin's own look: the four figures (today, requests, the next 7 days, the month), the
 * next session in the dark card, today's sessions, the requests waiting, and what is done most.
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

  return (
    <div className="mt-2">
      <p className="font-subtitle text-sm text-muted-dark">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}.
      </p>

      {can('marcacoes') && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Figure
              label="Hoje"
              value={plural(todaySessions.length, 'sessão', 'sessões')}
              hint={nextToday ? `Próxima às ${time(nextToday.slot.startsAt)}` : todaySessions.length ? 'Todas concluídas' : 'Dia sem sessões'}
              onClick={() => onOpen('agenda')}
            />
            <Figure
              label="Pedidos"
              value={String(pending.length)}
              hint={pending.length ? `${euros(waitingCents)} à espera` : 'Tudo respondido'}
              dark={pending.length > 0}
              onClick={() => onOpen('pedidos')}
            />
            <Figure
              label="7 dias"
              value={plural(weekBooked, 'sessão', 'sessões')}
              hint={weekFree ? plural(weekFree, 'horário livre', 'horários livres') : 'Sem horários livres'}
              bar={weekBooked + weekFree ? weekBooked / (weekBooked + weekFree) : 0}
              onClick={() => onOpen('disponibilidade')}
            />
            <Figure
              label="Este mês"
              value={euros(monthRevenue)}
              hint={
                lastRevenue
                  ? monthRevenue >= lastRevenue
                    ? `+${euros(monthRevenue - lastRevenue)} que em ${lastName}`
                    : `${Math.round((monthRevenue / lastRevenue) * 100)}% de ${lastName}`
                  : 'Sessões confirmadas'
              }
              bar={lastRevenue ? monthRevenue / lastRevenue : undefined}
              onClick={can('estatisticas') ? () => onOpen('estatisticas') : undefined}
            />
          </div>

          {/* The next session, large, as in the Agenda. */}
          {next && (
            <section className="mt-6 rounded-3xl bg-onyx p-5 text-white">
              <p className="font-subtitle text-xs uppercase tracking-[0.14em] opacity-60">
                A seguir · {dayLabel(next.slot.startsAt).toLowerCase()}
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-subtitle text-2xl font-semibold tracking-tight">{next.customerName}</p>
                  <p className="mt-0.5 truncate font-subtitle text-sm opacity-70">{bookingName(next)}</p>
                </div>
                <p className="shrink-0 font-subtitle text-3xl font-semibold lining-nums leading-none">{time(next.slot.startsAt)}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={customerWhatsappUrl(next.customerPhone, `Olá ${next.customerName}! Sobre a tua sessão de ${bookingName(next)}...`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/15 font-subtitle text-sm"
                >
                  <i className="bx bxl-whatsapp text-lg" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  href={`tel:${next.customerPhone.replace(/[^+\d]/g, '')}`}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white/15 font-subtitle text-sm"
                >
                  <i className="bx bx-phone text-lg" aria-hidden="true" />
                  Ligar
                </a>
              </div>
            </section>
          )}

          <Section title={`Hoje · ${plural(todaySessions.length, 'sessão', 'sessões')}`} className="mt-7">
            <div className={group}>
              {todaySessions.length === 0 ? (
                <p className="px-4 py-3.5 font-subtitle text-sm text-muted-dark">Sem sessões hoje.</p>
              ) : (
                todaySessions.map((b) => {
                  const past = new Date(b.slot.startsAt).getTime() < now
                  return (
                    <button key={b.id} type="button" onClick={() => onOpen('agenda')} className="flex w-full items-center gap-4 px-4 py-3 text-left active:bg-onyx/[0.04]">
                      <span className={`w-14 shrink-0 font-subtitle text-lg font-semibold lining-nums ${past ? 'text-onyx/40' : 'text-onyx'}`}>
                        {time(b.slot.startsAt)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-subtitle text-[15px] font-medium text-onyx">{b.customerName}</span>
                        <span className="block truncate font-subtitle text-xs text-muted-dark">{bookingName(b)}</span>
                      </span>
                      <span className="shrink-0 font-subtitle text-sm font-semibold lining-nums text-onyx">{euros(bookingPrice(b))}</span>
                    </button>
                  )
                })
              )}
            </div>
          </Section>

          {pending.length > 0 && (
            <Section title="À espera de resposta" className="mt-7">
              <div className={group}>
                {pending.slice(0, 3).map((b) => (
                  <button key={b.id} type="button" onClick={() => onOpen('pedidos')} className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-onyx/[0.04]">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-base font-semibold text-white">
                      {b.customerName.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-subtitle text-[15px] font-medium text-onyx">{b.customerName}</span>
                      <span className="block truncate font-subtitle text-xs text-muted-dark">
                        {b.service.name} · {dayLabel(b.slot.startsAt)}, {time(b.slot.startsAt)}
                      </span>
                    </span>
                    <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Booking someone in: the black pill, and the next free times right under it. */}
          <Section title="Marcar" className="mt-7">
            <button
              type="button"
              onClick={() => onNewBooking()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-onyx font-subtitle text-sm font-medium text-white"
            >
              <i className="bx bx-plus text-lg" aria-hidden="true" />
              Nova marcação
            </button>
            {freeSlots.length > 0 && (
              <>
                <p className="mt-4 px-1 font-subtitle text-xs text-muted-dark">Ou marca já numa vaga livre:</p>
                <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {freeSlots.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onNewBooking(s.startsAt)}
                      className="glass-chip shrink-0 rounded-2xl px-4 py-2 text-center"
                    >
                      <span className="block font-subtitle text-xs text-muted-dark">{dayLabel(s.startsAt)}</span>
                      <span className="block font-subtitle text-base font-semibold lining-nums text-onyx">{time(s.startsAt)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Section>
        </>
      )}

      <Section title="Ações rápidas" className="mt-7">
        <div className={group}>
          {can('marcacoes') && (
            <>
              <Row icon="bx bx-calendar-plus" title="Abrir horários" text="Um dia ou a semana" onClick={() => onOpen('disponibilidade')} />
              <Row icon="bx bx-calendar-x" title="Dias fechados" text="Folga, feriado ou férias" onClick={() => onOpen('fechos')} />
            </>
          )}
          {can('notificacoes') && <Row icon="bx bx-bell" title="Notificar clientes" text="Uma mensagem a todas ou a algumas" onClick={() => onOpen('notificar')} />}
          {can('catalogo') && <Row icon="bx bx-purchase-tag" title="Promoções" text="Descontos num modelo ou em todos" onClick={() => onOpen('promocoes')} />}
          {can('testemunhos') && pendingTestimonials > 0 && (
            <Row
              icon="bx bx-message-rounded-dots"
              title="Testemunhos por rever"
              text={plural(pendingTestimonials, 'à espera de decisão', 'à espera de decisão')}
              onClick={() => onOpen('testemunhos')}
            />
          )}
          {can('clientes') && <Row icon="bx bx-user" title="Clientes" text="Fichas, notas e fotos" onClick={() => onOpen('clientes')} />}
        </div>
      </Section>
    </div>
  )
}
