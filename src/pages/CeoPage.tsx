import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMarquee } from '@/components/ui/brand-marquee'
import { MoltenRingCarousel, type MoltenRingItem } from '@/components/ui/molten-ring-carousel'

// The CEO's photos, in the order they appear on the ring. Put the files in public/images/ceo/ and list them here
// (three or more, portrait photos work best). The placeholders below are replaced by simply listing the real ones.
const CEO_PHOTOS: string[] = []
const PLACEHOLDERS = ['/images/ceo/placeholder-1.jpg', '/images/ceo/placeholder-2.jpg', '/images/ceo/placeholder-3.jpg']
const PHOTO_ITEMS: MoltenRingItem[] = (CEO_PHOTOS.length ? CEO_PHOTOS : PLACEHOLDERS).map((image) => ({
  image,
  title: '',
}))

const DESCRIPTION =
  'Rute De Pina fundou a AFROGLOW para preservar e celebrar a arte das tranças afro. Com técnica apurada e um cuidado próximo com cada cliente, transformou a paixão por este ofício num espaço onde tradição e identidade se encontram.'

export default function CeoPage() {
  const [scrolled, setScrolled] = useState(false)
  // On a phone the ring's frame is short, so its cards are drawn smaller.
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 639px)').matches)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const read = () => setPhone(query.matches)
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])

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

        <div className="mt-3 grid items-center gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-10">
          <div className="relative h-[min(340px,29dvh)] sm:h-[min(580px,60dvh)]">
            <MoltenRingCarousel
              className="min-h-0"
              items={PHOTO_ITEMS}
              arc={1.05}
              cardSize={phone ? 0.34 : 0.4}
              cardRatio={0.72}
              fuse={0.09}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-subtitle text-[11px] uppercase tracking-[0.2em] text-muted-dark">
              Desliza para ver mais
            </span>
          </div>

          <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:gap-4 sm:text-left">
            <p className="font-subtitle text-xs font-medium uppercase tracking-[0.3em] text-muted-dark">
              CEO &amp; Fundadora
            </p>
            <p className="font-logo text-3xl leading-[1.1] text-onyx sm:text-5xl">
              Rute
              <br />
              De Pina
            </p>
            <p className="font-subtitle text-[13px] leading-[1.65] text-muted-dark sm:text-sm sm:leading-[1.8]">
              {DESCRIPTION}
            </p>
            <a
              href="https://www.instagram.com/rute_pina_/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram de Rute De Pina"
              className="flex items-center gap-2 font-subtitle text-sm text-gold-ink transition-colors duration-300 hover:text-onyx"
            >
              <i className="bx bxl-instagram text-xl" aria-hidden="true" />
              @rute_pina_
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
