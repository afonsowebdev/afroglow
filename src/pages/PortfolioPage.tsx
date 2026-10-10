import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Footer from '@/components/layout/Footer'
import Navbar from '@/components/layout/Navbar'
import { PortfolioFilters, PortfolioTile, PortfolioViewer } from '@/components/portfolio/PortfolioParts'
import { usePageTitle } from '@/lib/page-title'
import { usePortfolio, type PortfolioFilter } from '@/lib/portfolio'
import { instagramDmUrl, siteConfig } from '@/lib/site-config'

/**
 * The portfolio's own page: all the work in a grid, with filters, and the place where pieces open full screen.
 * The piece on screen is kept in the address (?ver=…), so the home page can open one directly and a link to a
 * single photo can be shared.
 */
export default function PortfolioPage() {
  usePageTitle('Portfólio')
  const [params, setParams] = useSearchParams()
  const { items, loaded, photoCount, videoCount, hasBoth } = usePortfolio()
  const [filter, setFilter] = useState<PortfolioFilter>('todos')
  // The viewer moves through what the filter shows.
  const shown = filter === 'todos' ? items : items.filter((i) => i.kind === filter)

  const openKey = params.get('ver')
  const found = openKey ? shown.findIndex((i) => i.key === openKey) : -1
  const viewer = found >= 0 ? found : null
  const show = (index: number | null) =>
    setParams(index === null ? {} : { ver: shown[index].key }, { replace: true })

  const count = [
    photoCount ? `${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}` : '',
    videoCount ? `${videoCount} ${videoCount === 1 ? 'vídeo' : 'vídeos'}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-h-screen bg-cream">
      <Navbar page="galeria" />

      <main className="pb-24 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Link
            to="/#galeria"
            className="inline-flex items-center gap-1 font-subtitle text-sm text-muted-dark transition-colors hover:text-onyx"
          >
            <i className="bx bx-left-arrow-alt text-lg" aria-hidden="true" />
            Início
          </Link>

          <h1 className="mt-4 font-logo text-5xl text-onyx sm:text-6xl">O nosso trabalho</h1>
          <p className="mt-3 font-subtitle text-base font-light text-muted-dark">
            {count ? `${count}. ` : ''}Mais no Instagram:{' '}
            <a
              href={instagramDmUrl()}
              target="_blank"
              rel="noreferrer"
              className="text-onyx underline-offset-4 hover:underline"
            >
              @{siteConfig.instagramHandle}
            </a>
          </p>

          {loaded && items.length === 0 && (
            <p className="mt-10 rounded-xl border border-dashed border-onyx/20 px-6 py-14 text-center font-subtitle text-sm text-muted-dark">
              As primeiras fotos chegam em breve.
            </p>
          )}

          {hasBoth && <PortfolioFilters value={filter} onChange={setFilter} className="mt-10" />}

          <div className={`grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 ${hasBoth ? 'mt-6' : 'mt-10'}`}>
            {shown.map((item, i) => (
              <PortfolioTile key={item.key} item={item} index={i} onOpen={() => show(i)} />
            ))}
          </div>
        </div>
      </main>

      <Footer />

      <PortfolioViewer items={shown} index={viewer} onIndex={show} onClose={() => show(null)} />
    </div>
  )
}
