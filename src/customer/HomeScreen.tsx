import Faq from '@/components/sections/Faq'
import Location from '@/components/sections/Location'
import { HowItWorksApp, WelcomeCard, WorkGallery } from './HomeSections'
import { useLightStatusBar } from './useLightStatusBar'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { HeroVideoBackground } from '@/components/ui/hero-video-background'
import { MotionButton } from '@/components/ui/motion-button'
import { TestimonialsEditorial, type Testimonial } from '@/components/ui/editorial-testimonial'
import { api } from '@/lib/api'
import { instagramDmUrl, useWhatsapp } from '@/lib/site-config'
import { useTheme } from '@/lib/theme'
import { formatPrice, type Service, type Testimonial as ApiTestimonial } from '@/lib/types'

export default function HomeScreen() {
  useLightStatusBar()
  const whatsapp = useWhatsapp()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [services, setServices] = useState<Service[] | null>(null)
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  useEffect(() => {
    api
      .get<Service[]>('/services')
      .then(setServices)
      .catch(() => setServices([]))
    api
      .get<ApiTestimonial[]>('/testimonials')
      .then((data) =>
        setTestimonials(
          data.map((t) => ({
            id: t.id,
            quote: t.content,
            name: t.customer.name,
          })),
        ),
      )
      .catch(() => setTestimonials([]))
  }, [])

  return (
    <main className="pb-40">
      {/* The hero fills the whole first screen, edge to edge, like the website. */}
      <section
        className="relative flex items-center justify-center overflow-hidden px-6 pb-24 pt-[env(safe-area-inset-top)] text-center"
        style={{ minHeight: '100dvh' }}
      >
        <HeroVideoBackground key={dark ? 'dark' : 'light'} tone={dark ? 'dark' : 'light'} />
        <div className="relative z-10 flex max-w-md flex-col items-center">
          <span className="mb-4 font-body text-xs uppercase tracking-[0.3em] text-gold">AFROGLOW · Portugal</span>
          <h1 className="font-logo text-[10vw] leading-[1.05] text-[#f5efdf] [text-shadow:0_2px_24px_rgba(0,0,0,0.45)] sm:text-6xl">
            Arte que parte
            <br />
            do teu cabelo.
          </h1>
          <p className="mt-5 font-subtitle text-base font-light text-[#f5efdf] [text-shadow:0_1px_14px_rgba(0,0,0,0.5)]">
            Tranças afro feitas com cuidado, técnica e identidade.
          </p>
          <div className="mt-8">
            <MotionButton label="Marcar sessão" href="/marcar" className="bg-white/60 backdrop-blur-sm" />
          </div>
        </div>

        <motion.div
          className="absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <span className="font-body text-[0.65rem] uppercase tracking-[0.3em] text-gold">Descobre</span>
          <i className="bx bx-chevron-down text-3xl text-gold" />
        </motion.div>
      </section>

      <section className="relative z-10 bg-white px-5 pt-10">
        <div className="mx-auto max-w-2xl">
          <WelcomeCard />
          <h2 className="mt-12 font-subtitle font-semibold tracking-tight text-2xl text-onyx">Os nossos serviços</h2>
          <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">
            Escolhe o modelo e marca a tua sessão.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {services === null && <p className="font-subtitle text-sm text-muted-dark">A carregar...</p>}
            {services?.map((service) => (
              <Link
                key={service.id}
                to={`/marcar?service=${service.id}`}
                className="block rounded-2xl border border-gold/20 bg-white p-5 shadow-sm shadow-black/5 transition-colors hover:border-gold-deep"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-subtitle font-semibold tracking-tight text-lg text-onyx">{service.name}</h3>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gold-deep/10 px-2.5 py-1 font-subtitle text-[11px] text-gold-ink">
                      <i className="bx bx-time-five text-sm" aria-hidden="true" />
                      {service.durationLabel}
                    </span>
                  </div>
                  <p className="shrink-0 font-subtitle font-semibold tracking-tight text-xl text-onyx">
                    {formatPrice(service.priceCents)}
                  </p>
                </div>
                <p className="mt-3 line-clamp-2 font-subtitle text-sm text-muted-dark">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksApp />
      <WorkGallery />

      {testimonials.length > 0 && (
        <section className="mx-auto max-w-2xl px-5 pt-16">
          <h2 className="text-center font-subtitle font-semibold tracking-tight text-2xl text-onyx">
            O que dizem as nossas clientes
          </h2>
          <div className="mt-10">
            <TestimonialsEditorial testimonials={testimonials} />
          </div>
        </section>
      )}

      <div>
        <Faq app />
        <Location app />
      </div>

      <section className="mx-auto max-w-2xl px-5 pt-14 text-center">
        <h2 className="font-subtitle font-semibold tracking-tight text-2xl text-onyx">Fala connosco</h2>
        <div className="mt-6 flex flex-col items-center gap-4">
          <MotionButton
            label="Instagram"
            variant="primary"
            icon={<i className="bx bxl-instagram text-lg" aria-hidden="true" />}
            href={instagramDmUrl()}
            target="_blank"
            rel="noreferrer"
          />
          {whatsapp.enabled && (
            <MotionButton
              label="WhatsApp"
              variant="secondary"
              icon={<i className="bx bxl-whatsapp text-lg" aria-hidden="true" />}
              href={whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.')}
              target="_blank"
              rel="noreferrer"
            />
          )}
        </div>
      </section>
    </main>
  )
}
