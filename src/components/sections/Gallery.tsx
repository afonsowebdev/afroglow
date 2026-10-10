import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

// How many pieces show before "Ver tudo": with the Instagram card, four per column of the mosaic.
const FIRST_BATCH = 7

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
  const thumbStrip = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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

  // The thumbnail of the piece on screen stays in view as the viewer moves.
  useEffect(() => {
    if (viewer === null) return
    thumbStrip.current?.children[viewer]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [viewer])

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
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {/* The introduction stays beside the work while it scrolls past. */}
        <div className="text-center lg:sticky lg:top-28 lg:self-start lg:text-left">
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-muted-dark">Portfólio</p>
          <h2 className="mt-2 font-logo text-4xl sm:text-5xl lg:text-6xl">O nosso trabalho</h2>
          <p className="mx-auto mt-5 max-w-md font-subtitle text-base font-light leading-relaxed text-muted-dark lg:mx-0">
            Cada trança é feita à mão, no nosso espaço, com tempo e cuidado com o teu cabelo. Toca numa foto para a
            veres em ecrã inteiro.
          </p>

          <dl className="mx-auto mt-8 flex max-w-xs justify-center divide-x divide-gold/30 lg:mx-0 lg:justify-start">
            {[
              { value: photoCount, label: photoCount === 1 ? 'Foto' : 'Fotos' },
              ...(videoCount ? [{ value: videoCount, label: videoCount === 1 ? 'Vídeo' : 'Vídeos' }] : []),
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse px-6 first:pl-0 last:pr-0">
                <dt className="mt-1 font-subtitle text-[11px] font-medium uppercase tracking-[0.16em] text-muted-dark">
                  {stat.label}
                </dt>
                <dd className="font-logo text-4xl leading-none text-onyx">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {hasBoth && (
            <div className="mt-8 flex justify-center gap-2 lg:justify-start" role="tablist" aria-label="Mostrar">
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
            {visible.map((item, i) => (
              <motion.button
                key={item.key}
                type="button"
                aria-label={`Ver ${item.kind === 'VIDEO' ? 'vídeo' : 'foto'} ${i + 1} em ecrã inteiro`}
                onClick={() => setViewer(i)}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
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
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                {item.kind === 'VIDEO' && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 font-subtitle text-[11px] font-medium text-[#ffffff] backdrop-blur-md">
                    <i className="bx bx-play text-sm" aria-hidden="true" />
                    Vídeo
                  </span>
                )}
                {/* Phones: a small corner icon; wide screens: "Ver" in the middle on hover. */}
                <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-[#ffffff] backdrop-blur-md md:hidden">
                  <i className={item.kind === 'VIDEO' ? 'bx bx-play' : 'bx bx-expand-alt'} aria-hidden="true" />
                </span>
                <span className="pointer-events-none absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
                  <span className="flex translate-y-2 items-center gap-1.5 rounded-full bg-[#ffffff]/90 px-4 py-2 font-subtitle text-sm font-medium text-[#1a1008] shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:translate-y-0">
                    <i className={item.kind === 'VIDEO' ? 'bx bx-play text-base' : 'bx bx-expand-alt text-base'} aria-hidden="true" />
                    {item.kind === 'VIDEO' ? 'Ver vídeo' : 'Ver'}
                  </span>
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
            <div className="mt-8 flex justify-center">
              <MotionButton
                label={showAll ? 'Ver menos' : `Ver tudo (${total})`}
                variant="secondary"
                onClick={() => setShowAll((v) => !v)}
              />
            </div>
          )}

          <div className="mt-12 flex flex-col items-center gap-4 text-center lg:hidden">
            <p className="font-logo text-2xl text-onyx sm:text-3xl">Encontraste o teu próximo estilo?</p>
            <MotionButton label="Agendar" onClick={() => navigate('/agendar')} />
          </div>
        </div>
      </div>

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
                <div
                  key={item.key}
                  // A click on the dark area around the piece closes the viewer.
                  onClick={(e) => e.target === e.currentTarget && setViewer(null)}
                  className="flex h-full w-full shrink-0 snap-center items-center justify-center px-4 pb-28 pt-20 md:px-24 md:pb-32"
                >
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
            <p className="pointer-events-none absolute left-5 top-[calc(1.6rem+env(safe-area-inset-top))] font-subtitle text-sm tabular-nums text-[#ffffff]/80">
              {viewer + 1} / {total}
            </p>

            {/* Every piece as a thumbnail, to jump straight to one. */}
            {total > 1 && (
              <div className="absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex justify-center px-4">
                <div
                  ref={thumbStrip}
                  className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-[#ffffff]/10 p-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {shown.map((item, i) => (
                    <button
                      key={item.key}
                      type="button"
                      aria-label={`Ir para ${item.kind === 'VIDEO' ? 'vídeo' : 'foto'} ${i + 1}`}
                      aria-current={i === viewer || undefined}
                      onClick={() => goTo(i)}
                      className={`relative size-12 shrink-0 overflow-hidden rounded-xl transition-all duration-300 sm:size-14 ${
                        i === viewer ? 'opacity-100 ring-2 ring-[#ffffff]' : 'opacity-45 hover:opacity-80'
                      }`}
                    >
                      {item.kind === 'VIDEO' ? (
                        <>
                          <video src={`${item.src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
                          <i className="bx bx-play absolute inset-0 m-auto size-fit text-xl text-[#ffffff]" aria-hidden="true" />
                        </>
                      ) : (
                        <img src={item.src} alt="" loading="lazy" className="size-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
