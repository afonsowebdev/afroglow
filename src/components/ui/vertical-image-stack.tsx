import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, type PanInfo } from 'motion/react'

export interface StackImage {
  src: string
  alt: string
}

/** Where a card sits relative to the front one (in card heights, so it works at any size). */
function cardStyle(diff: number) {
  if (diff === 0) return { y: '0%', scale: 1, opacity: 1, zIndex: 5, rotateX: 0 }
  if (diff === -1) return { y: '-34%', scale: 0.82, opacity: 0.6, zIndex: 4, rotateX: 8 }
  if (diff === -2) return { y: '-60%', scale: 0.7, opacity: 0.3, zIndex: 3, rotateX: 15 }
  if (diff === 1) return { y: '34%', scale: 0.82, opacity: 0.6, zIndex: 4, rotateX: -8 }
  if (diff === 2) return { y: '60%', scale: 0.7, opacity: 0.3, zIndex: 3, rotateX: -15 }
  return { y: diff > 0 ? '95%' : '-95%', scale: 0.6, opacity: 0, zIndex: 0, rotateX: diff > 0 ? -20 : 20 }
}

const COOLDOWN_MS = 400

/**
 * A vertical stack of photos: the front one is full size and the others peek above and below it. Scroll (with the
 * pointer over it), drag, the arrow keys or the dots move through them. Fills its parent, which sets the size.
 */
export function VerticalImageStack({ images }: { images: StackImage[] }) {
  const [current, setCurrent] = useState(0)
  const lastMove = useRef(0)
  const root = useRef<HTMLDivElement>(null)
  const total = images.length

  const go = useCallback(
    (direction: number) => {
      const now = Date.now()
      if (now - lastMove.current < COOLDOWN_MS) return
      lastMove.current = now
      setCurrent((prev) => (direction > 0 ? (prev + 1) % total : (prev - 1 + total) % total))
    },
    [total],
  )

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -50) go(1)
    else if (info.offset.y > 50) go(-1)
  }

  // The wheel only moves the stack while the pointer is over it.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 30) go(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [go])

  const diffOf = (index: number) => {
    let diff = index - current
    if (diff > total / 2) diff -= total
    if (diff < -total / 2) diff += total
    return diff
  }

  return (
    <div
      ref={root}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="Fotos"
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') go(1)
        else if (e.key === 'ArrowUp') go(-1)
        else return
        e.preventDefault()
      }}
      className="relative h-full w-full select-none overflow-hidden outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-onyx"
    >
      <div className="absolute inset-x-0 bottom-6 top-0" style={{ perspective: '1200px' }}>
        {images.map((image, index) => {
          const diff = diffOf(index)
          if (Math.abs(diff) > 2) return null
          const style = cardStyle(diff)
          const isCurrent = diff === 0
          return (
            <motion.div
              key={image.src}
              className="absolute inset-0 m-auto aspect-[2/3] h-[64%] cursor-grab active:cursor-grabbing"
              animate={{ y: style.y, scale: style.scale, opacity: style.opacity, rotateX: style.rotateX }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
              drag={isCurrent ? 'y' : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={onDragEnd}
              style={{ transformStyle: 'preserve-3d', zIndex: style.zIndex }}
              aria-hidden={!isCurrent}
            >
              <div
                className="relative h-full w-full overflow-hidden rounded-3xl bg-cream ring-1 ring-onyx/10"
                style={{
                  boxShadow: isCurrent
                    ? '0 25px 50px -12px rgba(26,16,8,0.25), 0 0 0 1px rgba(26,16,8,0.05)'
                    : '0 10px 30px -10px rgba(26,16,8,0.18)',
                }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  draggable={false}
                  loading={isCurrent ? 'eager' : 'lazy'}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-onyx/30 to-transparent" />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Counter */}
      <div className="pointer-events-none absolute left-1 top-1/2 flex -translate-y-1/2 flex-col items-center sm:left-3">
        <span className="font-subtitle text-2xl font-light tabular-nums text-onyx sm:text-4xl">
          {String(current + 1).padStart(2, '0')}
        </span>
        <span className="my-1.5 h-px w-6 bg-onyx/20 sm:w-8" />
        <span className="font-subtitle text-xs tabular-nums text-muted-dark sm:text-sm">
          {String(total).padStart(2, '0')}
        </span>
      </div>

      {/* Dots */}
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 flex-col gap-2 sm:right-3">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setCurrent(index)}
            aria-label={`Foto ${index + 1}`}
            className={`w-2 rounded-full transition-all duration-300 ${
              index === current ? 'h-6 bg-onyx' : 'h-2 bg-onyx/30 hover:bg-onyx/50'
            }`}
          />
        ))}
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-0 text-center font-subtitle text-[11px] font-medium uppercase tracking-[0.2em] text-muted-dark">
        Desliza ou arrasta
      </p>
    </div>
  )
}

export default VerticalImageStack
