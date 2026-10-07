import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { BrandMarquee } from '@/components/ui/brand-marquee'
import { VerticalImageStack, type StackImage } from '@/components/ui/vertical-image-stack'

// The CEO's photos, in the order they appear in the stack. Put the files in public/images/ceo/ and list them here
// (three or more, portrait photos work best). The placeholders below are replaced by simply listing the real ones.
const CEO_PHOTOS: string[] = []
const PLACEHOLDERS = ['/images/ceo/placeholder-1.jpg', '/images/ceo/placeholder-2.jpg', '/images/ceo/placeholder-3.jpg']
const PHOTO_ITEMS: StackImage[] = (CEO_PHOTOS.length ? CEO_PHOTOS : PLACEHOLDERS).map((src, i) => ({
  src,
  alt: `Rute De Pina, foto ${i + 1}`,
}))

const DESCRIPTION =
  'Rute De Pina fundou a AFROGLOW para preservar e celebrar a arte das tranças afro. Com técnica apurada e um cuidado próximo com cada cliente, transformou a paixão por este ofício num espaço onde tradição e identidade se encontram.'

export default function CeoPage() {
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const pillClasses = `flex items-center rounded-full bg-white/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow duration-500 ${
    scrolled ? 'shadow-xl shadow-black/15' : ''
  }`

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
      <BrandMarquee />
      <div className="fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-ink">AFROGLOW</span>
          </Link>

          <Link
            to="/"
            className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-ink sm:px-6 ${pillClasses}`}
          >
            <span>Sair</span>
            <i className="bx bx-x text-xl" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 pb-8 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:px-8">
        <span className="block text-center font-subtitle text-xs uppercase tracking-[0.3em] text-gold-ink sm:text-left">
          A nossa fundadora
        </span>
        <h1 className="mt-3 text-center font-logo text-3xl text-onyx sm:text-left sm:text-5xl">
          Quem lidera a AFROGLOW
        </h1>

        <div className="mt-3 grid items-center gap-3 sm:mt-6 sm:grid-cols-[1fr_1.1fr] sm:gap-10">
          <div className="h-[min(420px,30dvh)] sm:h-[min(680px,64dvh)]">
            <VerticalImageStack images={PHOTO_ITEMS} />
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border-[1.5px] border-onyx/15 bg-white/60 p-4 shadow-xl shadow-black/10 backdrop-blur-md sm:p-7"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 -top-8 select-none font-logo text-[9rem] leading-none text-gold-ink/15 sm:text-[12rem]"
            >
              &rdquo;
            </span>
            <span className="inline-flex rounded-full border-[1.5px] border-onyx/20 px-3.5 py-1.5 font-subtitle text-[10px] font-medium uppercase tracking-[0.25em] text-muted-dark sm:text-xs">
              CEO &amp; Fundadora
            </span>
            <p className="relative mt-3 font-logo text-3xl leading-[1.05] text-onyx sm:mt-4 sm:text-5xl">
              Rute De Pina
            </p>
            <span className="my-3 block h-px w-14 bg-gold-ink sm:my-4 sm:w-20" />
            <p className="relative font-subtitle text-xs leading-[1.6] text-muted-dark sm:text-sm sm:leading-[1.7]">
              {DESCRIPTION}
            </p>
            <a
              href="https://www.instagram.com/rute_pina_/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Rute De Pina"
              className="relative mt-3 inline-flex items-center gap-2 rounded-full border-[1.5px] border-onyx/20 px-4 py-2 font-subtitle text-sm text-onyx transition-colors duration-300 hover:border-onyx sm:mt-5"
            >
              <i className="bx bxl-instagram text-xl" aria-hidden="true" />
              @rute_pina_
            </a>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
