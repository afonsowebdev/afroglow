import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { instagramDmUrl } from '@/lib/site-config'
import { formatPrice, type Booking, type Service } from '@/lib/types'
import { dayParts, longDay, timeLabel } from './dates'

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

  if (loading) return <div className="h-28 animate-pulse rounded-3xl bg-gold/10" />

  if (!customer) {
    return (
      <div className="rounded-3xl border border-gold/25 bg-cream p-6">
        <p className="font-subtitle text-lg font-semibold tracking-tight text-onyx">Bem-vinda à AFROGLOW</p>
        <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
          Cria a tua conta para marcar sessões e receber avisos quando forem confirmadas.
        </p>
        <Link
          to="/entrar"
          className="mt-4 inline-block rounded-full bg-gold-deep px-6 py-2.5 font-subtitle text-sm text-[#ffffff]"
        >
          Entrar ou criar conta
        </Link>
      </div>
    )
  }

  const next = (bookings ?? [])
    .filter((b) => (b.status === 'PENDING' || b.status === 'ACCEPTED') && new Date(b.slot.startsAt) > new Date())
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))[0]
  const first = customer.name.split(' ')[0]

  if (!next) {
    return (
      <div className="rounded-3xl border border-gold/25 bg-cream p-6">
        <p className="font-subtitle text-lg font-semibold tracking-tight text-onyx">Olá, {first}</p>
        <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
          Ainda não tens nenhuma sessão marcada. Que tal a próxima?
        </p>
        <Link
          to="/marcar"
          className="mt-4 inline-block rounded-full bg-gold-deep px-6 py-2.5 font-subtitle text-sm text-[#ffffff]"
        >
          Marcar sessão
        </Link>
      </div>
    )
  }

  const parts = dayParts(next.slot.startsAt)
  return (
    <Link to="/marcacoes" className="flex items-center gap-4 rounded-3xl border border-gold/25 bg-cream p-5">
      <div className="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-gold-deep text-[#ffffff]">
        <span className="font-subtitle text-[10px] uppercase tracking-wide opacity-80">{parts.weekday}</span>
        <span className="font-subtitle text-3xl font-semibold leading-none">{parts.day}</span>
        <span className="font-subtitle text-[10px] uppercase opacity-80">{parts.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-subtitle text-[11px] uppercase tracking-[0.18em] text-gold-ink">A tua próxima sessão</p>
        <p className="mt-1 truncate font-subtitle text-lg font-semibold tracking-tight text-onyx">
          {next.service.name}
        </p>
        <p className="font-subtitle text-sm font-light text-muted-dark">
          {longDay(next.slot.startsAt)} · {timeLabel(next.slot.startsAt)}
        </p>
        <p className="mt-1 font-subtitle text-xs text-gold-ink">
          {next.status === 'PENDING' ? 'À espera de confirmação' : 'Confirmada'}
        </p>
      </div>
      <i className="bx bx-chevron-right text-2xl text-muted-dark" aria-hidden="true" />
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

/** Four big shortcuts right under the greeting. */
export function QuickActions({ whatsappUrl }: { whatsappUrl?: string }) {
  const items: Array<{ icon: string; label: string; to?: string; href?: string; tint: string }> = [
    {
      icon: 'bx bx-calendar-plus',
      label: 'Marcar',
      to: '/marcar',
      tint: 'bg-[#c9a84c]/20 text-[#8c6a24] dark:text-[#e0c36e]',
    },
    {
      icon: 'bx bx-calendar-check',
      label: 'Marcações',
      to: '/marcacoes',
      tint: 'bg-[#5f9a76]/15 text-[#3f7a58] dark:text-[#86c4a0]',
    },
    whatsappUrl
      ? {
          icon: 'bx bxl-whatsapp',
          label: 'WhatsApp',
          href: whatsappUrl,
          tint: 'bg-[#4f86c6]/15 text-[#356aa8] dark:text-[#86b4e6]',
        }
      : {
          icon: 'bx bx-user',
          label: 'Conta',
          to: '/conta',
          tint: 'bg-[#4f86c6]/15 text-[#356aa8] dark:text-[#86b4e6]',
        },
    {
      icon: 'bxl-instagram',
      label: 'Instagram',
      href: instagramDmUrl(),
      tint: 'bg-[#c9626b]/15 text-[#b04a54] dark:text-[#e58a93]',
    },
  ]
  return (
    <div className="mt-5 grid grid-cols-4 gap-3">
      {items.map((item) => {
        const inner = (
          <>
            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${item.tint}`}>
              <i className={item.icon.startsWith('bx ') ? item.icon : `bx ${item.icon}`} aria-hidden="true" />
            </span>
            <span className="mt-2 font-subtitle text-[11px] text-onyx">{item.label}</span>
          </>
        )
        return item.to ? (
          <Link key={item.label} to={item.to} className="flex flex-col items-center">
            {inner}
          </Link>
        ) : (
          <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="flex flex-col items-center">
            {inner}
          </a>
        )
      })}
    </div>
  )
}

/** Services as swipeable photo cards. */
export function ServiceCarousel({ services }: { services: Service[] | null }) {
  return (
    <section className="pt-12">
      <SectionTitle title="Os nossos serviços" hint="Desliza e escolhe o teu modelo." />
      <div className={`${strip} mt-5`}>
        {services === null &&
          [0, 1].map((i) => <div key={i} className="h-80 w-[78%] shrink-0 animate-pulse rounded-[2rem] bg-gold/10" />)}
        {services?.map((service, index) => (
          <Link
            key={service.id}
            to={`/marcar?service=${service.id}`}
            className="relative h-80 w-[78%] max-w-xs shrink-0 snap-center overflow-hidden rounded-[2rem] bg-[#2a170a]"
          >
            <img
              src={PHOTOS[index % PHOTOS.length].src}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-[#1a1008]/90 via-[#1a1008]/25 to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#1a1008]/40 px-3 py-1.5 font-subtitle text-[11px] text-[#ffffff] backdrop-blur-md">
              <i className="bx bx-time-five text-sm" aria-hidden="true" />
              {service.durationLabel}
            </span>
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-[#ffffff]">
              <span className="min-w-0">
                <span className="block truncate font-subtitle text-xl font-semibold tracking-tight">
                  {service.name}
                </span>
                <span className="mt-0.5 block font-subtitle text-base text-[#e0c36e]">
                  {formatPrice(service.priceCents)}
                </span>
              </span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a1008]/40 text-xl backdrop-blur-md">
                <i className="bx bx-right-arrow-alt" aria-hidden="true" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  { icon: 'bx bx-list-check', title: 'Escolhe', text: 'o modelo' },
  { icon: 'bx bx-calendar-plus', title: 'Marca', text: 'o dia e a hora' },
  { icon: 'bx bx-bell', title: 'Recebe', text: 'a confirmação' },
]

/** Three compact steps side by side. */
export function StepsRow() {
  return (
    <section className="pt-12">
      <SectionTitle title="Como funciona" />
      <div className="mx-auto mt-5 grid max-w-2xl grid-cols-3 gap-3 px-5">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: index * 0.08 }}
            className="relative rounded-3xl border border-gold/25 bg-cream px-3 pb-4 pt-6 text-center"
          >
            <span className="absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-gold-deep font-subtitle text-xs font-semibold text-[#ffffff]">
              {index + 1}
            </span>
            <i className={`${step.icon} text-3xl text-gold-ink`} aria-hidden="true" />
            <p className="mt-2 font-subtitle text-sm font-semibold text-onyx">{step.title}</p>
            <p className="font-subtitle text-xs font-light text-muted-dark">{step.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/** Photo mosaic of the studio's work. */
export function WorkGrid() {
  const tall = new Set([0, 3])
  return (
    <section className="pt-12">
      <SectionTitle title="O nosso trabalho" />
      <div className="mx-auto mt-5 grid max-w-2xl auto-rows-[9.5rem] grid-flow-dense grid-cols-2 gap-2 px-5">
        {PHOTOS.map((photo, index) => (
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            loading="lazy"
            className={`h-full w-full rounded-3xl object-cover ${tall.has(index) ? 'row-span-2' : ''}`}
          />
        ))}
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-gold/25 bg-cream text-center font-subtitle text-sm font-medium text-onyx"
        >
          <i className="bx bxl-instagram text-2xl text-gold-ink" aria-hidden="true" />
          Mais no Instagram
        </a>
      </div>
    </section>
  )
}

/** Testimonials as swipeable quote cards. */
export function ReviewsRow({ reviews }: { reviews: Array<{ id: string; quote: string; name: string }> }) {
  if (reviews.length === 0) return null
  return (
    <section className="pt-12">
      <SectionTitle title="O que dizem as nossas clientes" />
      <div className={`${strip} mt-5`}>
        {reviews.map((review) => (
          <figure
            key={review.id}
            className="flex w-[82%] max-w-xs shrink-0 snap-center flex-col rounded-3xl border border-gold/25 bg-cream p-5"
          >
            <i className="bx bxs-quote-alt-left text-3xl text-gold-ink/60" aria-hidden="true" />
            <blockquote className="mt-2 line-clamp-6 flex-1 font-subtitle text-sm font-light leading-relaxed text-onyx">
              {review.quote}
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-deep font-subtitle text-sm font-semibold text-[#ffffff]">
                {review.name.trim().charAt(0).toUpperCase()}
              </span>
              <span className="font-subtitle text-sm font-semibold text-onyx">{review.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/** Contact tiles at the end of the page. */
export function ContactTiles({ whatsappUrl }: { whatsappUrl?: string }) {
  return (
    <section className="mx-auto max-w-2xl px-5 pt-14">
      <h2 className="font-subtitle text-2xl font-semibold tracking-tight text-onyx">Fala connosco</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-3xl border border-gold/25 bg-cream p-4"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#c9626b]/15 text-2xl text-[#b04a54]">
            <i className="bx bxl-instagram" aria-hidden="true" />
          </span>
          <span className="font-subtitle text-sm font-semibold text-onyx">Instagram</span>
        </a>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-3xl border border-gold/25 bg-cream p-4"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5f9a76]/15 text-2xl text-[#3f7a58]">
              <i className="bx bxl-whatsapp" aria-hidden="true" />
            </span>
            <span className="font-subtitle text-sm font-semibold text-onyx">WhatsApp</span>
          </a>
        )}
      </div>
    </section>
  )
}
