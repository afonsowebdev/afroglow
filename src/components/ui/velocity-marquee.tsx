import { useRef } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react'
import { cn } from '@/lib/utils'

/** Keeps `value` inside [min, max), so a row of repeated words can loop forever without a jump. */
const wrap = (min: number, max: number, value: number) => {
  const range = max - min
  return ((((value - min) % range) + range) % range) + min
}

/**
 * One row of the brand name sliding sideways. It drifts on its own and speeds up while the page scrolls,
 * then eases back. `direction` 1 runs right to left, -1 left to right. Still when the visitor prefers less motion.
 */
export function VelocityRow({
  direction,
  speed = 0.3,
  outline = false,
  className,
}: {
  direction: 1 | -1
  /** Percent of the row per second while the page is still. */
  speed?: number
  /** Gold outline letters instead of filled ones. */
  outline?: boolean
  className?: string
}) {
  const reduce = useReducedMotion()
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const boost = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })
  // The row holds four identical copies; moving by one copy (25%) loops seamlessly.
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`)
  const sign = useRef<1 | -1>(1)

  useAnimationFrame((_, delta) => {
    if (reduce) return
    const v = boost.get()
    // Scrolling back up turns the push around, as if the page were pulling the letters with it.
    if (v < 0) sign.current = -1
    else if (v > 0) sign.current = 1
    const step = direction * sign.current * speed * (delta / 1000) * (1 + Math.abs(v))
    baseX.set(baseX.get() - step)
  })

  const word = cn(
    'font-logo leading-none tracking-tight',
    outline ? 'text-transparent [-webkit-text-stroke:1.5px_var(--color-gold)] opacity-60' : 'text-gold-ink/10',
  )

  return (
    <div aria-hidden="true" className={cn('pointer-events-none flex select-none overflow-hidden whitespace-nowrap text-[clamp(4.5rem,13vw,11rem)]', className)}>
      <motion.div className="flex w-max" style={{ x }}>
        {[0, 1, 2, 3].map((copy) => (
          <span key={copy} className="flex shrink-0 items-center">
            {[0, 1, 2].map((n) => (
              <span key={n} className="flex items-center">
                <span className={word}>AFROGLOW</span>
                {/* A small gold diamond between the words. */}
                <span className="mx-[3vw] size-[1.2vw] min-h-2 min-w-2 rotate-45 bg-gold/40" />
              </span>
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
