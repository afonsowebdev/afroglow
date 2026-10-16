import {
  ContactTiles,
  Visit,
  ReviewsRow,
  ServiceCarousel,
  StepsRow,
  WelcomeCard,
  Greeting,
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

/**
 * One wave across 1440 units that repeats every 720 (so the 200%-wide layer can drift by half its width forever
 * without a seam): a long swell with a smaller ripple on it, filled down to the bottom.
 */
function wavePath(base: number, swell: number, ripple: number, phase: number) {
  const points: string[] = []
  for (let x = 0; x <= 1440; x += 12) {
    const t = (x / 720) * 2 * Math.PI
    const y = base + swell * Math.sin(t + phase) + ripple * Math.sin(2 * t + phase * 1.7)
    points.push(`${x} ${y.toFixed(1)}`)
  }
  return `M${points.join(' L')} L1440 100 L0 100 Z`
}

const WAVES = [
  { key: 'far', fill: 'fill-white/25', d: wavePath(34, 22, 7, 0), animation: 'wave-drift 26s linear infinite reverse' },
  { key: 'mid', fill: 'fill-white/55', d: wavePath(48, 19, 6, 1.7), animation: 'wave-drift 18s linear infinite' },
  {
    key: 'near',
    fill: 'fill-white',
    d: wavePath(62, 15, 5, 3.4),
    animation: 'wave-drift 12s linear infinite reverse',
  },
]

export default function HomeScreen() {
  const whatsapp = useWhatsapp()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [services, setServices] = useState<Service[] | null>(null)
  const [testimonials, setTestimonials] = useState<
    Array<{ id: string; quote: string; name: string; date?: string; photo?: number }>
  >([])

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
            date: t.createdAt,
            photo: typeof t.photo === 'number' ? t.photo : undefined,
          })),
        ),
      )
      .catch(() => setTestimonials([]))
  }, [])

  return (
    <main className="pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {/* The hero fills the whole first screen, edge to edge, like the website. */}
      <section
        data-hero
        className="relative flex items-center justify-center overflow-hidden px-6 pb-24 pt-[env(safe-area-inset-top)] text-center"
        style={{ minHeight: '100dvh' }}
      >
        {/* Just the video: no tint on top of it. */}
        <HeroVideoBackground key={dark ? 'dark' : 'light'} tone={dark ? 'dark' : 'light'} tint={false} />
        {/* Bottom edge: a frosted blur that melts into a soft wave, so the hero never ends on a straight line. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[12%] backdrop-blur-xl [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_70%)] [mask-image:linear-gradient(to_bottom,transparent,black_70%)]"
        />
        {/* Three layers of waves (far, middle, near) drifting slowly at their own pace, in turns of direction. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -bottom-px z-[6] h-24 overflow-hidden"
        >
          {WAVES.map((wave) => (
            <svg
              key={wave.key}
              viewBox="0 0 1440 100"
              preserveAspectRatio="none"
              className={`absolute inset-y-0 left-0 h-full w-[200%] ${wave.fill}`}
              style={{ animation: wave.animation }}
            >
              <path d={wave.d} />
            </svg>
          ))}
        </div>
        <div className="relative z-10 flex max-w-md flex-col items-center">
          <span className="mb-4 font-body text-xs uppercase tracking-[0.3em] text-[#ffffff] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
            AFROGLOW · Portugal
          </span>
          <h1 className="font-logo text-[8.4vw] leading-[1.05] text-[#ffffff] [text-shadow:0_2px_28px_rgba(0,0,0,0.6)] sm:text-6xl">
            Cada penteado,
            <br />
            uma obra de arte.
          </h1>
          <p className="mt-5 font-subtitle text-base font-light text-[#ffffff] [text-shadow:0_1px_16px_rgba(0,0,0,0.65)]">
            Tranças afro feitas com cuidado, técnica e identidade.
          </p>
        </div>

        {/* Call to action: low in the hero, in the same glass as the tab bar; "Descobre" sits under it. */}
        <div className="absolute inset-x-0 bottom-[calc(9.4rem+env(safe-area-inset-bottom))] z-10 flex justify-center">
          <GlassButton label="Marcar sessão" to="/marcar" />
        </div>

        <motion.div
          className="absolute bottom-[calc(6.2rem+env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <span className="font-body text-[0.65rem] uppercase tracking-[0.3em] text-[#ffffff] [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
            Descobre
          </span>
          <i className="bx bx-chevron-down -mt-0.5 text-2xl text-[#ffffff] [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]" />
        </motion.div>
      </section>

      <section className="relative z-10 bg-white px-5 pt-10">
        <div className="mx-auto max-w-2xl">
          <Greeting />
          <div className="mt-5">
            <WelcomeCard />
          </div>
        </div>
      </section>

      <ServiceCarousel services={services} />
      <StepsRow />
      <WorkGrid />
      <ReviewsRow reviews={testimonials} />

      <Visit />

      <ContactTiles
        whatsappUrl={
          whatsapp.enabled ? whatsapp.url('Olá! Gostaria de saber mais sobre os vossos serviços.') : undefined
        }
      />
    </main>
  )
}
