import { useNavigate } from 'react-router-dom'
import { PortfolioTile } from '@/components/portfolio/PortfolioParts'
import { MotionButton } from '@/components/ui/motion-button'
import { usePortfolio } from '@/lib/portfolio'
import { instagramDmUrl, siteConfig } from '@/lib/site-config'

/**
 * The studio's work on the home page: one piece large, the next ones around it. Everything opens on the
 * portfolio page (/portfolio), the place for the full work and the full-screen viewer.
 */
export default function Gallery() {
  const navigate = useNavigate()
  const { items, loaded } = usePortfolio()
  // The large piece plus full rows around it: 1 + 8 fills three rows on wide screens, 1 + 4 fills two.
  const preview = items.slice(0, items.length >= 9 ? 9 : items.length >= 5 ? 5 : items.length)
  const open = (key: string) => navigate(`/portfolio?ver=${encodeURIComponent(key)}`)

  return (
    <section id="galeria" className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-logo text-4xl sm:text-5xl">O nosso trabalho</h2>
            <p className="mt-4 font-subtitle text-base font-light leading-relaxed text-muted-dark">
              Knotless, box braids, boho e mais. Algumas das tranças feitas no nosso espaço.
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-5">
              <span className="font-subtitle text-sm text-muted-dark">
                {items.length} {items.length === 1 ? 'trabalho' : 'trabalhos'}
              </span>
              <MotionButton label="Ver todos" onClick={() => navigate('/portfolio')} />
            </div>
          )}
        </div>

        {/* Until the first photos are added in the admin app. */}
        {loaded && items.length === 0 && (
          <p className="mt-12 rounded-xl border border-dashed border-onyx/20 px-6 py-14 text-center font-subtitle text-sm text-muted-dark">
            As primeiras fotos chegam em breve.
          </p>
        )}

        {/* The first piece takes two columns and two rows; the rest fill the grid around it. */}
        <div className="mt-12 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          {preview.map((item, i) => (
            <PortfolioTile
              key={item.key}
              item={item}
              index={i}
              onOpen={() => open(item.key)}
              className={i === 0 ? 'col-span-2 aspect-square md:row-span-2 md:aspect-auto md:h-full' : 'aspect-[4/5]'}
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
