import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MotionButton } from '@/components/ui/motion-button'
import { VelocityRow } from '@/components/ui/velocity-marquee'
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

// How many pieces show before "Ver tudo": with the Instagram card, three per column of the mosaic.
const FIRST_BATCH = 8

// Heights alternate down the mosaic so it never reads as a plain grid. Picked so that eight pieces plus the
// Instagram card (4/5) end level: every column of three adds up to the same height.
const SHAPES = [
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-square',
]

type Filter = 'todos' | 'IMAGE' | 'VIDEO'
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'todos', label: 'Tudo' },
  { id: 'IMAGE', label: 'Fotos' },
  { id: 'VIDEO', label: 'Vídeos' },
]

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
 * The studio's work: its photos and videos from the admin app in a mosaic (two columns on phones, three on wide
 * screens), filters once there are both photos and videos, and a full-screen viewer (arrows, keyboard and swipe).
 */
export default function Gallery() {
  const [items, setItems] = useState<WorkItem[]>(SAMPLE_WORK)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState<Filter>('todos')
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

  const hasBoth = items.some((i) => i.kind === 'VIDEO') && items.some((i) => i.kind === 'IMAGE')
  // The viewer moves through what is shown by the filter.
  const shown = filter === 'todos' ? items : items.filter((i) => i.kind === filter)
  const total = shown.length
  const visible = showAll ? shown : shown.slice(0, FIRST_BATCH)
  const photoCount = items.filter((i) => i.kind === 'IMAGE').length
  const videoCount = items.length - photoCount
  const countLabel = [
    photoCount ? `${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'}` : '',
    videoCount ? `${videoCount} ${videoCount === 1 ? 'vídeo' : 'vídeos'}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

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
    <section id="galeria" className="relative overflow-hidden bg-white pb-40 pt-24 md:pb-56 md:pt-32">
      {/* AFROGLOW sliding behind the section: gold outline behind the title (right to left), soft fill under
          the work (left to right). Both speed up while the page scrolls. */}
      <VelocityRow direction={1} outline className="absolute inset-x-0 top-6 md:top-10" />
      <VelocityRow direction={-1} className="absolute inset-x-0 bottom-2 md:bottom-4" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 text-center sm:px-8 md:flex-row md:items-end md:justify-between md:text-left">
        <div>
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Portfólio</p>
          <h2 className="mt-2 font-logo text-4xl sm:text-5xl">O nosso trabalho</h2>
          <p className="mt-4 max-w-md font-subtitle text-sm font-light leading-relaxed text-muted-dark">
            Tranças feitas no nosso espaço. Toca numa foto para a veres em ecrã inteiro.
          </p>
        </div>
        <p className="rounded-full bg-white/70 px-4 py-2 font-subtitle text-xs font-medium uppercase tracking-[0.16em] text-muted-dark">
          {countLabel}
        </p>
      </div>

      {hasBoth && (
        <div className="relative mx-auto mt-10 flex max-w-6xl justify-center gap-2 px-5 sm:px-8 md:justify-start" role="tablist" aria-label="Mostrar">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => {
                setFilter(id)
                setShowAll(false)
              }}
              className={`rounded-full px-4 py-2 font-subtitle text-sm transition-colors ${
                filter === id
                  ? 'bg-onyx text-[#ffffff] dark:bg-gold-deep'
                  : 'border-[1.5px] border-onyx/15 bg-white text-onyx/70 hover:text-onyx'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Mosaic: columns fill top to bottom, each piece keeps its own height. */}
      <div className={`relative mx-auto max-w-6xl columns-2 gap-3 px-5 sm:px-8 md:columns-3 md:gap-4 ${hasBoth ? 'mt-6' : 'mt-12'}`}>
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
            className={`group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-3xl bg-black/5 md:mb-4 ${
              SHAPES[i % SHAPES.length]
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
            <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-[#ffffff] opacity-100 backdrop-blur-md transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
              <i className={item.kind === 'VIDEO' ? 'bx bx-play' : 'bx bx-expand-alt'} aria-hidden="true" />
            </span>
          </motion.button>
        ))}

        {/* The last piece of the mosaic points to the newest work on Instagram. */}
        <a
          href={instagramDmUrl()}
          target="_blank"
          rel="noreferrer"
          className="group mb-3 flex aspect-[4/5] w-full break-inside-avoid flex-col items-center justify-center gap-3 rounded-3xl border-[1.5px] border-gold/30 bg-white px-4 text-center transition-colors duration-300 hover:border-gold-deep md:mb-4"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-gold-deep/10 text-3xl text-gold-ink transition-colors duration-300 group-hover:bg-gold-deep group-hover:text-cream">
            <i className="bx bxl-instagram" aria-hidden="true" />
          </span>
          <span className="font-logo text-xl text-onyx sm:text-2xl">Mais no Instagram</span>
          <span className="font-subtitle text-xs text-muted-dark sm:text-sm">
            Vídeos e trabalhos recentes em @{siteConfig.instagramHandle}
          </span>
        </a>
      </div>

      {total > FIRST_BATCH && (
        <div className="relative mt-10 flex justify-center">
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
              {shown.map((item, i) => (
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
