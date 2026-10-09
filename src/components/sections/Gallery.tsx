import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { api, assetUrl } from '@/lib/api'
import { instagramDmUrl, siteConfig } from '@/lib/site-config'

interface WorkItem {
  key: string
  kind: 'IMAGE' | 'VIDEO'
  src: string
  alt: string
}

// Shown until the studio adds its own photos and videos in the admin app (Portfólio), as in the customer app.
const SAMPLE_WORK: WorkItem[] = [
  { src: '/images/hero/hero-1.jpg', alt: 'Knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-2.jpg', alt: 'Detalhe de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-3.jpg', alt: 'Vista lateral de knotless braids com pontas cacheadas' },
  { src: '/images/hero/hero-4.jpg', alt: 'Padrão de repartição triangular em knotless braids' },
  { src: '/images/hero/hero-5.jpg', alt: 'Detalhe do couro cabeludo com repartição triangular' },
].map((photo) => ({ key: photo.src, kind: 'IMAGE', ...photo }))

// How many pieces show before "Ver mais": a large one and a few around it.
const FIRST_BATCH = 8

/** Plays a muted looping video only while it is on screen. */
function AutoVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <video ref={ref} src={src} muted loop playsInline preload="metadata" className={className} />
}

/**
 * The studio's work, in the customer app's pattern: its photos and videos from the admin app, a mosaic on wide
 * screens and a swipeable strip on phones, and a full-screen viewer (arrows, keyboard and swipe).
 */
export default function Gallery() {
  const [items, setItems] = useState<WorkItem[]>(SAMPLE_WORK)
  const [showAll, setShowAll] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  const viewerStrip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api
      .get<Array<{ id: string; kind: 'IMAGE' | 'VIDEO' }>>('/portfolio')
      .then((list) => {
        if (list.length > 0) {
          setItems(
            list.map((item) => ({
              key: item.id,
              kind: item.kind,
              src: assetUrl(`/portfolio/${item.id}/file`),
              alt: item.kind === 'VIDEO' ? 'Vídeo do nosso trabalho' : 'Foto do nosso trabalho',
            })),
          )
        }
      })
      .catch(() => {})
  }, [])

  const total = items.length
  const visible = showAll ? items : items.slice(0, FIRST_BATCH)

  const goTo = useCallback(
    (i: number) => {
      const next = (i + total) % total
      setViewer(next)
      const el = viewerStrip.current
      if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    },
    [total],
  )

  // Opens the viewer already on the clicked piece; keys move through it and Esc closes it.
  useEffect(() => {
    if (viewer === null) return
    const el = viewerStrip.current
    if (el) el.scrollTo({ left: viewer * el.clientWidth })
    // Only on opening: later moves scroll the strip themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer === null])

  useEffect(() => {
    if (viewer === null) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null)
      if (e.key === 'ArrowRight') goTo(viewer + 1)
      if (e.key === 'ArrowLeft') goTo(viewer - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [viewer, goTo])

  return (
    <section id="galeria" className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 text-center sm:px-8">
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Portfólio</p>
        <h2 className="mt-2 font-logo text-4xl sm:text-5xl">O nosso trabalho</h2>
        <p className="mt-4 font-subtitle text-sm font-light text-muted-dark">
          <span className="md:hidden">Desliza e toca para ver em ecrã inteiro.</span>
          <span className="hidden md:inline">Clica numa foto para a ver em ecrã inteiro.</span>
        </p>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:px-8 md:grid md:auto-rows-[220px] md:grid-cols-3 md:gap-4 md:overflow-visible lg:auto-rows-[260px] [&::-webkit-scrollbar]:hidden">
        {visible.map((item, i) => (
          <motion.button
            key={item.key}
            type="button"
            aria-label={`Ver ${item.kind === 'VIDEO' ? 'vídeo' : 'foto'} ${i + 1} em ecrã inteiro`}
            onClick={() => setViewer(i)}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.06, ease: 'easeOut' }}
            className={`group relative aspect-[4/5] w-[80%] shrink-0 snap-center overflow-hidden rounded-[2rem] bg-black/5 md:aspect-auto md:w-auto ${
              i === 0 ? 'md:col-span-2 md:row-span-2' : ''
            }`}
          >
            {item.kind === 'VIDEO' ? (
              <AutoVideo src={item.src} className="h-full w-full object-cover" />
            ) : (
              <img
                src={item.src}
                alt={item.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-[#ffffff] backdrop-blur-md">
              <i className={item.kind === 'VIDEO' ? 'bx bx-play' : 'bx bx-expand-alt'} aria-hidden="true" />
            </span>
          </motion.button>
        ))}

        {/* The last tile points to the videos on Instagram, as in the app. */}
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex aspect-[4/5] w-[80%] shrink-0 snap-center flex-col items-center justify-center gap-3 rounded-[2rem] border-[1.5px] border-onyx/25 bg-white text-center transition-colors duration-300 hover:border-gold-deep md:aspect-auto md:w-auto"
        >
          <i className="bx bxl-instagram text-5xl text-onyx" aria-hidden="true" />
          <span className="font-subtitle text-base font-semibold text-onyx">Mais no Instagram</span>
          <span className="font-subtitle text-sm text-muted-dark">@{siteConfig.instagramHandle}</span>
        </a>
      </div>

      {total > FIRST_BATCH && (
        <div className="mt-12 flex justify-center">
          <MotionButton
            label={showAll ? 'Ver menos' : `Ver tudo (${total})`}
            variant="secondary"
            onClick={() => setShowAll((v) => !v)}
          />
        </div>
      )}

      <AnimatePresence>
        {viewer !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Em ecrã inteiro"
            className="fixed inset-0 z-[80] bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              ref={viewerStrip}
              onScroll={(e) => {
                const i = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)
                if (i !== viewer) setViewer(i)
              }}
              className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item, i) => (
                <div key={item.key} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4 md:p-16">
                  {item.kind === 'VIDEO' ? (
                    // Only the videos next to the one on screen are mounted, so one plays at a time.
                    Math.abs(i - viewer) <= 1 ? (
                      <video
                        src={item.src}
                        controls
                        playsInline
                        autoPlay={i === viewer}
                        loop
                        className="max-h-full max-w-full rounded-2xl"
                      />
                    ) : null
                  ) : (
                    <img src={item.src} alt={item.alt} className="max-h-full max-w-full rounded-2xl object-contain" />
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setViewer(null)}
              className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-[#ffffff]/20 text-2xl text-[#ffffff] backdrop-blur-md transition-colors hover:bg-[#ffffff]/30"
            >
              <i className="bx bx-x" aria-hidden="true" />
            </button>
            {total > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Anterior"
                  onClick={() => goTo(viewer - 1)}
                  className="absolute left-5 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff]/20 text-3xl text-[#ffffff] backdrop-blur-md transition-colors hover:bg-[#ffffff]/30 md:flex"
                >
                  <i className="bx bx-chevron-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Seguinte"
                  onClick={() => goTo(viewer + 1)}
                  className="absolute right-5 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff]/20 text-3xl text-[#ffffff] backdrop-blur-md transition-colors hover:bg-[#ffffff]/30 md:flex"
                >
                  <i className="bx bx-chevron-right" aria-hidden="true" />
                </button>
              </>
            )}
            <p className="pointer-events-none absolute inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] text-center font-subtitle text-sm text-[#ffffff]/80">
              {viewer + 1} / {total}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
