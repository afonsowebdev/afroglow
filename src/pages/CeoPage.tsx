import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMarquee } from '@/components/ui/brand-marquee'
import { TeamMemberCard } from '@/components/ui/team-member-card'

// Example: ['/images/ceo/ceo-1.jpg', '/images/ceo/ceo-2.jpg', '/images/ceo/ceo-3.jpg']
const CEO_PHOTOS: string[] = []

export default function CeoPage() {
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

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-5 pb-8 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:px-8">
        <span className="block text-center font-subtitle text-xs uppercase tracking-[0.3em] text-gold-ink sm:text-left">
          A nossa fundadora
        </span>
        <h1 className="mt-3 text-center font-logo text-3xl text-onyx sm:text-left sm:text-5xl">
          Quem lidera a AFROGLOW
        </h1>

        <TeamMemberCard
          className="my-6 sm:my-8"
          jobPosition="CEO & Fundadora"
          firstName="Rute"
          lastName="De Pina"
          description="Rute De Pina fundou a AFROGLOW para preservar e celebrar a arte das tranças afro. Com técnica apurada e um cuidado próximo com cada cliente, transformou a paixão por este ofício num espaço onde tradição e identidade se encontram."
          // Put the CEO's photos in public/images/ceo/ and list them here (three or more); they change by themselves.
          photos={CEO_PHOTOS}
          instagramUrl="https://www.instagram.com/rute_pina_/"
        />
      </main>
    </div>
  )
}
