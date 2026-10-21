import { bookingName, bookingPrice } from '@/lib/pricing'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Testimonial } from '@/lib/types'
import type { Permission } from './admin-me'
import type { MoreTarget } from './MoreView'
import { addDays, dayKey, plural, todayKey } from './admin-ui'

/*
 * The Início, made for the owner between two clients: in a few seconds she sees who comes next (and can reach her),
 * whether anything waits for her, how today goes and how the next days look. Charts and figures live in Estatísticas;
 * here only one quiet line about the month.
 */

const TZ = 'Europe/Lisbon'
const euros = (cents: number) => formatPrice(cents).replace(/,00/, '')
const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const weekdayOf = (key: string, style: 'long' | 'short') =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: style }).replace('.', '').split('-')[0]
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export function homeGreeting(name: string) {
  const hour = Number(new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
  const hello = hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'
  const first = name.trim().split(/\s+/)[0]
  return first ? `${hello}, ${first}` : hello
}

/** "Quarta-feira, 21 de outubro". */
export function homeDate() {
  return capital(new Date().toLocaleDateString('pt-PT', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }))
}

/** "daqui a 2 h", "daqui a 25 min", "amanhã", "sexta-feira". */
function untilLabel(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  const key = dayKey(iso)
  if (key === todayKey()) {
    if (minutes <= 0) return 'agora'
    if (minutes < 60) return `daqui a ${minutes} min`
    return `daqui a ${Math.round(minutes / 60)} h`
  }
  if (key === addDays(todayKey(), 1)) return 'Amanhã'
  return capital(weekdayOf(key, 'long'))
}

