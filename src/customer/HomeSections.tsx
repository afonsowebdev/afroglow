import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { buildQuestions } from '@/components/sections/Faq'
import { api } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { instagramDmUrl, siteConfig, useBusinessInfo } from '@/lib/site-config'
import { formatPrice, type Booking, type Service } from '@/lib/types'
import { longDay, timeLabel } from './dates'

/*
 * The part of the home screen under the hero is laid out like a printed menu / lookbook: serif headlines,
 * hairlines instead of boxes, numbered lists and big photographs. Brand words in the display fonts, details
 * in Poppins.
 */

const PHOTOS = [
  { src: '/images/hero/hero-1.jpg', caption: 'Knotless braids, pontas cacheadas' },
  { src: '/images/hero/hero-2.jpg', caption: 'Detalhe, pontas cacheadas' },
  { src: '/images/hero/hero-3.jpg', caption: 'Vista lateral' },
  { src: '/images/hero/hero-4.jpg', caption: 'Repartição triangular' },
  { src: '/images/hero/hero-5.jpg', caption: 'Detalhe do couro cabeludo' },
]

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="font-subtitle text-[11px] font-medium uppercase tracking-[0.3em] text-gold-ink">{children}</p>
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 font-display text-[34px] font-semibold leading-[1.05] tracking-tight text-onyx">{children}</h2>
  )
}

