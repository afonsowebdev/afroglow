import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarCheck, CalendarPlus, UserRound } from 'lucide-react'
import { ActionButton } from '@/components/ui/action-button'
import { AnimatedSocialIcons, type ActionIcon } from '@/components/ui/floating-action-button'
import { api, assetUrl } from '@/lib/api'
import { tap } from '@/lib/haptics'
import { serviceImageUrls } from '@/lib/service-images'
import { useCustomerAuth } from '@/lib/customer-auth'
import { instagramDmUrl, mapSearchText, siteConfig, useBusinessInfo } from '@/lib/site-config'
import { useOpeningStatus } from '@/lib/opening-hours'
import type { AvailabilitySlot, Booking, Service } from '@/lib/types'
import { useBookingAlerts } from './booking-alerts'
import { SwipeHint, useSwipeNudge } from '@/components/ui/swipe-hint'
import { ServicePreview } from './ServicePreview'
import { dayKey, dayParts, longDay, timeLabel } from './dates'
import { servicePriceLabel, bookingExtras } from '@/lib/pricing'

/** Time-of-day greeting plus one line of what matters right now (a decision to look at, or free slots). */
export function Greeting() {
  const { customer } = useCustomerAuth()
  const { unseen } = useBookingAlerts()
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null)
  const [allOpen, setAllOpen] = useState(false)
  const [moreDays, setMoreDays] = useState(false)

  useEffect(() => {
    api
      .get<AvailabilitySlot[]>('/availability?include=busy')
      .then(setSlots)
      .catch(() => setSlots([]))
  }, [])

  const hour = Number(
    new Date().toLocaleTimeString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', hour12: false }),
  )
  const hello = hour < 6 ? 'Boa noite' : hour < 13 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'
  const first = customer?.name.split(' ')[0]

  const future = (slots ?? [])
    .filter((s) => new Date(s.startsAt).getTime() > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const upcoming = future.slice(0, 6)

  // The full list: every day with its free and taken times; three days first, the rest on "Ver mais".
  const days = [
    ...future.reduce(
      (map, s) => map.set(dayKey(s.startsAt), [...(map.get(dayKey(s.startsAt)) ?? []), s]),
      new Map<string, AvailabilitySlot[]>(),
    ),
  ]
  const shownDays = moreDays ? days : days.slice(0, 3)

  return (
    <div>
      <h1 className="font-subtitle text-3xl font-semibold tracking-tight text-onyx">
        {hello}
        {first ? `, ${first}` : ''}
      </h1>

      {unseen.size > 0 && (
        <Link to="/marcacoes" className="mt-2 flex items-center gap-2 font-subtitle text-sm text-muted-dark">
          <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" aria-hidden="true" />
          {unseen.size === 1 ? 'Tens uma resposta à tua marcação.' : `Tens ${unseen.size} respostas às tuas marcações.`}
          <span className="font-medium text-onyx underline underline-offset-4">Ver</span>
        </Link>
      )}

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">
            Horários disponíveis
          </h2>
          {future.length > 0 && (
            <button
              type="button"
              aria-expanded={allOpen}
              onClick={() => {
                void tap()
                setAllOpen((v) => !v)
                setMoreDays(false)
              }}
              className="font-subtitle text-xs font-medium text-onyx underline underline-offset-4"
            >
              {allOpen ? 'Fechar' : 'Ver todos'}
            </button>
          )}
        </div>
        <p className="mt-1 font-subtitle text-xs font-light text-muted-dark">
          Livres ou ocupados. Toca num livre para o reservares.
        </p>
        {slots === null ? (
          <div className="-mx-5 mt-3 flex gap-2.5 px-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[88px] w-24 shrink-0 animate-pulse rounded-2xl bg-onyx/5" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <p className="mt-3 font-subtitle text-sm text-muted-dark">Sem horários livres de momento.</p>
        ) : allOpen ? (
          <div className="mt-3 rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white p-4">
            {shownDays.map(([key, daySlots], index) => {
              const free = daySlots.filter((x) => x.status === 'OPEN').length
              return (
                <div key={key} className={index > 0 ? 'mt-4 border-t border-onyx/10 pt-4' : ''}>
                  <div className="flex items-baseline justify-between">
                    <p className="font-subtitle text-sm font-semibold text-onyx">{longDay(daySlots[0].startsAt)}</p>
                    <p className={`font-subtitle text-xs ${free > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {free > 0 ? `${free} ${free === 1 ? 'livre' : 'livres'}` : 'Dia completo'}
                    </p>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {daySlots.map((slot) => {
                      const busy = slot.status !== 'OPEN'
                      return busy ? (
                        <span
                          key={slot.id}
                          aria-label={`${timeLabel(slot.startsAt)}, ocupado`}
                          className="flex items-center gap-1.5 rounded-full bg-onyx/5 px-3 py-1.5 font-subtitle text-sm text-onyx/40 line-through"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden="true" />
                          {timeLabel(slot.startsAt)}
                        </span>
                      ) : (
                        <Link
                          key={slot.id}
                          to={`/marcar?slot=${slot.id}`}
                          onClick={() => void tap()}
                          className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 font-subtitle text-sm text-onyx"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                          {timeLabel(slot.startsAt)}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {days.length > 3 && (
              <button
                type="button"
                onClick={() => {
                  void tap()
                  setMoreDays((v) => !v)
                }}
                className="mt-4 flex w-full items-center justify-center gap-1 border-t border-onyx/10 pt-3 font-subtitle text-sm font-medium text-onyx"
              >
                {moreDays ? 'Ver menos' : `Ver mais (${days.length - 3} ${days.length - 3 === 1 ? 'dia' : 'dias'})`}
                <i className={`bx ${moreDays ? 'bx-chevron-up' : 'bx-chevron-down'} text-lg`} aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div className="-mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {upcoming.map((slot) => {
              const parts = dayParts(slot.startsAt)
              const busy = slot.status !== 'OPEN'
              const body = (
                <>
                  <span className="font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">
                    {parts.weekday.slice(0, 3)} {parts.day} {parts.month}
                  </span>
                  <span
                    className={`mt-0.5 font-subtitle text-xl font-semibold leading-none ${busy ? 'text-onyx/40 line-through' : 'text-onyx'}`}
                  >
                    {timeLabel(slot.startsAt)}
                  </span>
                  <span
                    className={`mt-1.5 flex items-center gap-1 font-subtitle text-[10px] font-medium ${busy ? 'text-red-700' : 'text-emerald-700'}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${busy ? 'bg-red-600' : 'bg-emerald-600'}`}
                      aria-hidden="true"
                    />
                    {busy ? 'Ocupado' : 'Livre'}
                  </span>
                </>
              )
              const base = 'glass-chip flex h-[88px] w-24 shrink-0 flex-col items-center justify-center rounded-2xl'
              return busy ? (
                <div
                  key={slot.id}
                  className={`${base} opacity-70`}
                  aria-label={`${parts.day} ${parts.month} às ${timeLabel(slot.startsAt)}, ocupado`}
                >
                  {body}
                </div>
              ) : (
                <Link key={slot.id} to={`/marcar?slot=${slot.id}`} onClick={() => void tap()} className={base}>
                  {body}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/** Greeting card: the next session when there is one, otherwise a nudge to book or sign in. */
export function WelcomeCard() {
  const { customer, loading } = useCustomerAuth()
  const [bookings, setBookings] = useState<Booking[] | null>(null)

  useEffect(() => {
    if (!customer) return
    api
      .get<Booking[]>('/account/bookings')
      .then(setBookings)
      .catch(() => setBookings([]))
  }, [customer])

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-onyx/5" />

  const panel = 'rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 bg-white p-5'
  const label = 'font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dark'

  // Plain panel with one clear action, used when there is no upcoming session to show.
  const invite = (kicker: string, title: string, text: string, to: string, cta: string) => (
    <div className={panel}>
      <p className={label}>{kicker}</p>
      <p className="mt-2 font-subtitle text-xl font-semibold tracking-tight text-onyx">{title}</p>
      <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">{text}</p>
      <ActionButton to={to} label={cta} className="mt-5" />
    </div>
  )

  if (!customer) {
    return invite(
      'A tua conta',
      'Entra para marcar sessões',
      'Com conta recebes um aviso quando a marcação é confirmada.',
      '/entrar',
      'Entrar ou criar conta',
    )
  }

  const next = (bookings ?? [])
    .filter((b) => (b.status === 'PENDING' || b.status === 'ACCEPTED') && new Date(b.slot.startsAt) > new Date())
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))[0]

  if (!next) {
    // No upcoming session: the greeting strip above already says how to book, so this card offers something else.
    const last = (bookings ?? [])
      .filter((b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt) < new Date())
      .sort((a, b) => b.slot.startsAt.localeCompare(a.slot.startsAt))[0]
    if (last) {
      const weeks = Math.max(1, Math.round((Date.now() - new Date(last.slot.startsAt).getTime()) / (7 * 86_400_000)))
      return invite(
        'A tua última sessão',
        last.service.name,
        `Há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}. Queres o mesmo penteado outra vez?`,
        `/marcar?service=${last.serviceId}`,
        'Repetir este penteado',
      )
    }
    // First time here: the services are right below, so no card is needed.
    return null
  }

  const pending = next.status === 'PENDING'
  return (
    <Link to="/marcacoes" className={`${panel} block`}>
      <div className="flex items-center justify-between">
        <p className={label}>Próxima sessão</p>
        <span className="flex items-center gap-1.5 font-subtitle text-xs text-onyx">
          <span className={`h-2 w-2 rounded-full ${pending ? 'bg-amber-500' : 'bg-emerald-600'}`} aria-hidden="true" />
          {pending ? 'Por confirmar' : 'Confirmada'}
        </span>
      </div>
      <p className="mt-2 font-subtitle text-xl font-semibold tracking-tight text-onyx">{next.service.name}</p>
      {bookingExtras(next) && <p className="font-subtitle text-sm text-muted-dark">{bookingExtras(next)}</p>}

      <dl className="mt-4 grid grid-cols-[2fr_1fr] gap-4 border-t border-onyx/15 pt-4">
        <div>
          <dt className={label}>Data</dt>
          <dd className="mt-1 font-subtitle text-sm font-medium text-onyx">{longDay(next.slot.startsAt)}</dd>
        </div>
        <div>
          <dt className={label}>Hora</dt>
          <dd className="mt-1 font-subtitle text-sm font-medium text-onyx">{timeLabel(next.slot.startsAt)}</dd>
        </div>
      </dl>

      <p className="mt-4 flex items-center justify-end gap-1 font-subtitle text-sm font-medium text-onyx">
        Ver detalhes <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
      </p>
    </Link>
  )
}

const PHOTOS = [
  { src: '/images/hero/hero-1.jpg', alt: 'Knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-2.jpg', alt: 'Detalhe de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-3.jpg', alt: 'Vista lateral de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-4.jpg', alt: 'Padrão de repartição triangular em knotless braids' },
  { src: '/images/hero/hero-5.jpg', alt: 'Detalhe do couro cabeludo com repartição triangular' },
]

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5">
      <h2 className="font-subtitle text-2xl font-semibold tracking-tight text-onyx">{title}</h2>
      {hint && <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">{hint}</p>}
    </div>
  )
}

/**
 * Under a full-screen strip: where the customer is ("01 / 05" and a progress line) and, together on the right, round
 * buttons to go back and forward (dimmed at the ends). Swiping still works; the buttons make it obvious.
 */
function CarouselControls({
  index,
  count,
  onGo,
  what,
}: {
  index: number
  count: number
  onGo: (to: number) => void
  what: string
}) {
  if (count < 2) return null
  const button =
    'glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-[1.6rem] text-onyx transition-opacity disabled:opacity-30'
  return (
    <div className="mx-auto mt-4 flex w-full max-w-2xl items-center gap-4 px-5">
      <p className="shrink-0 font-subtitle text-sm tabular-nums" aria-label={`${index + 1} de ${count}`}>
        <span className="font-semibold text-onyx">{String(index + 1).padStart(2, '0')}</span>
        <span className="text-muted-dark"> / {String(count).padStart(2, '0')}</span>
      </p>
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-onyx/10" aria-hidden="true">
        <div
          className="h-full rounded-full bg-onyx transition-[width] duration-300 ease-out"
          style={{ width: `${((index + 1) / count) * 100}%` }}
        />
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          aria-label={`${what} anterior`}
          disabled={index <= 0}
          onClick={() => onGo(index - 1)}
          className={button}
        >
          <i className="bx bx-chevron-left" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`${what} seguinte`}
          disabled={index >= count - 1}
          onClick={() => onGo(index + 1)}
          className={button}
        >
          <i className="bx bx-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/** The distance from one slide to the next in a strip (its width plus the gap). */
function slideStep(el: HTMLDivElement) {
  const [first, second] = el.children as unknown as HTMLElement[]
  if (!first) return el.clientWidth
  return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth
}

/** Which slide of a strip is in place now. */
function stripIndex(el: HTMLDivElement, count: number) {
  return Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / slideStep(el))))
}

/** Scrolls a strip to slide `to` (clamped), smoothly. */
function scrollStrip(el: HTMLDivElement | null, to: number, count: number) {
  if (!el) return
  void tap()
  el.scrollTo({ left: Math.max(0, Math.min(count - 1, to)) * slideStep(el), behavior: 'smooth' })
}

/**
 * A home section that fills the screen on its own (nothing of the page above or below shows), its content centred
 * with the same room above and below (the tab bar sits in the room below). The page scrolls past it freely (no
 * snapping, which made it feel stuck).
 */
const fullScreenSection =
  'flex h-[100svh] min-h-[600px] flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[calc(3.75rem+env(safe-area-inset-top))]'

/**
 * The strip of a full-screen section: each slide a little narrower than the screen, so the edge of the next one shows
 * on the right (it plainly goes on sideways), settling on one slide at a time.
 */
const strip =
  'mt-5 flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
const slide = 'h-full w-[86%] max-w-md shrink-0 snap-start snap-always'

/** Four shortcuts behind a "+" button that slides away to show them. */
export function QuickActions({ whatsappUrl }: { whatsappUrl?: string }) {
  const icons: ActionIcon[] = [
    { Icon: CalendarPlus, label: 'Marcar', to: '/marcar' },
    { Icon: CalendarCheck, label: 'Marcações', to: '/marcacoes' },
    whatsappUrl
      ? { iconClass: 'bx bxl-whatsapp', label: 'WhatsApp', href: whatsappUrl }
      : { Icon: UserRound, label: 'Conta', to: '/conta' },
    { iconClass: 'bx bxl-instagram', label: 'Instagram', href: instagramDmUrl() },
  ]
  return (
    <div className="mt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="font-subtitle text-sm font-semibold tracking-tight text-onyx">Atalhos</p>
        <p className="font-subtitle text-xs text-muted-dark">Toca no + para abrir</p>
      </div>
      <AnimatedSocialIcons icons={icons} onToggle={() => void tap()} />
    </div>
  )
}

/** Services as full-screen photo cards: swipe (the next one peeks in) or use the buttons. */
export function ServiceCarousel({ services }: { services: Service[] | null }) {
  const navigate = useNavigate()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const preview = services?.find((s) => s.id === previewId) ?? null
  const total = services?.length ?? 0

  useSwipeNudge(track, total)

  return (
    <section id="servicos" className={fullScreenSection}>
      <div className="mx-auto w-full max-w-2xl px-5">
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Penteados</p>
        <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">Os nossos serviços</h2>
      </div>

      <div ref={track} className={strip} onScroll={(e) => setIndex(stripIndex(e.currentTarget, total))}>
        {services === null && <div className={`${slide} animate-pulse rounded-[2rem] bg-onyx/5`} />}
        {services?.map((service, i) => {
          const photos = serviceImageUrls(service)
          return (
            // The photo fills the card; the name, description, duration, price and "Marcar" sit over its lower part
            // on a dark fade. Tapping the photo opens the gallery with more pictures.
            <div key={service.id} className={`${slide} relative overflow-hidden rounded-[2rem] bg-onyx/5`}>
              <button
                type="button"
                aria-label={`Ver fotos de ${service.name}`}
                onClick={() => {
                  void tap()
                  setPreviewId(service.id)
                }}
                className="absolute inset-0 block"
              >
                <img
                  src={photos[0] ?? PHOTOS[i % PHOTOS.length].src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </button>
              {photos.length > 1 && (
                <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
                  <i className="bx bx-images text-sm" aria-hidden="true" />
                  {photos.length} fotos
                </span>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-5 pb-5 pt-28">
                <p className="font-subtitle text-2xl font-semibold leading-tight tracking-tight text-[#ffffff]">
                  {service.name}
                </p>
                {service.description && (
                  <p className="mt-1.5 line-clamp-2 font-subtitle text-sm font-light leading-relaxed text-[#ffffff]/75">
                    {service.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="min-w-0 font-subtitle text-sm leading-snug text-[#ffffff]">
                    <span className="block tabular-nums">{servicePriceLabel(service)}</span>
                    <span className="flex items-center gap-1 text-[#ffffff]/70">
                      <i className="bx bx-time-five text-sm" aria-hidden="true" />
                      {service.durationLabel}
                    </span>
                  </p>
                  {/* Straight to booking this model. */}
                  <Link
                    to={`/marcar?service=${service.id}`}
                    aria-label={`Marcar ${service.name}`}
                    onClick={() => void tap('medium')}
                    className="pointer-events-auto inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#ffffff] pe-3.5 ps-5 font-subtitle text-sm font-semibold text-[#1a1008]"
                  >
                    Marcar
                    <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <CarouselControls
        index={index}
        count={total}
        what="Modelo"
        onGo={(to) => scrollStrip(track.current, to, total)}
      />

      <ServicePreview
        service={preview}
        chosen={false}
        onClose={() => setPreviewId(null)}
        onChoose={() => {
          const id = previewId
          setPreviewId(null)
          if (id) navigate(`/marcar?service=${id}`)
        }}
      />
    </section>
  )
}

const STEPS = [
  { icon: 'bx bx-list-check', title: 'Escolhe', text: 'o penteado que mais gostas' },
  { icon: 'bx bx-calendar-plus', title: 'Marca', text: 'um dia e hora livres' },
  { icon: 'bx bx-bell', title: 'Recebe', text: 'o aviso de confirmação' },
]

/**
 * "Como funciona" for people who haven't booked yet: three steps on a connected line plus a reassurance note.
 * Anyone with a booking already knows the flow, so it disappears for them.
 */
export function StepsRow() {
  const { customer, loading } = useCustomerAuth()
  const [hasBookings, setHasBookings] = useState<boolean | null>(null)

  useEffect(() => {
    if (!customer) {
      setHasBookings(false)
      return
    }
    api
      .get<Booking[]>('/account/bookings')
      .then((list) => setHasBookings(list.length > 0))
      .catch(() => setHasBookings(false))
  }, [customer])

  if (loading || hasBookings === null || hasBookings) return null

  return (
    <section className="pt-12">
      <SectionTitle title="Como funciona" hint="Três passos e ficas despachada." />
      <div className="mx-auto mt-6 max-w-2xl px-5">
        <ol className="relative">
          <span aria-hidden="true" className="absolute bottom-6 left-[21px] top-6 w-px bg-onyx/20" />
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ delay: index * 0.08 }}
              className="relative flex items-center gap-4 py-3"
            >
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-onyx/10 shadow-sm shadow-black/5 bg-white text-xl text-onyx">
                <i className={step.icon} aria-hidden="true" />
              </span>
              <span>
                <span className="block font-subtitle text-base font-semibold text-onyx">
                  {index + 1}. {step.title}
                </span>
                <span className="block font-subtitle text-sm font-light text-muted-dark">{step.text}</span>
              </span>
            </motion.li>
          ))}
        </ol>
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-onyx/10 shadow-sm shadow-black/5 px-4 py-3 font-subtitle text-sm text-muted-dark">
          <i className="bx bx-info-circle mt-0.5 text-lg text-onyx" aria-hidden="true" />
          Não pagas nada na app. Avisamos-te assim que o pedido for aceite.
        </p>
      </div>
    </section>
  )
}

/** Photo mosaic of the studio's work. */
interface WorkItem {
  key: string
  kind: 'IMAGE' | 'VIDEO'
  src: string
  alt: string
}

const SAMPLE_WORK: WorkItem[] = PHOTOS.map((p) => ({ key: p.src, kind: 'IMAGE', src: p.src, alt: p.alt }))

/** Plays a muted looping video only while it is on screen. */
function AutoVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      className={`background-video ${className ?? ''}`}
    />
  )
}

export function WorkGrid() {
  const [items, setItems] = useState<WorkItem[]>(SAMPLE_WORK)
  const [index, setIndex] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  const viewerStrip = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [viewerIndex, setViewerIndex] = useState(0)

  // The studio's own photos and videos (managed in the admin app); the sample photos show until it adds some.
  useEffect(() => {
    api
      .get<Array<{ id: string; kind: 'IMAGE' | 'VIDEO' }>>('/portfolio')
      .then((list) => {
        if (list.length > 0) {
          setItems(
            list.map((item) => ({
              key: item.id,
              kind: item.kind,
              src: assetUrl(`/portfolio/${item.id}/file`),
              alt: item.kind === 'VIDEO' ? 'Vídeo do nosso trabalho' : 'Foto do nosso trabalho',
            })),
          )
        }
      })
      .catch(() => {})
  }, [])

  // Open the full-screen viewer already scrolled to the tapped item.
  useEffect(() => {
    if (viewer === null) return
    setViewerIndex(viewer)
    requestAnimationFrame(() => {
      const el = viewerStrip.current
      if (el) el.scrollTo({ left: viewer * el.clientWidth })
    })
  }, [viewer])

  const total = items.length
  useSwipeNudge(track, total)

  return (
    <section className={fullScreenSection}>
      <div className="mx-auto flex w-full max-w-2xl items-end justify-between gap-4 px-5">
        <div>
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Portfólio</p>
          <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">O nosso trabalho</h2>
        </div>
        {/* More (videos) on Instagram, beside the title rather than as a slide. */}
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="glass-chip mb-0.5 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-subtitle text-sm text-onyx"
        >
          <i className="bx bxl-instagram text-lg" aria-hidden="true" />
          Mais
        </a>
      </div>

      <div ref={track} className={strip} onScroll={(e) => setIndex(stripIndex(e.currentTarget, total))}>
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            aria-label={`Ver ${item.kind === 'VIDEO' ? 'vídeo' : 'foto'} ${i + 1} em ecrã inteiro`}
            onClick={() => {
              void tap()
              setViewer(i)
            }}
            className={`${slide} relative block overflow-hidden rounded-[2rem] bg-black/5`}
          >
            {item.kind === 'VIDEO' ? (
              <AutoVideo src={item.src} className="h-full w-full object-cover" />
            ) : (
              <img src={item.src} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-[#ffffff] backdrop-blur-md">
              <i className={item.kind === 'VIDEO' ? 'bx bx-play' : 'bx bx-expand-alt'} aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      <CarouselControls
        index={index}
        count={total}
        what="Trabalho"
        onGo={(to) => scrollStrip(track.current, to, total)}
      />

      <AnimatePresence>
        {viewer !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Em ecrã inteiro"
            className="fixed inset-0 z-[80] bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              ref={viewerStrip}
              onScroll={(e) => setViewerIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
              className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item, i) => (
                <div key={item.key} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
                  {item.kind === 'VIDEO' ? (
                    // Only the video on screen is mounted with its source, so one plays at a time.
                    Math.abs(i - viewerIndex) <= 1 ? (
                      <video
                        src={item.src}
                        controls
                        playsInline
                        autoPlay={i === viewerIndex}
                        loop
                        className="max-h-full max-w-full"
                      />
                    ) : null
                  ) : (
                    <img src={item.src} alt={item.alt} className="max-h-full max-w-full object-contain" />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setViewer(null)}
              className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff]/20 text-2xl text-[#ffffff] backdrop-blur-md"
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
            <p className="pointer-events-none absolute inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] text-center font-subtitle text-sm text-[#ffffff]/80">
              {viewerIndex + 1} / {total}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

type Review = { id: string; quote: string; name: string; date?: string; photo?: number }

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function ReviewCard({ review }: { review: Review }) {
  const [open, setOpen] = useState(false)
  const long = review.quote.length > 150
  const when = review.date ? new Date(review.date) : null
  return (
    <div className="flex w-full shrink-0 snap-center snap-always px-3">
      <figure className="mx-auto flex w-full max-w-md flex-col rounded-[2rem] border border-onyx/10 shadow-sm shadow-black/5 bg-white p-7">
        <i className="bx bxs-quote-alt-left text-6xl text-onyx/15" aria-hidden="true" />
        <blockquote
          className={`mt-3 flex-1 font-subtitle text-[19px] font-normal leading-relaxed text-onyx ${open ? '' : 'line-clamp-6'}`}
        >
          {review.quote}
        </blockquote>
        {long && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-2 self-start font-subtitle text-sm font-medium text-onyx underline underline-offset-4"
          >
            {open ? 'Ler menos' : 'Ler mais'}
          </button>
        )}
        <figcaption className="mt-5 flex items-center gap-3 border-t border-onyx/10 pt-4">
          {review.photo ? (
            <img
              src={assetUrl(`/testimonials/${review.id}/photo?v=${review.photo}`)}
              alt=""
              loading="lazy"
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-base font-semibold text-[#ffffff]">
              {review.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-subtitle text-sm font-semibold text-onyx">{review.name}</span>
            <span className="block font-subtitle text-xs text-muted-dark">
              Cliente AFROGLOW{when ? ` · ${MONTHS_PT[when.getMonth()]} ${when.getFullYear()}` : ''}
            </span>
          </span>
        </figcaption>
      </figure>
    </div>
  )
}

/** Testimonials as large swipeable quotes, with a counter and position dots. */
export function ReviewsRow({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0)
  const [swiped, setSwiped] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  useSwipeNudge(track, reviews.length)
  if (reviews.length === 0) return null
  return (
    <section className="pt-12">
      <div className="mx-auto flex max-w-2xl items-end justify-between px-5">
        <div>
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Testemunhos</p>
          <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">
            O que dizem as clientes
          </h2>
        </div>
        {reviews.length > 1 && (
          <p className="pb-1 font-subtitle text-sm tabular-nums text-muted-dark">
            <span className="font-semibold text-onyx">{String(index + 1).padStart(2, '0')}</span> /{' '}
            {String(reviews.length).padStart(2, '0')}
          </p>
        )}
      </div>
      <div
        ref={track}
        className="mt-5 flex snap-x snap-mandatory items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.min(reviews.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
          setIndex(i)
          if (i > 0) setSwiped(true)
        }}
      >
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      <SwipeHint index={index} slides={reviews.length} swiped={swiped} what="testemunhos" />
      {reviews.length > 1 && reviews.length <= 12 && (
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
          {reviews.map((review, i) => (
            <span
              key={review.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-onyx' : 'w-1.5 bg-onyx/25'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/** Address, map, phone and opening hours with today highlighted and an open / closed status. Hidden until filled. */
/** "Avenida X, n.º 47" on top and "2.º Direito Frente · 5300-124 Bragança" under it. */
function splitAddress(address: string) {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  const take = parts.length > 1 && /^n\.?\s*[ºo°]?\s*\d/i.test(parts[1]) ? 2 : 1
  return { street: parts.slice(0, take).join(', '), rest: parts.slice(take).join(' · ') }
}

export function Visit() {
  const business = useBusinessInfo()
  const { todayRows, closedDays, todayClosed, status } = useOpeningStatus(business.openingHours)
  const [weekOpen, setWeekOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasHours = business.openingHours.length > 0
  if (!business.address && !hasHours && !business.phone) return null
  const open = Boolean(status?.open)
  const { street, rest } = splitAddress(business.address || '')
  const query = encodeURIComponent(mapSearchText(business.address || ''))
  const mapsHref = business.mapUrl || `https://maps.apple.com/?q=${query}`
  const todayIndex = [...todayRows][0]
  const today = todayIndex !== undefined ? business.openingHours[todayIndex] : null
  const action =
    'flex h-11 items-center justify-center gap-1.5 rounded-full font-subtitle text-sm font-medium transition-opacity active:opacity-80'

  return (
    <section className="mx-auto max-w-2xl px-5 pt-14">
      <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Visita-nos</p>
      <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">Onde estamos</h2>
      {status && (
        <p className="mt-2 flex items-center gap-2 font-subtitle text-sm">
          <span className={`h-2 w-2 rounded-full ${open ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden="true" />
          <span className={open ? 'text-emerald-700 dark:text-emerald-400' : 'text-onyx'}>{status.text}</span>
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
        {business.address && (
          <>
            {/* The map, in black and white; tapping it opens the phone's map app (it never traps the page's scroll). */}
            <a href={mapsHref} target="_blank" rel="noreferrer" className="relative block h-48 bg-onyx/5">
              <iframe
                title={`Mapa: ${business.address}`}
                src={`https://www.google.com/maps?q=${query}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer"
                tabIndex={-1}
                className="pointer-events-none block h-full w-full grayscale"
              />
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 font-subtitle text-xs text-[#ffffff] backdrop-blur-md">
                <i className="bx bx-map-alt text-sm" aria-hidden="true" />
                Abrir no mapa
              </span>
            </a>

            <div className="px-5 pt-4">
              <p className="font-subtitle text-lg font-semibold leading-snug text-onyx">{street}</p>
              {rest && <p className="mt-0.5 font-subtitle text-sm text-muted-dark">{rest}</p>}
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2 p-4">
          {business.address && (
            <a href={mapsHref} target="_blank" rel="noreferrer" className={`${action} col-span-2 bg-onyx text-white`}>
              <i className="bx bx-navigation text-lg" aria-hidden="true" />
              Como chegar
            </a>
          )}
          {business.phone && (
            <a href={`tel:${business.phone.replace(/[^+\d]/g, '')}`} className={`${action} glass-chip text-onyx`}>
              <i className="bx bx-phone text-lg" aria-hidden="true" />
              Ligar
            </a>
          )}
          {business.address && (
            <button
              type="button"
              onClick={() => {
                void tap()
                void navigator.clipboard
                  ?.writeText(business.address)
                  .then(() => {
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1800)
                  })
                  .catch(() => {})
              }}
              className={`${action} glass-chip text-onyx`}
            >
              <i className={`bx ${copied ? 'bx-check' : 'bx-copy'} text-lg`} aria-hidden="true" />
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          )}
        </div>
      </div>

      {hasHours && (
        <div className="mt-4 overflow-hidden rounded-3xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]">
          {/* Today first; the whole week behind a tap. */}
          <div className="flex items-center justify-between gap-4 px-5 py-4 font-subtitle">
            <span>
              <span className="block text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">Hoje</span>
              <span className="text-[15px] font-semibold text-onyx">{today?.days ?? 'Hoje'}</span>
            </span>
            <span className="text-right text-[15px] font-semibold text-onyx">
              {today ? today.hours : todayClosed ? 'Fechado' : '—'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              void tap()
              setWeekOpen((v) => !v)
            }}
            aria-expanded={weekOpen}
            className="flex w-full items-center justify-between border-t border-onyx/[0.08] px-5 py-3.5 font-subtitle text-sm text-onyx"
          >
            {weekOpen ? 'Esconder' : 'Ver a semana toda'}
            <i
              className={`bx bx-chevron-down text-xl transition-transform ${weekOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          <AnimatePresence initial={false}>
            {weekOpen && (
              <motion.dl
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-onyx/[0.06] border-t border-onyx/[0.08] px-5 pb-2">
                  {business.openingHours.map((row, i) => {
                    const isToday = todayRows.has(i)
                    return (
                      <div
                        key={row.days}
                        className={`flex items-center justify-between gap-4 py-3 font-subtitle text-sm ${
                          isToday ? 'font-semibold text-onyx' : 'text-onyx/70'
                        }`}
                      >
                        <dt className="flex items-center gap-2">
                          {row.days}
                          {isToday && (
                            <span className="rounded-full bg-onyx px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                              Hoje
                            </span>
                          )}
                        </dt>
                        <dd>{row.hours}</dd>
                      </div>
                    )
                  })}
                  {closedDays.length > 0 && !business.openingHours.some((r) => /fechad/i.test(r.hours)) && (
                    <div className="flex items-center justify-between gap-4 py-3 font-subtitle text-sm text-onyx/50">
                      <dt>Outros dias</dt>
                      <dd>Fechado</dd>
                    </div>
                  )}
                </div>
              </motion.dl>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}

/**
 * Ways to reach the studio: the founder inviting a WhatsApp message (her photo, name and role, one line and the
 * button); then calling, Instagram and email as round buttons.
 */
export function ContactTiles({ whatsappUrl }: { whatsappUrl?: string }) {
  const business = useBusinessInfo()
  const { status } = useOpeningStatus(business.openingHours)
  const others: Array<{ icon: string; title: string; href: string }> = [
    ...(business.phone
      ? [{ icon: 'bx bx-phone', title: 'Ligar', href: `tel:${business.phone.replace(/[^+\d]/g, '')}` }]
      : []),
    { icon: 'bx bxl-instagram', title: 'Instagram', href: instagramDmUrl() },
    { icon: 'bx bx-envelope', title: 'Email', href: `mailto:${siteConfig.email}` },
  ]
  const external = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})

  return (
    <section className="mx-auto max-w-2xl px-5 pb-6 pt-14">
      <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Contactos</p>
      <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">Fala connosco</h2>

      {whatsappUrl && (
        // The founder herself, as a contact card: her photo, name and role centred, one line in her voice and the
        // WhatsApp button.
        <div className="mt-5 rounded-[28px] bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] px-5 pb-5 pt-7 text-center">
          <img
            src="/images/ceo/rute-de-pina-1.jpg"
            alt="Rute De Pina"
            loading="lazy"
            className="mx-auto size-24 rounded-full object-cover object-top shadow-lg shadow-black/10 ring-4 ring-white"
          />
          <p className="mt-4 font-subtitle text-[22px] font-semibold leading-tight tracking-tight text-onyx">
            Rute De Pina
          </p>
          <p className="mt-0.5 font-subtitle text-[13px] text-muted-dark">CEO & Fundadora da AFROGLOW</p>
          {status && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-subtitle text-xs text-onyx shadow-sm shadow-black/5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-red-500'}`}
                aria-hidden="true"
              />
              {status.text}
            </p>
          )}
          <p className="mx-auto mt-4 max-w-[19rem] font-subtitle text-[15px] leading-relaxed text-onyx/70">
            Tens alguma dúvida sobre os modelos, os preços ou a tua marcação? Fala diretamente comigo.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => void tap('medium')}
            className="mt-6 flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-onyx font-subtitle text-[15px] font-semibold text-white active:opacity-85"
          >
            <i className="bx bxl-whatsapp text-[22px]" aria-hidden="true" />
            Falar no WhatsApp
          </a>
          {business.phone && (
            <p className="mt-3 font-subtitle text-xs tabular-nums text-muted-dark">{business.phone}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-onyx/10" />
        <span className="font-subtitle text-xs uppercase tracking-[0.14em] text-muted-dark">ou</span>
        <span className="h-px flex-1 bg-onyx/10" />
      </div>
      {/* The other ways, as the action buttons of an iPhone contact card. */}
      <div className={`mt-4 grid gap-2.5 ${others.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {others.map((option) => (
          <a
            key={option.title}
            href={option.href}
            {...external(option.href)}
            onClick={() => void tap()}
            className="flex h-[68px] flex-col items-center justify-center gap-1 rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] text-onyx active:bg-onyx/[0.08]"
          >
            <i className={`${option.icon} text-[22px]`} aria-hidden="true" />
            <span className="font-subtitle text-xs font-medium">{option.title}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
