import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { instagramDmUrl } from '@/lib/site-config'
import type { Booking } from '@/lib/types'
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

const STEPS = [
  { icon: 'bx bx-list-check', title: 'Escolhe o modelo', text: 'Vê a duração e o preço de cada um.' },
  { icon: 'bx bx-calendar-plus', title: 'Marca o dia e a hora', text: 'Escolhe um horário livre e envia o pedido.' },
  { icon: 'bx bx-bell', title: 'Recebe a confirmação', text: 'Avisamos-te na app e lembramos-te antes da sessão.' },
]

export function HowItWorksApp() {
  return (
    <section className="mx-auto max-w-2xl px-5 pt-14">
      <h2 className="font-subtitle text-2xl font-semibold tracking-tight text-onyx">Como funciona</h2>
      <ol className="mt-6">
        {STEPS.map((step, index) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ delay: index * 0.08 }}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="absolute left-[21px] top-12 h-[calc(100%-2.5rem)] w-px bg-gold/40" />
            )}
            <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-deep text-xl text-[#ffffff]">
              <i className={step.icon} aria-hidden="true" />
            </span>
            <div className="pt-1">
              <p className="font-subtitle text-base font-semibold text-onyx">{step.title}</p>
              <p className="font-subtitle text-sm font-light text-muted-dark">{step.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}

const WORK = [
  { src: '/images/hero/hero-1.jpg', alt: 'Knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-2.jpg', alt: 'Detalhe de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-3.jpg', alt: 'Vista lateral de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-4.jpg', alt: 'Padrão de repartição triangular em knotless braids' },
  { src: '/images/hero/hero-5.jpg', alt: 'Detalhe do couro cabeludo com repartição triangular' },
]

/** Swipeable strip with the studio's work. */
export function WorkGallery() {
  return (
    <section className="pt-14">
      <div className="mx-auto max-w-2xl px-5">
        <h2 className="font-subtitle text-2xl font-semibold tracking-tight text-onyx">O nosso trabalho</h2>
        <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">Desliza para ver mais.</p>
      </div>
      <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {WORK.map((photo) => (
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            loading="lazy"
            className="h-72 w-56 shrink-0 snap-center rounded-3xl object-cover"
          />
        ))}
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex h-72 w-56 shrink-0 snap-center flex-col items-center justify-center gap-3 rounded-3xl border border-gold/25 bg-cream text-onyx"
        >
          <i className="bx bxl-instagram text-5xl text-gold-ink" aria-hidden="true" />
          <span className="font-subtitle text-sm font-semibold">Ver mais no Instagram</span>
        </a>
      </div>
    </section>
  )
}
