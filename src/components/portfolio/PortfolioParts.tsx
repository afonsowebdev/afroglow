import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef } from 'react'
import type { PortfolioFilter, WorkItem } from '@/lib/portfolio'

/*
 * The pieces of the portfolio, shared by the home page preview (Gallery) and the portfolio page: a grid tile, the
 * filters and the full-screen viewer.
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

/** One photo or video of the grid; opens it on click. */
export function PortfolioTile({ item, index, onOpen }: { item: WorkItem; index: number; onOpen: () => void }) {
  const video = item.kind === 'VIDEO'
  return (
    <button
      type="button"
      aria-label={`Ver ${video ? 'vídeo' : 'foto'} ${index + 1} em ecrã inteiro`}
      onClick={onOpen}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-black/5"
    >
      {video ? (
        <AutoVideo src={item.src} className="h-full w-full object-cover" />
      ) : (
        <img
          src={item.src}
          alt={item.alt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      )}
      {video && (
        <i
          className="bx bx-play absolute right-2.5 top-2.5 text-2xl text-[#ffffff] [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.5))]"
          aria-hidden="true"
        />
      )}
    </button>
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
    <div className={`flex gap-6 ${className}`} role="tablist" aria-label="Mostrar">
      {FILTERS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`border-b-2 pb-1 font-subtitle text-sm transition-colors ${
            value === id ? 'border-onyx text-onyx' : 'border-transparent text-muted-dark hover:text-onyx'
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