export function HomeView({
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
  const confirmed = bookings.filter((b) => b.status === 'ACCEPTED')
  const todaySessions = confirmed.filter((b) => dayKey(b.slot.startsAt) === today).sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))
  const next = confirmed.filter((b) => new Date(b.slot.startsAt).getTime() >= now).sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))[0]
  const pending = bookings.filter((b) => b.status === 'PENDING' && new Date(b.slot.startsAt).getTime() >= now)
  const pendingTestimonials = can('testemunhos') ? testimonials.filter((t) => t.status === 'PENDING').length : 0

  // The next four days: how many sessions and how many free times each.
  const days = [1, 2, 3, 4].map((i) => {
    const key = addDays(today, i)
    return {
      key,
      label: i === 1 ? 'Amanhã' : capital(weekdayOf(key, 'short')),
      day: Number(key.slice(8)),
      sessions: bookings.filter((b) => (b.status === 'ACCEPTED' || b.status === 'PENDING') && dayKey(b.slot.startsAt) === key).length,
      free: slots.filter((s) => s.status === 'OPEN' && dayKey(s.startsAt) === key).length,
    }
  })

  const month = new Date().toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7)
  const monthSessions = confirmed.filter((b) => new Date(b.slot.startsAt).toLocaleDateString('en-CA', { timeZone: TZ }).startsWith(month))
  const monthRevenue = monthSessions.reduce((sum, b) => sum + bookingPrice(b), 0)

  if (!can('marcacoes')) {
    return <p className="mt-6 font-subtitle text-sm text-muted-dark">Usa o menu em baixo para o que tens acesso.</p>
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {/* Who comes next: the one thing to know first. */}
      <section>
        <h2 className="mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">A seguir</h2>
        {next ? (
          <div className="rounded-3xl border border-onyx/10 bg-white p-5 shadow-sm shadow-black/5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-subtitle text-xl font-semibold tracking-tight text-onyx">{next.customerName}</p>
                <p className="mt-0.5 truncate font-subtitle text-sm text-muted-dark">{bookingName(next)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-subtitle text-2xl font-semibold lining-nums leading-none text-onyx">{time(next.slot.startsAt)}</p>
                <p className="mt-1 font-subtitle text-xs text-muted-dark">{untilLabel(next.slot.startsAt)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={customerWhatsappUrl(next.customerPhone, `Olá ${next.customerName.split(' ')[0]}! Sobre a tua sessão de ${bookingName(next)}...`)}
                target="_blank"
                rel="noreferrer"
                className="glass-chip flex h-11 items-center justify-center gap-1.5 rounded-full font-subtitle text-sm text-onyx"
              >
                <i className="bx bxl-whatsapp text-lg" aria-hidden="true" />
                WhatsApp
              </a>
              <a
                href={`tel:${next.customerPhone.replace(/[^+\d]/g, '')}`}
                className="glass-chip flex h-11 items-center justify-center gap-1.5 rounded-full font-subtitle text-sm text-onyx"
              >
                <i className="bx bx-phone text-lg" aria-hidden="true" />
                Ligar
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-onyx/[0.04] px-5 py-6 text-center">
            <p className="font-subtitle text-base font-medium text-onyx">Nenhuma sessão marcada</p>
            <p className="mt-1 font-subtitle text-sm text-muted-dark">Quando confirmares um pedido, a próxima cliente aparece aqui.</p>
          </div>
        )}
      </section>

      {/* Only when something waits for her. */}
      {(pending.length > 0 || pendingTestimonials > 0) && (
        <section className="flex flex-col gap-2">
          {pending.length > 0 && (
            <button
              type="button"
              onClick={() => onOpen('pedidos')}
              className="flex w-full items-center gap-3 rounded-2xl bg-onyx px-4 py-3.5 text-left text-white"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">
                <i className="bx bx-bell" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 font-subtitle">
                <span className="block text-[15px] font-medium">{plural(pending.length, 'pedido à espera', 'pedidos à espera')}</span>
                <span className="block truncate text-xs opacity-70">
                  {pending
                    .slice(0, 2)
                    .map((b) => b.customerName.split(' ')[0])
                    .join(', ')}
                  {pending.length > 2 ? ` e mais ${pending.length - 2}` : ''}
                </span>
              </span>
              <span className="shrink-0 font-subtitle text-sm font-medium">Responder</span>
              <i className="bx bx-chevron-right text-xl opacity-60" aria-hidden="true" />
            </button>
          )}
          {pendingTestimonials > 0 && (
            <button
              type="button"
              onClick={() => onOpen('testemunhos')}
              className="flex w-full items-center gap-3 rounded-2xl bg-onyx/[0.04] px-4 py-3 text-left"
            >
              <i className="bx bx-message-rounded-dots text-xl text-onyx" aria-hidden="true" />
              <span className="flex-1 font-subtitle text-sm text-onyx">{plural(pendingTestimonials, 'testemunho por rever', 'testemunhos por rever')}</span>
              <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />
            </button>
          )}
        </section>
      )}

      {/* Today, hour by hour. */}
      <section>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">Hoje</h2>
          <button type="button" onClick={() => onOpen('agenda')} className="font-subtitle text-xs text-muted-dark underline underline-offset-4">
            Ver agenda
          </button>
        </div>
        {todaySessions.length === 0 ? (
          <p className="rounded-2xl bg-onyx/[0.04] px-4 py-4 font-subtitle text-sm text-muted-dark">Sem sessões hoje.</p>
        ) : (
          <ol className="divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
            {todaySessions.map((b) => {
              const done = new Date(b.slot.startsAt).getTime() < now
              return (
                <li key={b.id} className={`flex items-center gap-4 px-4 py-3.5 ${done ? 'opacity-50' : ''}`}>
                  <span className="w-12 shrink-0 font-subtitle text-base font-semibold lining-nums text-onyx">{time(b.slot.startsAt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-subtitle text-[15px] font-medium text-onyx">{b.customerName}</span>
                    <span className="block truncate font-subtitle text-xs text-muted-dark">{b.service.name}</span>
                  </span>
                  {done ? (
                    <i className="bx bx-check text-xl text-onyx" aria-label="Feita" />
                  ) : (
                    <span className="shrink-0 font-subtitle text-sm lining-nums text-muted-dark">{euros(bookingPrice(b))}</span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {/* The next days at a glance: sessions, and free times left. */}
      <section>
        <h2 className="mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">Próximos dias</h2>
        <div className="grid grid-cols-4 gap-2">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => onOpen('agenda')}
              className="flex flex-col items-center rounded-2xl border border-onyx/10 bg-white px-1 py-3 shadow-sm shadow-black/5"
            >
              <span className="font-subtitle text-[11px] text-muted-dark">{d.label}</span>
              <span className="font-subtitle text-lg font-semibold lining-nums leading-tight text-onyx">{d.day}</span>
              <span className="mt-1.5 font-subtitle text-[11px] text-onyx">{plural(d.sessions, 'sessão', 'sessões')}</span>
              <span className={`font-subtitle text-[10px] ${d.free ? 'text-muted-dark' : 'text-red-700/80'}`}>
                {d.free ? plural(d.free, 'livre', 'livres') : 'sem vagas'}
              </span>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => onNewBooking()}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-onyx font-subtitle text-sm font-medium text-white"
      >
        <i className="bx bx-plus text-lg" aria-hidden="true" />
        Nova marcação
      </button>

      {/* One quiet line about the month; the rest is in Estatísticas. */}
      <button
        type="button"
        disabled={!can('estatisticas')}
        onClick={() => onOpen('estatisticas')}
        className="-mt-3 flex items-center justify-center gap-1.5 font-subtitle text-xs text-muted-dark"
      >
        Este mês: {euros(monthRevenue)} · {plural(monthSessions.length, 'sessão', 'sessões')}
        {can('estatisticas') && <i className="bx bx-chevron-right text-base" aria-hidden="true" />}
      </button>
    </div>
  )
}
