import { motion } from 'motion/react'
import { HeroVideoBackground } from '@/components/ui/hero-video-background'
import { MotionButton } from '@/components/ui/motion-button'
import { StackSpreadStage, type StackSpreadImage } from '@/components/ui/stack-spread'
import { useTheme } from '@/lib/theme'

const images: StackSpreadImage[] = [
  { src: '/images/hero/hero-1.jpg', alt: 'Knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-2.jpg', alt: 'Detalhe de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-3.jpg', alt: 'Vista lateral de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-4.jpg', alt: 'Padrão de repartição triangular em knotless braids' },
  { src: '/images/hero/hero-5.jpg', alt: 'Detalhe do couro cabeludo com repartição triangular' },
]

export default function Hero() {
  const { theme } = useTheme()

  if (theme === 'dark') {
    return (
      <section id="top" className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <HeroVideoBackground />

        <div className="relative z-10 flex max-w-3xl flex-col items-center px-6 text-center">
          <span className="mb-4 font-body text-xs uppercase tracking-[0.3em] text-gold-deep">
            AFROGLOW · Portugal
          </span>
          <h1 className="font-logo text-[10vw] leading-[1.05] text-[#f5efdf] sm:text-[7vw] md:text-[6vw]">
            Arte que parte
            <br />
            do teu cabelo.
          </h1>
          <p className="mt-6 max-w-md font-subtitle text-base font-light text-[#f5efdf]/80 sm:text-lg md:text-[1.15vw]">
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

  return (
    <div id="top">
      <StackSpreadStage
        images={images}
        scrollLength={350}
        stackScale={0.82}
        cardRadius={10}
        clusterRotation
        showScrollHint
        watermark="AFROGLOW"
        textColor="var(--color-gold-deep)"
        eyebrow="AFROGLOW · Portugal"
        headline={
          <>
            Arte que parte
            <br />
            do teu cabelo.
          </>
        }
        subtitle="Tranças afro feitas com cuidado, técnica e identidade."
      >
        <MotionButton label="Ver Serviços" href="#servicos" className="bg-white/60 backdrop-blur-sm" />
      </StackSpreadStage>
    </div>
  )
}
