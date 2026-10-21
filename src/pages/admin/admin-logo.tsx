import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const WORD = 'AFROGLOW'
const HOLD_MS = 2200

// The full logo plays once when the app opens; the other tabs open on the "A" alone.
let played = false

/**
 * The AFROGLOW pill of the admin's tabs. On opening: the "A" spins in, the letters of AFROGLOW rise one by one;
 * a moment later they leave one by one and the pill folds down to the "A" alone. Tapping the "A" plays it again.
 */
export function AdminLogo() {
  const [full, setFull] = useState(!played)
  // Each play spins the "A" in again.
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (!full) return
    played = true
    const timer = window.setTimeout(() => setFull(false), HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [full])

  return (
    <motion.button
      type="button"
      layout
      onClick={() => {
        if (full) return
        setRun((n) => n + 1)
        setFull(true)
      }}
      aria-label="AFROGLOW"
      className="flex h-10 items-center overflow-hidden rounded-full bg-[var(--ios-cell)] p-1 shadow-lg shadow-black/10"
      style={{ borderRadius: 999 }}
      transition={{ layout: { type: 'spring', stiffness: 260, damping: 30 } }}
    >
      <motion.span
        key={run}
        layout="position"
        aria-hidden="true"
        initial={full ? { scale: 0.3, rotate: -120, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-onyx font-logo text-[1.35rem] leading-none text-white logo-weight shadow-[0_1px_4px_rgba(0,0,0,0.18)]"
      >
        <span className="translate-y-[0.1em]">A</span>
      </motion.span>
      <AnimatePresence mode="popLayout">
        {full && (
          <motion.span
            key="word"
            aria-hidden="true"
            className="ms-3 me-3 flex translate-y-[0.1em] font-logo text-[1.1rem] leading-none tracking-[0.14em] text-onyx logo-weight"
            initial="hidden"
            animate="shown"
            exit="gone"
            variants={{
              hidden: {},
              shown: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } },
              gone: { transition: { staggerChildren: 0.035, staggerDirection: -1 } },
            }}
          >
            {WORD.split('').map((letter, i) => (
              <motion.span
                key={i}
                className="inline-block"
                variants={{
                  hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
                  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 380, damping: 24 } },
                  gone: { opacity: 0, x: -8, filter: 'blur(3px)', transition: { duration: 0.18 } },
                }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
