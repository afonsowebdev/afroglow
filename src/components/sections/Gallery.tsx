import { Link, useNavigate } from 'react-router-dom'
import { PortfolioTile } from '@/components/portfolio/PortfolioParts'
import { usePortfolio } from '@/lib/portfolio'
import { instagramDmUrl, siteConfig } from '@/lib/site-config'

/**
 * The studio's work on the home page: a few pieces in a plain grid. Everything opens on the portfolio page
 * (/portfolio), the place for the full work and the full-screen viewer.
 */
export default function Gallery() {
  const navigate = useNavigate()
  const { items } = usePortfolio()
  // Full rows only: two per row on phones, four on wide screens.
  const preview = items.slice(0, items.length >= 8 ? 8 : items.length >= 4 ? 4 : items.length)

  return (
    <section id="galeria" className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h2 className="font-logo text-4xl sm:text-5xl">O nosso trabalho</h2>
            <p className="mt-3 font-subtitle text-base font-light text-muted-dark">Algumas das tranças que fizemos.</p>
          </div>
          <Link
            to="/portfolio"
            className="group inline-flex items-center gap-1 font-subtitle text-sm font-medium text-onyx underline-offset-4 hover:underline"
          >
            Ver todos ({items.length})
            <i
              className="bx bx-right-arrow-alt text-lg transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          {preview.map((item, i) => (
            <PortfolioTile
              key={item.key}
              item={item}
              index={i}
              // Opens on the portfolio page, already showing this piece.
              onOpen={() => navigate(`/portfolio?ver=${encodeURIComponent(item.key)}`)}
            />
          ))}
        </div>

        <p className="mt-6 font-subtitle text-sm text-muted-dark">
          Mais trabalhos no Instagram:{' '}
          <a
            href={instagramDmUrl()}
            target="_blank"
            rel="noreferrer"
            className="text-onyx underline-offset-4 hover:underline"
          >
            @{siteConfig.instagramHandle}
          </a>
        </p>
      </div>
    </section>
  )
}
