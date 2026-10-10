import { useNavigate } from 'react-router-dom'
import { InstagramCard, PortfolioCounts, PortfolioTile } from '@/components/portfolio/PortfolioParts'
import { MotionButton } from '@/components/ui/motion-button'
import { usePortfolio } from '@/lib/portfolio'
import { instagramDmUrl, siteConfig } from '@/lib/site-config'

// How many pieces the home page previews: with the Instagram card, four per column of the mosaic.
const PREVIEW = 7

// Heights alternate down the mosaic so it never reads as a plain grid. Picked so that seven pieces plus the
// Instagram card (4/5) end level in two columns: each column of four adds up to the same height.
const SHAPES = [
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-square',
  'aspect-square',
]

/**
 * The studio's work on the home page: an introduction beside a preview of the mosaic. Everything opens on the
 * portfolio page (/portfolio), the place for the full work and the full-screen viewer.
 */
export default function Gallery() {
  const navigate = useNavigate()
  const { items, photoCount, videoCount } = usePortfolio()
  const preview = items.slice(0, PREVIEW)

  return (
    <section id="galeria" className="relative overflow-hidden bg-cream py-24 md:py-32">
      {/* A soft gold glow behind the introduction, so the cream has some depth. */}
      <div
        className="pointer-events-none absolute -left-40 top-10 size-[36rem] rounded-full bg-gold/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {/* The introduction stays beside the work while it scrolls past. */}
        <div className="text-center lg:sticky lg:top-28 lg:self-start lg:text-left">
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Portfólio</p>
          <h2 className="mt-2 font-logo text-4xl sm:text-5xl lg:text-6xl">
            O nosso <span className="text-gold-ink">trabalho</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md font-subtitle text-base font-light leading-relaxed text-muted-dark lg:mx-0">
            Cada trança é feita à mão, no nosso espaço, com tempo e cuidado com o teu cabelo. Toca numa foto para a
            abrires no portfólio.
          </p>

          <PortfolioCounts
            photos={photoCount}
            videos={videoCount}
            className="mx-auto mt-8 max-w-xs justify-center lg:mx-0 lg:justify-start"
          />

          <a
            href={instagramDmUrl()}
            target="_blank"
            rel="noreferrer"
            className="group mt-6 inline-flex items-center gap-2 font-subtitle text-sm text-muted-dark transition-colors hover:text-gold-ink"
          >
            <i className="bx bxl-instagram text-lg" aria-hidden="true" />
            Trabalhos novos em @{siteConfig.instagramHandle}
            <i
              className="bx bx-right-arrow-alt transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </a>

          <div className="mt-8 flex justify-center lg:justify-start">
            <MotionButton label={`Ver portfólio completo (${items.length})`} onClick={() => navigate('/portfolio')} />
          </div>

          {/* Wide screens: the way to book sits with the introduction; phones get it after the work. */}
          <div className="mt-10 hidden border-t border-gold/25 pt-8 lg:block">
            <p className="font-logo text-2xl text-onyx">Encontraste o teu próximo estilo?</p>
            <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">
              Marca a tua sessão e mostra-nos a foto que te inspirou.
            </p>
            <MotionButton label="Agendar" className="mt-5" onClick={() => navigate('/agendar')} />
          </div>
        </div>

        <div>
          {/* Mosaic: columns fill top to bottom, each piece keeps its own height. */}
          <div className="columns-2 gap-3 md:gap-4">
            {preview.map((item, i) => (
              <PortfolioTile
                key={item.key}
                item={item}
                index={i}
                shape={SHAPES[i % SHAPES.length]}
                // Opens on the portfolio page, already showing this piece.
                onOpen={() => navigate(`/portfolio?ver=${encodeURIComponent(item.key)}`)}
              />
            ))}
            <InstagramCard />
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 text-center lg:hidden">
            <p className="font-logo text-2xl text-onyx sm:text-3xl">Encontraste o teu próximo estilo?</p>
            <MotionButton label="Agendar" onClick={() => navigate('/agendar')} />
          </div>
        </div>
      </div>
    </section>
  )
}
