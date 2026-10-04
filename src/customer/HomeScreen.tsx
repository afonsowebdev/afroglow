import Faq from '@/components/sections/Faq'
import Location from '@/components/sections/Location'
import {
  ContactTiles,
  QuickActions,
  ReviewsRow,
  ServiceCarousel,
  StepsRow,
  WelcomeCard,
  WorkGrid,
} from './HomeSections'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { HeroVideoBackground } from '@/components/ui/hero-video-background'
import { GlassButton } from '@/components/ui/glass-button'
import { api } from '@/lib/api'
import { useWhatsapp } from '@/lib/site-config'
import { useTheme } from '@/lib/theme'
import type { Service, Testimonial as ApiTestimonial } from '@/lib/types'

export default function HomeScreen() {
  const whatsapp = useWhatsapp()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [services, setServices] = useState<Service[] | null>(null)
  const [testimonials, setTestimonials] = useState<Array<{ id: string; quote: string; name: string }>>([])

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
        data-hero
        className="relative flex items-center justify-center overflow-hidden px-6 pb-24 pt-[env(safe-area-inset-top)] text-center"
        style={{ minHeight: '100dvh' }}
      >
        {/* Just the video: no tint on top of it. */}
        <HeroVideoBackground key={dark ? 'dark' : 'light'} tone={dark ? 'dark' : 'light'} tint={false} />
        {/* Bottom edge: frosted blur that melts into the page instead of a straight cut. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[40%] backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_70%)] [mask-image:linear-gradient(to_bottom,transparent,black_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] h-[40%] bg-gradient-to-b from-white/0 via-white/60 to-white"
        />
        <div className="relative z-10 flex max-w-md flex-col items-center">
          <span className="mb-4 font-body text-xs uppercase tracking-[0.3em] text-[#ffffff] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
            AFROGLOW · Portugal
          </span>
          <h1 className="font-logo text-[10vw] leading-[1.05] text-[#ffffff] [text-shadow:0_2px_28px_rgba(0,0,0,0.6)] sm:text-6xl">
            Arte que parte
            <br />
            do teu cabelo.
          </h1>
          <p className="mt-5 font-subtitle text-base font-light text-[#ffffff] [text-shadow:0_1px_16px_rgba(0,0,0,0.65)]">
            Tranças afro feitas com cuidado, técnica e identidade.
          </p>
          <div className="mt-8">
            <GlassButton label="Marcar sessão" to="/marcar" />
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
          <QuickActions
            whatsappUrl={
              whatsapp.enabled ? whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.') : undefined
            }
          />
        </div>
      </section>

      <ServiceCarousel services={services} />
      <StepsRow />
      <WorkGrid />
      <ReviewsRow reviews={testimonials} />

      <div>
        <Faq app />
        <Location app />
      </div>

      <ContactTiles
        whatsappUrl={
          whatsapp.enabled ? whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.') : undefined
        }
      />
    </main>
  )
}
