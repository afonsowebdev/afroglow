import { motion } from 'motion/react'
import { HeroVideoBackground } from '@/components/ui/hero-video-background'
import { MotionButton } from '@/components/ui/motion-button'
import { useTheme } from '@/lib/theme'

export default function Hero() {
  const { theme } = useTheme()
  const dark = theme === 'dark'

  return (
    <section id="top" className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <HeroVideoBackground tone={dark ? 'dark' : 'light'} />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 flex select-none items-center justify-center whitespace-nowrap font-logo text-[20vw] leading-none tracking-tight text-onyx/5"
      >
        {dark ? null : 'AFROGLOW'}
      </span>

      <div className="relative z-10 flex max-w-3xl flex-col items-center px-6 text-center">
        <span className="mb-4 font-body text-xs uppercase tracking-[0.3em] text-gold-deep">AFROGLOW · Portugal</span>
        <h1
          className={`font-logo text-[10vw] leading-[1.05] sm:text-[7vw] md:text-[6vw] ${
            dark ? 'text-[#f5efdf]' : 'text-gold-deep'
          }`}
        >
          Arte que parte
          <br />
          do teu cabelo.
        </h1>
        <p
          className={`mt-6 max-w-md font-subtitle text-base font-light sm:text-lg md:text-[1.15vw] ${
            dark ? 'text-[#f5efdf]/80' : 'text-muted-dark'
          }`}
        >
          Tranças afro feitas com cuidado, técnica e identidade.
        </p>
        <div className="mt-8">
          <MotionButton label="Ver Serviços" href="#servicos" className="bg-white/60 backdrop-blur-sm" />
        </div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="font-body text-[0.65rem] uppercase tracking-[0.3em] text-gold-deep">Scroll</span>
        <i className="bx bx-chevron-down text-3xl text-gold-deep" aria-hidden="true" />
      </motion.div>
    </section>
  )
}
