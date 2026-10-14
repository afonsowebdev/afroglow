import { useEffect } from 'react'
import { motion } from 'motion/react'

/** Once, when the strip first comes into view, nudge it sideways to show that it can be dragged. */
export function useSwipeNudge(ref: React.RefObject<HTMLDivElement | null>, slides: number) {
  useEffect(() => {
    const el = ref.current
    if (!el || slides < 2) return
    let timers: number[] = []
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        el.style.scrollSnapType = 'none'
        el.scrollTo({ left: 56, behavior: 'smooth' })
        timers = [
          window.setTimeout(() => el.scrollTo({ left: 0, behavior: 'smooth' }), 650),
          window.setTimeout(() => (el.style.scrollSnapType = ''), 1300),
        ]
      },
      { threshold: 0.7 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      timers.forEach(clearTimeout)
      el.style.scrollSnapType = ''
    }
  }, [ref, slides])
}

/** Arrows and a line under a swipeable strip: tells the customer to drag until they do, then shows the position. */
export function SwipeHint({ index, slides, swiped, what }: { index: number; slides: number; swiped: boolean; what: string }) {
  if (slides < 2) return null
  return (
    <div className="mx-auto mt-4 flex max-w-sm items-center justify-between px-5 text-onyx">
      <i
        className={`bx bx-chevron-left text-2xl transition-opacity ${index > 0 ? 'opacity-70' : 'opacity-0'}`}
        aria-hidden="true"
      />
      <p className="font-subtitle text-xs text-muted-dark">
        {swiped ? `${Math.min(index + 1, slides)} de ${slides}` : `Desliza para o lado para ver mais ${what}`}
      </p>
      <motion.i
        className={`bx bx-chevron-right text-2xl ${index < slides - 1 ? '' : 'opacity-0'}`}
        animate={swiped ? { x: 0 } : { x: [0, 6, 0] }}
        transition={swiped ? undefined : { duration: 1.2, repeat: Infinity }}
        aria-hidden="true"
      />
    </div>
  )
}
