import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import {
  InstagramCard,
  PortfolioCounts,
  PortfolioFilters,
  PortfolioTile,
  PortfolioViewer,
} from '@/components/portfolio/PortfolioParts'
import { MotionButton } from '@/components/ui/motion-button'
import { usePageTitle } from '@/lib/page-title'
import { usePortfolio, type PortfolioFilter } from '@/lib/portfolio'
import { instagramDmUrl, siteConfig } from '@/lib/site-config'

// Heights alternate down the mosaic so it never reads as a plain grid.
const SHAPES = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-square']

/**
 * The portfolio's own page: all the work in a mosaic, with filters, and the place where pieces open full screen.
 * The piece on screen is kept in the address (?ver=…), so the home page can open one directly and a link to a
 * single photo can be shared.
 */
export default function PortfolioPage() {
  usePageTitle('Portfólio')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { items, photoCount, videoCount, hasBoth } = usePortfolio()
  const [filter, setFilter] = useState<PortfolioFilter>('todos')
  // The viewer moves through what the filter shows.
  const shown = filter === 'todos' ? items : items.filter((i) => i.kind === filter)

  const openKey = params.get('ver')
  const found = openKey ? shown.findIndex((i) => i.key === openKey) : -1
  const viewer = found >= 0 ? found : null
  const show = (index: number | null) =>
    setParams(index === null ? {} : { ver: shown[index].key }, { replace: true })

  return (
    <div className="min-h-screen bg-cream">
      <Navbar page="galeria" />

      <main className="relative overflow-hidden pb-24 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <div
          className="pointer-events-none absolute -left-40 top-0 size-[40rem] rounded-full bg-gold/20 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <Link
            to="/#galeria"
            className="group inline-flex items-center gap-1.5 font-subtitle text-sm text-muted-dark transition-colors hover:text-gold-ink"
          >
            <i
              className="bx bx-left-arrow-alt text-lg transition-transform duration-300 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            Voltar ao início
          </Link>

          <header className="mt-6 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Portfólio</p>
              <h1 className="mt-2 font-logo text-5xl text-onyx sm:text-6xl">
                O nosso <span className="text-gold-ink">trabalho</span>
              </h1>
              <p className="mt-5 max-w-xl font-subtitle text-base font-light leading-relaxed text-muted-dark">
                Cada trança é feita à mão, no nosso espaço, com tempo e cuidado com o teu cabelo. Toca numa foto para a
                veres em ecrã inteiro.
              </p>
            </div>
            <div className="flex flex-col gap-4 md:items-end">
              <PortfolioCounts photos={photoCount} videos={videoCount} />
              <a
                href={instagramDmUrl()}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 font-subtitle text-sm text-muted-dark transition-colors hover:text-gold-ink"
              >
                <i className="bx bxl-instagram text-lg" aria-hidden="true" />
                Trabalhos novos em @{siteConfig.instagramHandle}
                <i
                  className="bx bx-right-arrow-alt transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>
          </header>

          {hasBoth && <PortfolioFilters value={filter} onChange={setFilter} className="mt-10" />}

          {/* Mosaic: columns fill top to bottom, each piece keeps its own height. */}
          <div className={`columns-2 gap-3 md:columns-3 md:gap-4 ${hasBoth ? 'mt-6' : 'mt-12'}`}>
            {shown.map((item, i) => (
              <PortfolioTile
                key={item.key}
                item={item}
                index={i}
                shape={SHAPES[i % SHAPES.length]}
                onOpen={() => show(i)}
              />
            ))}
            <InstagramCard />
          </div>

          <div className="mt-16 flex flex-col items-center gap-4 border-t border-gold/25 pt-12 text-center sm:flex-row sm:justify-center sm:gap-6">
            <p className="font-logo text-2xl text-onyx sm:text-3xl">Encontraste o teu próximo estilo?</p>
            <MotionButton label="Agendar" onClick={() => navigate('/agendar')} />
          </div>
        </div>
      </main>

      <Footer />

      <PortfolioViewer items={shown} index={viewer} onIndex={show} onClose={() => show(null)} />
    </div>
  )
}
