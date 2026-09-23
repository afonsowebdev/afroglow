import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TeamMemberCard } from '@/components/ui/team-member-card'

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
    <div className="min-h-screen bg-white">
      <div className="fixed inset-x-0 top-0 z-50 mt-4 px-4 sm:mt-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-deep">AfroGlow</span>
          </Link>

          <Link
            to="/"
            className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-deep sm:px-6 ${pillClasses}`}
          >
            <span>Sair</span>
            <i className="bx bx-x text-xl" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <span className="font-subtitle text-xs uppercase tracking-[0.3em] text-gold-deep">A nossa fundadora</span>
        <h1 className="mt-4 font-logo text-4xl text-onyx sm:text-5xl">Quem lidera a AfroGlow</h1>

        <TeamMemberCard
          jobPosition="CEO & Fundadora"
          firstName="Rute"
          lastName="De Pina"
          description="Rute De Pina fundou a AfroGlow para preservar e celebrar a arte das tranças afro. Com técnica apurada e um cuidado próximo com cada cliente, transformou a paixão por este ofício num espaço onde tradição e identidade se encontram."
          instagramUrl="https://www.instagram.com/rute_pina_/"
        />
      </main>
    </div>
  )
}
