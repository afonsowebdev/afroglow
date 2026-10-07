import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

const SLIDE_SECONDS = 4.5

/**
 * A portrait photo that changes by itself with a soft cross-fade. Pauses while the pointer is over it; a tap or
 * click goes to the next one. Fills its parent's height (the parent sets the size).
 */
export function PhotoFade({ photos, alt, className }: { photos: string[]; alt: string; className?: string }) {
  const reduceMotion = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = photos.length

  useEffect(() => {
    if (reduceMotion || paused || count < 2) return
    const timer = window.setInterval(() => setCurrent((i) => (i + 1) % count), SLIDE_SECONDS * 1000)
    return () => window.clearInterval(timer)
  }, [reduceMotion, paused, count])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      role="img"
      aria-label={alt}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onClick={() => setCurrent((i) => (i + 1) % count)}
      className={cn(
        'relative aspect-[3/4] h-full max-w-full cursor-pointer overflow-hidden rounded-2xl bg-cream',
        className,
      )}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img src={photos[current]} alt="" draggable={false} className="h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-t from-onyx/25 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1.5" aria-hidden="true">
        {photos.map((src, i) => (
          <span
            key={src}
            className={cn(
              'h-1.5 rounded-full transition-all duration-500',
              i === current ? 'w-6 bg-[#ffffff]' : 'w-1.5 bg-[#ffffff]/60',
            )}
          />
        ))}
      </div>
    </motion.div>
  )
}

export default PhotoFade