function Block({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-2xl px-6 pt-20 lining-nums ${className}`}>{children}</section>
}

function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** First thing under the hero: the next session as one line of text, or an invitation. No box. */
export function Welcome() {
  const { customer, loading } = useCustomerAuth()
  const [bookings, setBookings] = useState<Booking[] | null>(null)

  useEffect(() => {
    if (!customer) return
    api
      .get<Booking[]>('/account/bookings')
      .then(setBookings)
      .catch(() => setBookings([]))
  }, [customer])

  if (loading) return <div className="h-24" />

  const rule = 'border-y border-onyx/15 py-6'

  if (!customer) {
    return (
      <Link to="/entrar" className={`${rule} flex items-center justify-between`}>
        <span>
          <Kicker>Bem-vinda</Kicker>
          <span className="mt-2 block font-display text-2xl font-semibold text-onyx">Entrar ou criar conta</span>
        </span>
        <i className="bx bx-right-arrow-alt text-3xl text-gold-ink" aria-hidden="true" />
      </Link>
    )
  }

  const next = (bookings ?? [])
    .filter((b) => (b.status === 'PENDING' || b.status === 'ACCEPTED') && new Date(b.slot.startsAt) > new Date())
    .sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt))[0]

  if (!next) {
    return (
      <Link to="/marcar" className={`${rule} flex items-center justify-between`}>
        <span>
          <Kicker>Olá, {customer.name.split(' ')[0]}</Kicker>
          <span className="mt-2 block font-display text-2xl font-semibold text-onyx">Marcar a próxima sessão</span>
        </span>
        <i className="bx bx-right-arrow-alt text-3xl text-gold-ink" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <Link to="/marcacoes" className={`${rule} flex items-center justify-between gap-4`}>
      <span className="min-w-0">
        <Kicker>A tua próxima sessão</Kicker>
        <span className="mt-2 block font-display text-[26px] font-semibold leading-tight text-onyx">
          {longDay(next.slot.startsAt)}
        </span>
        <span className="mt-1 block truncate font-subtitle text-sm text-muted-dark">
          {timeLabel(next.slot.startsAt)} · {next.service.name} ·{' '}
          {next.status === 'PENDING' ? 'por confirmar' : 'confirmada'}
        </span>
      </span>
      <i className="bx bx-right-arrow-alt shrink-0 text-3xl text-gold-ink" aria-hidden="true" />
    </Link>
  )
}

/** A short statement of what the studio is about, set large. */
export function Manifesto() {
  return (
    <Block>
      <Reveal>
        <Kicker>A AFROGLOW</Kicker>
        <p className="mt-5 font-display text-[28px] font-normal leading-[1.22] text-onyx">
          Nasceu da paixão por preservar e celebrar a arte das tranças afro. Cada penteado é feito com técnica apurada e
          respeito pela identidade de quem o usa.
        </p>
        <span aria-hidden="true" className="mt-8 block h-px w-14 bg-gold-deep" />
      </Reveal>
    </Block>
  )
}

/** The services as a printed menu: numeral, name, duration, price. */
export function ServiceMenu({ services }: { services: Service[] | null }) {
  return (
    <Block>
      <Reveal>
        <Kicker>Serviços</Kicker>
        <Heading>A carta</Heading>
      </Reveal>

      <div className="mt-8 border-t border-onyx/15">
        {services === null &&
          [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse border-b border-onyx/10 bg-gold/5" />)}
        {services?.map((service, index) => (
          <Link
            key={service.id}
            to={`/marcar?service=${service.id}`}
            className="group flex items-baseline gap-4 border-b border-onyx/15 py-6 active:bg-gold-deep/5"
          >
            <span className="w-8 shrink-0 font-display text-lg text-gold-ink">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[26px] font-semibold leading-tight text-onyx">
                {service.name}
              </span>
              <span className="mt-1 block font-subtitle text-xs uppercase tracking-[0.18em] text-muted-dark">
                {service.durationLabel}
              </span>
            </span>
            <span className="shrink-0 font-display text-2xl font-semibold text-onyx">
              {formatPrice(service.priceCents)}
            </span>
          </Link>
        ))}
      </div>
      {services && services.length > 0 && (
        <p className="mt-4 font-subtitle text-xs font-light text-muted-dark">
          Toca num modelo para marcar a tua sessão.
        </p>
      )}
    </Block>
  )
}

/** Photographs at their own pace: two uneven columns with captions. */
export function Lookbook() {
  const left = PHOTOS.filter((_, i) => i % 2 === 0)
  const right = PHOTOS.filter((_, i) => i % 2 === 1)
  const figure = (photo: (typeof PHOTOS)[number], number: number, tall: boolean) => (
    <motion.figure
      key={photo.src}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <img
        src={photo.src}
        alt={photo.caption}
        loading="lazy"
        className={`w-full object-cover ${tall ? 'aspect-[3/4.4]' : 'aspect-[3/3.6]'}`}
      />
      <figcaption className="mt-2 font-subtitle text-[10px] uppercase leading-snug tracking-[0.16em] text-muted-dark">
        <span className="text-gold-ink">{String(number).padStart(2, '0')}</span> — {photo.caption}
      </figcaption>
    </motion.figure>
  )
  return (
    <Block>
      <Reveal>
        <Kicker>Lookbook</Kicker>
        <Heading>O nosso trabalho</Heading>
      </Reveal>
      <div className="mt-8 grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-8">{left.map((p, i) => figure(p, i * 2 + 1, i % 2 === 0))}</div>
        <div className="flex flex-col gap-8 pt-14">{right.map((p, i) => figure(p, i * 2 + 2, i % 2 === 1))}</div>
      </div>
      <a
        href={instagramDmUrl()}
        target="_blank"
        rel="noreferrer"
        className="mt-10 inline-flex items-center gap-2 border-b border-gold-deep pb-1 font-subtitle text-sm text-onyx"
      >
        Ver mais no Instagram <i className="bx bx-up-arrow-alt rotate-45 text-lg" aria-hidden="true" />
      </a>
    </Block>
  )
}

const STEPS = [
  { title: 'Escolhe o modelo', text: 'Vê a duração e o preço de cada um.' },
  { title: 'Marca o dia e a hora', text: 'Escolhe um horário livre e envia o pedido.' },
  { title: 'Recebe a confirmação', text: 'Avisamos-te na app e lembramos-te antes da sessão.' },
]

/** Three steps in roman numerals, separated by hairlines. */
export function Process() {
  return (
    <Block>
      <Reveal>
        <Kicker>Como funciona</Kicker>
        <Heading>Em três passos</Heading>
      </Reveal>
      <ol className="mt-8 border-t border-onyx/15">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-5 border-b border-onyx/15 py-5">
            <span className="w-8 shrink-0 font-display text-2xl text-gold-ink">{ROMAN[index]}</span>
            <span>
              <span className="block font-display text-[22px] font-semibold leading-tight text-onyx">{step.title}</span>
              <span className="mt-1 block font-subtitle text-sm font-light text-muted-dark">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Block>
  )
}

/** Testimonials as one big quote at a time, with dashes to move between them. */
export function Voices({ reviews }: { reviews: Array<{ id: string; quote: string; name: string }> }) {
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)
  if (reviews.length === 0) return null
  const review = reviews[Math.min(index, reviews.length - 1)]
  const go = (delta: number) => setIndex((i) => (i + delta + reviews.length) % reviews.length)

  return (
    <Block>
      <Reveal>
        <Kicker>Vozes</Kicker>
      </Reveal>
      <div
        className="mt-6"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current === null) return
          const delta = e.changedTouches[0].clientX - startX.current
          if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1)
          startX.current = null
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.blockquote
            key={review.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <span aria-hidden="true" className="block font-logo text-6xl leading-none text-gold-deep">
              “
            </span>
            <p className="-mt-2 font-display text-[26px] font-normal leading-[1.25] text-onyx">{review.quote}</p>
            <footer className="mt-5 font-subtitle text-xs font-medium uppercase tracking-[0.2em] text-muted-dark">
              — {review.name}
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>
      {reviews.length > 1 && (
        <div className="mt-8 flex gap-2" role="tablist" aria-label="Testemunhos">
          {reviews.map((r, i) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Testemunho ${i + 1}`}
              onClick={() => setIndex(i)}
              className="py-3"
            >
              <span className={`block h-0.5 transition-all ${i === index ? 'w-10 bg-gold-deep' : 'w-5 bg-onyx/20'}`} />
            </button>
          ))}
        </div>
      )}
    </Block>
  )
}

