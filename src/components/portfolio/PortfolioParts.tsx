import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'
import type { PortfolioFilter, WorkItem } from '@/lib/portfolio'
import { instagramDmUrl, siteConfig } from '@/lib/site-config'

/*
 * The pieces of the portfolio, shared by the home page preview (Gallery) and the portfolio page: a mosaic tile,
 * the Instagram card, the filters, the counts and the full-screen viewer.
 */

const FILTERS: Array<{ id: PortfolioFilter; label: string }> = [
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

/** One piece of the mosaic; `shape` is its aspect-ratio class. */
export function PortfolioTile({
  item,
  index,
  shape,
  onOpen,
}: {
  item: WorkItem
  index: number
  shape: string
  onOpen: () => void
}) {
  const video = item.kind === 'VIDEO'
  return (
    <motion.button
      type="button"
      aria-label={`Ver ${video ? 'vídeo' : 'foto'} ${index + 1} em ecrã inteiro`}
      onClick={onOpen}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-3xl bg-black/5 shadow-sm shadow-black/5 ring-1 ring-black/5 transition-shadow duration-500 hover:shadow-xl hover:shadow-gold-deep/20 md:mb-4 ${shape}`}
    >
      {video ? (
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
      {video && (
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 font-subtitle text-[11px] font-medium text-[#ffffff] backdrop-blur-md">
          <i className="bx bx-play text-sm" aria-hidden="true" />
          Vídeo
        </span>
      )}
      {/* Phones: a small corner icon; wide screens: "Ver" in the middle on hover. */}
      <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-[#ffffff] backdrop-blur-md md:hidden">
        <i className={video ? 'bx bx-play' : 'bx bx-expand-alt'} aria-hidden="true" />
      </span>
      <span className="pointer-events-none absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
        <span className="flex translate-y-2 items-center gap-1.5 rounded-full bg-[#ffffff]/90 px-4 py-2 font-subtitle text-sm font-medium text-[#1a1008] shadow-lg backdrop-blur-md transition-transform duration-300 group-hover:translate-y-0">
          <i className={video ? 'bx bx-play text-base' : 'bx bx-expand-alt text-base'} aria-hidden="true" />
          {video ? 'Ver vídeo' : 'Ver'}
        </span>
      </span>
    </motion.button>
  )
}

/** The last piece of a mosaic: the newest work on Instagram. */
export function InstagramCard() {
  return (
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
  )
}

/** "15 Fotos | 3 Vídeos" in large figures. */
export function PortfolioCounts({ photos, videos, className = '' }: { photos: number; videos: number; className?: string }) {
  const stats = [
    { value: photos, label: photos === 1 ? 'Foto' : 'Fotos' },
    ...(videos ? [{ value: videos, label: videos === 1 ? 'Vídeo' : 'Vídeos' }] : []),
  ]
  return (
    <dl className={`flex divide-x divide-gold/30 ${className}`}>
      {stats.map((stat) => (
        // Label first in the markup, shown under the number.
        <div key={stat.label} className="flex flex-col-reverse px-6 first:pl-0 last:pr-0">
          <dt className="mt-1 font-subtitle text-[11px] font-medium uppercase tracking-[0.16em] text-muted-dark">
            {stat.label}
          </dt>
          <dd className="font-logo text-4xl leading-none text-onyx">{stat.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Tudo / Fotos / Vídeos. */
export function PortfolioFilters({
  value,
  onChange,
  className = '',
}: {
  value: PortfolioFilter
  onChange: (filter: PortfolioFilter) => void
  className?: string
}) {
  return (
    <div className={`flex gap-2 ${className}`} role="tablist" aria-label="Mostrar">
      {FILTERS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`rounded-full px-4 py-2 font-subtitle text-sm transition-colors ${
            value === id
              ? 'bg-onyx text-[#ffffff] dark:bg-gold-deep'
              : 'border-[1.5px] border-onyx/15 bg-white text-onyx/70 hover:text-onyx'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Full screen over the page: swipe, arrows or keys to move, a thumbnail strip to jump, Esc or a click around the
 * piece to close. `index` is the piece on screen, or null when closed.
 */
export function PortfolioViewer({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: WorkItem[]
  index: number | null
  onIndex: (index: number) => void
  onClose: () => void
}) {
  const strip = useRef<HTMLDivElement>(null)
  const thumbs = useRef<HTMLDivElement>(null)
  const total = items.length

  const goTo = useCallback(
    (i: number) => {
      const next = (i + total) % total
      onIndex(next)
      const el = strip.current
      if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    },
    [total, onIndex],
  )

  // Opens already on the chosen piece; later moves scroll the strip themselves.
  useEffect(() => {
    if (index === null) return
    const el = strip.current
    if (el) el.scrollTo({ left: index * el.clientWidth })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index === null])

  // The thumbnail of the piece on screen stays in view as the viewer moves.
  useEffect(() => {
    if (index === null) return
    thumbs.current?.children[index]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [index])

  useEffect(() => {
    if (index === null) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goTo(index + 1)
      if (e.key === 'ArrowLeft') goTo(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [index, goTo, onClose])

  return (
    <AnimatePresence>
      {index !== null && (
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
            ref={strip}
            onScroll={(e) => {
              const i = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)
              if (i !== index) onIndex(i)
            }}
            className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, i) => (
              <div
                key={item.key}
                // A click on the dark area around the piece closes the viewer.
                onClick={(e) => e.target === e.currentTarget && onClose()}
                className="flex h-full w-full shrink-0 snap-center items-center justify-center px-4 pb-28 pt-20 md:px-24 md:pb-32"
              >
                {item.kind === 'VIDEO' ? (
                  // Only the videos next to the one on screen are mounted, so one plays at a time.
                  Math.abs(i - index) <= 1 ? (
                    <video
                      src={item.src}
                      controls
                      playsInline
                      autoPlay={i === index}
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
            onClick={onClose}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-[#ffffff]/20 text-2xl text-[#ffffff] backdrop-blur-md transition-colors hover:bg-[#ffffff]/30"
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => goTo(index - 1)}
                className="absolute left-5 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff]/20 text-3xl text-[#ffffff] backdrop-blur-md transition-colors hover:bg-[#ffffff]/30 md:flex"
              >
                <i className="bx bx-chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Seguinte"
                onClick={() => goTo(index + 1)}
                className="absolute right-5 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffff]/20 text-3xl text-[#ffffff] backdrop-blur-md transition-colors hover:bg-[#ffffff]/30 md:flex"
              >
                <i className="bx bx-chevron-right" aria-hidden="true" />
              </button>
            </>
          )}
          <p className="pointer-events-none absolute left-5 top-[calc(1.6rem+env(safe-area-inset-top))] font-subtitle text-sm tabular-nums text-[#ffffff]/80">
            {index + 1} / {total}
          </p>

          {/* Every piece as a thumbnail, to jump straight to one. */}
          {total > 1 && (
            <div className="absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex justify-center px-4">
              <div
                ref={thumbs}
                className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-[#ffffff]/10 p-2 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {items.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={`Ir para ${item.kind === 'VIDEO' ? 'vídeo' : 'foto'} ${i + 1}`}
                    aria-current={i === index || undefined}
                    onClick={() => goTo(i)}
                    className={`relative size-12 shrink-0 overflow-hidden rounded-xl transition-all duration-300 sm:size-14 ${
                      i === index ? 'opacity-100 ring-2 ring-[#ffffff]' : 'opacity-45 hover:opacity-80'
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
  )
}
