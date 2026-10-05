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
import { instagramDmUrl, siteConfig, useBusinessInfo } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Service } from '@/lib/types'
import { useBookingAlerts } from './booking-alerts'
import { ServicePreview } from './ServicePreview'
import { dayParts, longDay, timeLabel } from './dates'

/** Time-of-day greeting plus one line of what matters right now (a decision to look at, or free slots). */
export function Greeting() {
  const { customer } = useCustomerAuth()
  const { unseen } = useBookingAlerts()
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null)

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

  const upcoming = (slots ?? [])
    .filter((s) => new Date(s.startsAt).getTime() > Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6)

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
          <Link to="/marcar" className="font-subtitle text-xs font-medium text-onyx underline underline-offset-4">
            Ver todos
          </Link>
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

  const panel = 'rounded-2xl border-[1.5px] border-onyx/25 bg-white p-5'
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

const strip =
  'flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

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

/** Services as swipeable photo cards. */
export function ServiceCarousel({ services }: { services: Service[] | null }) {
  const navigate = useNavigate()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const preview = services?.find((s) => s.id === previewId) ?? null
  const total = services?.length ?? 0

  return (
    <section id="servicos" className="scroll-mt-6 pt-12">
      <div className="mx-auto flex max-w-2xl items-end justify-between px-5">
        <div>
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Penteados</p>
          <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">Os nossos serviços</h2>
        </div>
        {total > 1 && (
          <p className="pb-1 font-subtitle text-sm tabular-nums text-muted-dark">
            <span className="font-semibold text-onyx">{String(index + 1).padStart(2, '0')}</span> /{' '}
            {String(total).padStart(2, '0')}
          </p>
        )}
      </div>
      <p className="mx-auto mt-2 max-w-2xl px-5 font-subtitle text-sm font-light text-muted-dark">
        Toca na foto para ver mais. Toca em Marcar para escolher o dia.
      </p>

      <div
        className={`${strip} mt-5`}
        onScroll={(e) => {
          const el = e.currentTarget
          const card = el.firstElementChild as HTMLElement | null
          if (card) setIndex(Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / (card.offsetWidth + 12)))))
        }}
      >
        {services === null &&
          [0, 1].map((i) => (
            <div key={i} className="h-[26rem] w-[80%] shrink-0 animate-pulse rounded-[2rem] bg-gold/10" />
          ))}
        {services?.map((service, i) => {
          const photos = serviceImageUrls(service)
          return (
            <div
              key={service.id}
              className="relative h-[26rem] w-[80%] max-w-xs shrink-0 snap-center overflow-hidden rounded-[2rem] bg-[#1c1c1e]"
            >
              {/* The photo opens the gallery with more pictures. */}
              <button
                type="button"
                aria-label={`Ver fotos de ${service.name}`}
                onClick={() => {
                  void tap()
                  setPreviewId(service.id)
                }}
                className="absolute inset-0 block h-full w-full"
              >
                <img
                  src={photos[0] ?? PHOTOS[i % PHOTOS.length].src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
              </button>

              <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
                <i className="bx bx-time-five text-sm" aria-hidden="true" />
                {service.durationLabel}
              </span>
              {photos.length > 1 && (
                <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1.5 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
                  <i className="bx bx-images text-sm" aria-hidden="true" />
                  {photos.length} fotos
                </span>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-[#ffffff]">
                <p className="truncate font-subtitle text-2xl font-semibold tracking-tight">{service.name}</p>
                {service.description && (
                  <p className="mt-1 line-clamp-2 font-subtitle text-sm font-light text-[#ffffff]/80">
                    {service.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="font-subtitle text-xl font-semibold text-[#e0c36e]">
                    {formatPrice(service.priceCents)}
                  </p>
                  {/* The arrow goes straight to booking this model. */}
                  <Link
                    to={`/marcar?service=${service.id}`}
                    aria-label={`Marcar ${service.name}`}
                    onClick={() => void tap('medium')}
                    className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-[#ffffff]/25 pe-1.5 ps-4 font-subtitle text-sm font-medium text-[#ffffff] backdrop-blur-md"
                  >
                    Marcar
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffffff]/30 text-xl">
                      <i className="bx bx-right-arrow-alt" aria-hidden="true" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          {services?.map((service, i) => (
            <span
              key={service.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-onyx' : 'w-1.5 bg-onyx/25'}`}
            />
          ))}
        </div>
      )}

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
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-onyx/25 bg-white text-xl text-onyx">
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
        <p className="mt-3 flex items-start gap-2 rounded-2xl border-[1.5px] border-onyx/25 px-4 py-3 font-subtitle text-sm text-muted-dark">
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
  return <video ref={ref} src={src} muted loop playsInline preload="metadata" className={className} />
}

export function WorkGrid() {
  const [items, setItems] = useState<WorkItem[]>(SAMPLE_WORK)
  const [index, setIndex] = useState(0)
  const [viewer, setViewer] = useState<number | null>(null)
  const viewerStrip = useRef<HTMLDivElement>(null)
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

  return (
    <section className="pt-12">
      <div className="mx-auto flex max-w-2xl items-end justify-between px-5">
        <div>
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Portfólio</p>
          <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">O nosso trabalho</h2>
        </div>
        <p className="pb-1 font-subtitle text-sm tabular-nums text-muted-dark">
          <span className="font-semibold text-onyx">{String(index + 1).padStart(2, '0')}</span> /{' '}
          {String(total).padStart(2, '0')}
        </p>
      </div>
      <p className="mx-auto mt-2 max-w-2xl px-5 font-subtitle text-sm font-light text-muted-dark">
        Desliza e toca para ver em ecrã inteiro.
      </p>

      <div
        className={`${strip} mt-5`}
        onScroll={(e) => {
          const el = e.currentTarget
          const card = el.firstElementChild as HTMLElement | null
          if (card) setIndex(Math.min(total - 1, Math.max(0, Math.round(el.scrollLeft / (card.offsetWidth + 12)))))
        }}
      >
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            aria-label={`Ver ${item.kind === 'VIDEO' ? 'vídeo' : 'foto'} ${i + 1} em ecrã inteiro`}
            onClick={() => {
              void tap()
              setViewer(i)
            }}
            className="relative h-[23rem] w-[72%] max-w-[17rem] shrink-0 snap-center overflow-hidden rounded-[2rem] bg-black/5"
          >
            {item.kind === 'VIDEO' ? (
              <AutoVideo src={item.src} className="h-full w-full object-cover" />
            ) : (
              <img src={item.src} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-[#ffffff] backdrop-blur-md">
              <i className={item.kind === 'VIDEO' ? 'bx bx-play' : 'bx bx-expand-alt'} aria-hidden="true" />
            </span>
          </button>
        ))}
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex h-[23rem] w-[60%] max-w-[14rem] shrink-0 snap-center flex-col items-center justify-center gap-3 rounded-[2rem] border-[1.5px] border-onyx/25 bg-white text-center"
        >
          <i className="bx bxl-instagram text-5xl text-onyx" aria-hidden="true" />
          <span className="font-subtitle text-base font-semibold text-onyx">Mais no Instagram</span>
          <span className="font-subtitle text-sm text-muted-dark">@{siteConfig.instagramHandle}</span>
        </a>
      </div>

      {total <= 12 ? (
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          {items.map((item, i) => (
            <span
              key={item.key}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-onyx' : 'w-1.5 bg-onyx/25'}`}
            />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-4 h-1 w-24 overflow-hidden rounded-full bg-onyx/15" aria-hidden="true">
          <div
            className="h-full rounded-full bg-onyx transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      )}

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

type Review = { id: string; quote: string; name: string; date?: string }

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function ReviewCard({ review }: { review: Review }) {
  const [open, setOpen] = useState(false)
  const long = review.quote.length > 150
  const when = review.date ? new Date(review.date) : null
  return (
    <figure className="flex w-[86%] max-w-sm shrink-0 snap-center flex-col rounded-[2rem] border-[1.5px] border-onyx/25 bg-white p-6">
      <i className="bx bxs-quote-alt-left text-5xl text-onyx/15" aria-hidden="true" />
      <blockquote
        className={`mt-2 flex-1 font-subtitle text-[17px] font-normal leading-relaxed text-onyx ${open ? '' : 'line-clamp-5'}`}
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-onyx font-subtitle text-base font-semibold text-[#ffffff] dark:bg-gold-deep">
          {review.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-subtitle text-sm font-semibold text-onyx">{review.name}</span>
          <span className="block font-subtitle text-xs text-muted-dark">
            Cliente AFROGLOW{when ? ` · ${MONTHS_PT[when.getMonth()]} ${when.getFullYear()}` : ''}
          </span>
        </span>
      </figcaption>
    </figure>
  )
}

/** Testimonials as large swipeable quotes, with a counter and position dots. */
export function ReviewsRow({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0)
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
        className={`${strip} mt-5 items-stretch`}
        onScroll={(e) => {
          const el = e.currentTarget
          const card = el.firstElementChild as HTMLElement | null
          if (card)
            setIndex(Math.min(reviews.length - 1, Math.max(0, Math.round(el.scrollLeft / (card.offsetWidth + 12)))))
        }}
      >
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {reviews.length > 1 && reviews.length <= 12 && (
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
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

const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const strip_ = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Which weekdays (0 = Sunday) a free-text label like "Terça a sábado" or "Segunda, quarta e sexta" covers. */
function parseDays(label: string): number[] {
  const text = strip_(label)
  const index = (word: string) => DAY_NAMES.findIndex((d) => strip_(d) === word.slice(0, strip_(d).length))
  const found: Array<{ day: number; at: number }> = []
  DAY_NAMES.forEach((name, day) => {
    const at = text.indexOf(strip_(name))
    if (at >= 0) found.push({ day, at })
  })
  found.sort((x, y) => x.at - y.at)
  if (found.length === 0) return []
  if (/\ba\b|\bate\b|-/.test(text) && found.length === 2) {
    const days: number[] = []
    for (let d = found[0].day; ; d = (d + 1) % 7) {
      days.push(d)
      if (d === found[1].day) break
    }
    return days
  }
  void index
  return found.map((f) => f.day)
}

/** "09:00 – 18:00" → minutes since midnight, or null. */
function parseHours(label: string): [number, number] | null {
  const m = label.match(/(\d{1,2})[:h](\d{2})?\D+(\d{1,2})[:h](\d{2})?/)
  if (!m) return null
  return [Number(m[1]) * 60 + Number(m[2] ?? 0), Number(m[3]) * 60 + Number(m[4] ?? 0)]
}

/** Address, map, phone and opening hours with today highlighted and an open / closed status. Hidden until filled. */
export function Visit() {
  const business = useBusinessInfo()
  const hasHours = business.openingHours.length > 0
  if (!business.address && !hasHours && !business.phone) return null

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Lisbon' }))
  const today = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const rows = business.openingHours.map((row) => ({ ...row, days: parseDays(row.days), hours: parseHours(row.hours) }))
  const todayRow = rows.find((r) => r.days.includes(today))
  const understood = rows.some((r) => r.days.length > 0 && r.hours)
  const open = Boolean(todayRow?.hours && minutes >= todayRow.hours[0] && minutes < todayRow.hours[1])

  return (
    <section className="mx-auto max-w-2xl px-5 pt-14">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Visita-nos</p>
          <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">Onde estamos</h2>
        </div>
        {understood && (
          <span
            className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-subtitle text-xs font-medium ${
              open ? 'bg-emerald-600/15 text-emerald-700' : 'bg-red-600/10 text-red-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-600' : 'bg-red-600'}`} aria-hidden="true" />
            {open ? 'Aberto agora' : 'Fechado'}
          </span>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border-[1.5px] border-onyx/25 bg-white">
        {business.address && (
          <div className="flex items-start gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-onyx/5 text-xl text-onyx">
              <i className="bx bx-map" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">Morada</p>
              <p className="mt-1 font-subtitle text-base font-semibold leading-snug text-onyx">{business.address}</p>
            </div>
          </div>
        )}

        {(business.mapUrl || business.phone || business.address) && (
          <div className="grid grid-cols-2 gap-2 border-t border-onyx/10 p-3">
            <a
              href={business.mapUrl || `https://maps.apple.com/?q=${encodeURIComponent(business.address || '')}`}
              target="_blank"
              rel="noreferrer"
              className="glass-chip flex h-11 items-center justify-center gap-2 rounded-full font-subtitle text-sm font-medium text-onyx"
            >
              <i className="bx bx-navigation text-lg" aria-hidden="true" /> Como chegar
            </a>
            {business.phone ? (
              <a
                href={`tel:${business.phone.replace(/[^+\d]/g, '')}`}
                className="glass-chip flex h-11 items-center justify-center gap-2 rounded-full font-subtitle text-sm font-medium text-onyx"
              >
                <i className="bx bx-phone text-lg" aria-hidden="true" /> Ligar
              </a>
            ) : (
              <span />
            )}
          </div>
        )}

        {hasHours && (
          <div className="border-t border-onyx/10 p-5">
            <p className="font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">Horário</p>
            <dl className="mt-3 flex flex-col gap-1">
              {business.openingHours.map((row, i) => {
                const isToday = rows[i].days.includes(today)
                return (
                  <div
                    key={row.days}
                    className={`flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 font-subtitle text-sm ${
                      isToday ? 'bg-onyx/5 font-semibold text-onyx' : 'text-muted-dark'
                    }`}
                  >
                    <dt className="flex items-center gap-2">
                      {isToday && <span className="h-1.5 w-1.5 rounded-full bg-onyx" aria-hidden="true" />}
                      {row.days}
                    </dt>
                    <dd className={isToday ? 'text-onyx' : ''}>{row.hours}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}

/** Ways to reach the studio, each with a line on what it is good for. */
export function ContactTiles({ whatsappUrl }: { whatsappUrl?: string }) {
  const business = useBusinessInfo()
  const options: Array<{ icon: string; title: string; text: string; href: string }> = [
    ...(whatsappUrl
      ? [
          {
            icon: 'bx bxl-whatsapp',
            title: 'WhatsApp',
            text: 'Dúvidas e marcações, com resposta rápida',
            href: whatsappUrl,
          },
        ]
      : []),
    ...(business.phone
      ? [
          {
            icon: 'bx bx-phone',
            title: 'Telefone',
            text: business.phone,
            href: `tel:${business.phone.replace(/[^+\d]/g, '')}`,
          },
        ]
      : []),
    {
      icon: 'bx bxl-instagram',
      title: 'Instagram',
      text: `@${siteConfig.instagramHandle} · novidades e trabalhos`,
      href: instagramDmUrl(),
    },
    { icon: 'bx bx-envelope', title: 'Email', text: siteConfig.email, href: `mailto:${siteConfig.email}` },
  ]
  return (
    <section className="mx-auto max-w-2xl px-5 pb-6 pt-14">
      <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Contactos</p>
      <h2 className="mt-1 font-subtitle text-2xl font-semibold tracking-tight text-onyx">Fala connosco</h2>
      <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">
        Escolhe a forma que for mais fácil para ti.
      </p>
      <div className="mt-5 divide-y divide-onyx/10 overflow-hidden rounded-2xl border-[1.5px] border-onyx/25 bg-white">
        {options.map((option) => (
          <a
            key={option.title}
            href={option.href}
            target={option.href.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            className="flex items-center gap-4 p-4 active:bg-onyx/5"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-onyx/5 text-2xl text-onyx">
              <i className={option.icon} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-subtitle text-base font-semibold text-onyx">{option.title}</span>
              <span className="block font-subtitle text-xs text-muted-dark">{option.text}</span>
            </span>
            <i className="bx bx-right-arrow-alt text-xl text-muted-dark" aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  )
}