/** Questions as a plain list: tap a line to read the answer. */
export function Questions() {
  const business = useBusinessInfo()
  const questions = buildQuestions(business)
  const [open, setOpen] = useState<number | null>(null)
  return (
    <Block>
      <Reveal>
        <Kicker>Dúvidas</Kicker>
        <Heading>Perguntas frequentes</Heading>
      </Reveal>
      <div className="mt-8 border-t border-onyx/15">
        {questions.map((item, i) => (
          <div key={item.q} className="border-b border-onyx/15">
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-display text-xl font-semibold leading-snug text-onyx">{item.q}</span>
              <span className="shrink-0 font-subtitle text-xl text-gold-ink" aria-hidden="true">
                {open === i ? '−' : '+'}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden pr-8 font-subtitle text-sm font-light leading-relaxed text-muted-dark"
                >
                  <span className="block pb-5">{item.a}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Block>
  )
}

/** Address and hours, only when filled in. */
export function Visit() {
  const business = useBusinessInfo()
  if (!business.address && business.openingHours.length === 0) return null
  return (
    <Block>
      <Reveal>
        <Kicker>Visita</Kicker>
        <Heading>Onde estamos</Heading>
      </Reveal>
      {business.address && <p className="mt-6 font-display text-2xl leading-snug text-onyx">{business.address}</p>}
      {business.mapUrl && (
        <a
          href={business.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block border-b border-gold-deep pb-0.5 font-subtitle text-sm text-onyx"
        >
          Abrir no mapa
        </a>
      )}
      {business.phone && (
        <p className="mt-3 font-subtitle text-sm text-muted-dark">
          <a href={`tel:${business.phone.replace(/[^+\d]/g, '')}`}>{business.phone}</a>
        </p>
      )}
      {business.openingHours.length > 0 && (
        <dl className="mt-6 border-t border-onyx/15">
          {business.openingHours.map((row) => (
            <div
              key={row.days}
              className="flex justify-between gap-4 border-b border-onyx/15 py-3 font-subtitle text-sm"
            >
              <dt className="text-muted-dark">{row.days}</dt>
              <dd className="text-onyx">{row.hours}</dd>
            </div>
          ))}
        </dl>
      )}
    </Block>
  )
}

/** Closing: a large wordmark and plain text links. */
export function Closing({ whatsappUrl }: { whatsappUrl?: string }) {
  return (
    <section className="mx-auto max-w-2xl px-6 pb-10 pt-24 lining-nums">
      <p aria-hidden="true" className="font-logo text-[17vw] leading-none text-gold-deep/25">
        AFROGLOW
      </p>
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="border-b border-onyx/40 pb-0.5 font-subtitle text-sm text-onyx"
        >
          Instagram
        </a>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="border-b border-onyx/40 pb-0.5 font-subtitle text-sm text-onyx"
          >
            WhatsApp
          </a>
        )}
        <a
          href={`mailto:${siteConfig.email}`}
          className="border-b border-onyx/40 pb-0.5 font-subtitle text-sm text-onyx"
        >
          {siteConfig.email}
        </a>
      </div>
    </section>
  )
}
