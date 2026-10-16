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
 * The "A" at the top of the customer app. Once per launch, after the opening, AFROGLOW assembles from particles
 * beside its circle (as in the opening), on nothing; a few seconds later the word goes and only the "A" stays.
 */
export function HeaderLogo({ onClick, onDark = false }: { onClick: () => void; onDark?: boolean }) {
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
    <span className="pointer-events-auto flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        aria-label="AFROGLOW, início"
        className={`flex size-12 shrink-0 items-center justify-center rounded-full font-logo text-[1.6rem] leading-none logo-weight ${BRAND_CIRCLE}`}
      >
        <span className="translate-y-[0.1em]" aria-hidden="true">
          A
        </span>
      </button>
      {/* The word beside the circle, on nothing: white with a soft shadow over the video, dark over the page. */}
      <AnimatePresence initial={false}>
        {word && (
          <motion.span
            key="word"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
            transition={ease}
            className="pointer-events-none whitespace-nowrap font-logo leading-none logo-weight"
            aria-hidden="true"
          >
            <LiquidLogo inkKey={onDark ? 'header-dark' : 'header-light'}>
              <span
                data-liquid="text"
                className={`inline-block translate-y-[0.1em] text-[1.35rem] tracking-[0.14em] ${
                  onDark ? 'text-[#ffffff] [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]' : 'text-onyx'
                }`}
              >
                AFROGLOW
              </span>
            </LiquidLogo>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
