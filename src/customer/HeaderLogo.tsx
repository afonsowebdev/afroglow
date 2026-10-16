import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'
import { LiquidLogo } from '@/components/ui/liquid-wordmark'
import { afterIntro } from '@/components/ui/site-intro'

/** Played once per launch of the app. */
let played = false
/** How long the word is up: about three seconds to assemble, then a couple of seconds formed. */
const SHOW_MS = 5600

const ease = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }

/**
 * The "A" at the top of the customer app. Once per launch, after the opening, its circle widens into a capsule where
 * AFROGLOW assembles from particles (as in the opening); a few seconds later the word goes and the circle closes back
 * around the "A".
 */
export function HeaderLogo({ onClick }: { onClick: () => void }) {
  const [word, setWord] = useState(false)

  useEffect(() => {
    if (played) return
    let timer = 0
    const stop = afterIntro(() => {
      timer = window.setTimeout(() => {
        played = true
        setWord(true)
        timer = window.setTimeout(() => setWord(false), SHOW_MS)
      }, 350)
    })
    return () => {
      stop()
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="AFROGLOW, início"
      layout
      transition={ease}
      style={{ borderRadius: 999 }}
      className={`pointer-events-auto flex h-12 items-center overflow-hidden font-logo leading-none logo-weight ${BRAND_CIRCLE}`}
    >
      <span className="flex size-12 shrink-0 items-center justify-center text-[1.6rem]" aria-hidden="true">
        <span className="translate-y-[0.1em]">A</span>
      </span>
      <AnimatePresence initial={false}>
        {word && (
          <motion.span
            key="word"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={ease}
            className="block overflow-hidden"
            aria-hidden="true"
          >
            <span className="block whitespace-nowrap pe-5">
              <LiquidLogo inkKey="header">
                <span data-liquid="text" className="inline-block translate-y-[0.1em] text-[1.2rem] tracking-[0.14em]">
                  AFROGLOW
                </span>
              </LiquidLogo>
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
