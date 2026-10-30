import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ArrowDown, RefreshCw } from 'lucide-react'
import { INK_CIRCLE } from '@/components/ui/brand-logo'
import { tap } from '@/lib/haptics'

/** How far to pull (after the rubber band) before letting go refreshes, and where the page rests while it does. */
const THRESHOLD = 72
const HOLD = 60
const SPRING = { type: 'spring', stiffness: 380, damping: 34 } as const

/** The pull, softened like the iPhone's rubber band: easy at first, harder the further it goes. */
const rubber = (distance: number) => 130 * (1 - Math.exp(-distance / 260))

/**
 * Pull down at the top of the page to refresh it, the iPhone way: the page follows the finger on a rubber band, a round
 * button under the header shows an arrow that turns as it fills (a light haptic when letting go will refresh), and
 * while it refreshes the arrow becomes a spinning one and the page rests a little lower, then springs back.
 */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<unknown>; children: ReactNode }) {
  const y = useMotionValue(0)
  const wrap = useRef<HTMLDivElement>(null)
  const start = useRef<number | null>(null)
  const ready = useRef(false)
  const busy = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const [armed, setArmed] = useState(false)
  const latest = useRef(onRefresh)
  latest.current = onRefresh

  const opacity = useTransform(y, [8, THRESHOLD * 0.6], [0, 1])
  const scale = useTransform(y, [0, THRESHOLD], [0.6, 1])
  const turn = useTransform(y, [0, THRESHOLD], [0, 180])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onStart = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && !busy.current ? e.touches[0].clientY : null
    }
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return
      const distance = e.touches[0].clientY - start.current
      if (distance <= 0 || window.scrollY > 0) {
        if (y.get() !== 0) y.set(0)
        if (distance < 0) start.current = null
        return
      }
      // Ours, not the page's own bounce.
      e.preventDefault()
      const pull = rubber(distance)
      y.set(pull)
      const now = pull >= THRESHOLD
      if (now !== ready.current) {
        ready.current = now
        setArmed(now)
        if (now) void tap()
      }
    }
    const onEnd = async () => {
      if (start.current === null) return
      start.current = null
      if (!ready.current) {
        animate(y, 0, SPRING)
        return
      }
      ready.current = false
      setArmed(false)
      busy.current = true
      setRefreshing(true)
      animate(y, HOLD, SPRING)
      try {
        // Long enough to be seen, even when the data comes back at once.
        await Promise.all([latest.current(), new Promise((resolve) => setTimeout(resolve, 650))])
      } finally {
        busy.current = false
        setRefreshing(false)
        animate(y, 0, SPRING)
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [y])

  return (
    <div ref={wrap}>
      {/* The round button under the header: an arrow that turns as the pull fills, spinning while it refreshes. */}
      <motion.div
        aria-hidden={!refreshing}
        role={refreshing ? 'status' : undefined}
        aria-label={refreshing ? 'A atualizar' : undefined}
        className="pointer-events-none fixed inset-x-0 top-[calc(5.75rem+env(safe-area-inset-top))] z-40 flex justify-center sm:top-[calc(6.75rem+env(safe-area-inset-top))]"
        style={{ opacity: refreshing ? 1 : opacity }}
      >
        <motion.span className={`flex size-10 items-center justify-center rounded-full ${INK_CIRCLE}`} style={{ scale: refreshing ? 1 : scale }}>
          {refreshing ? (
            <RefreshCw size={17} strokeWidth={2.2} className="animate-spin" />
          ) : (
            <motion.span style={{ rotate: turn }} className={armed ? 'text-onyx' : 'text-muted-dark'}>
              <ArrowDown size={18} strokeWidth={2.2} />
            </motion.span>
          )}
        </motion.span>
      </motion.div>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
