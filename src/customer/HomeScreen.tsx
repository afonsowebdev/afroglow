import { Closing, Lookbook, Manifesto, Process, Questions, ServiceMenu, Visit, Voices, Welcome } from './HomeSections'
import { useLightStatusBar } from './useLightStatusBar'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { HeroVideoBackground } from '@/components/ui/hero-video-background'
import { GlassButton } from '@/components/ui/glass-button'
import { api } from '@/lib/api'
import { useWhatsapp } from '@/lib/site-config'
import { useTheme } from '@/lib/theme'
import type { Service, Testimonial as ApiTestimonial } from '@/lib/types'

export default function HomeScreen() {
  useLightStatusBar()
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
    <main>
      {/* The hero fills the whole first screen, edge to edge, like the website. */}
      <section
        data-hero
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

      <div className="relative z-10 bg-white pb-40 lining-nums">
        <section className="mx-auto max-w-2xl px-6 pt-10">
          <Welcome />
        </section>
        <Manifesto />
        <ServiceMenu services={services} />
        <Lookbook />
        <Process />
        <Voices reviews={testimonials} />
        <Questions />
        <Visit />
        <Closing
          whatsappUrl={
            whatsapp.enabled ? whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.') : undefined
          }
        />
      </div>
    </main>
  )
}
