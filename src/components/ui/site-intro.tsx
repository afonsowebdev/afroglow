import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LiquidWordmark } from '@/components/ui/liquid-wordmark'

const SEEN_KEY = 'afroglow-intro-seen'
/** How long the word takes to assemble (liquid-engine's intro is about 3.2s), and the longest it may hold the site. */
const ASSEMBLE_MS = 2800
const MAX_MS = 6000

function alreadySeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The site's opening: the whole screen in the theme's colour with AFROGLOW assembling from particles (as in the
 * contact section); once the word has formed and the page has loaded, it fades away and the site shows. Once per
 * visit (this browser tab), shorter for those who prefer less motion, and never longer than a few seconds.
 */
export function SiteIntro() {
  const [show, setShow] = useState(() => !alreadySeen())
  const [shownAt, setShownAt] = useState<number | null>(null)

  // Nothing under it moves while it is up.
  useEffect(() => {
    if (!show) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [show])

  useEffect(() => {
    if (!show) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // storage blocked: it simply shows again next time
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const loaded =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }))
    const start = shownAt ?? performance.now()
    let cancelled = false
    const minWait = reduced ? 600 : ASSEMBLE_MS
    void loaded.then(() => {
      const left = Math.max(0, minWait - (performance.now() - start))
      window.setTimeout(() => !cancelled && setShow(false), left)
    })
    const cap = window.setTimeout(() => setShow(false), MAX_MS)
    return () => {
      cancelled = true
      window.clearTimeout(cap)
    }
  }, [show, shownAt])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          aria-hidden="true"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white px-4"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
        >
          <LiquidWordmark
            stacked={['AFRO', 'GLOW']}
            hint={false}
            stillFirst={false}
            onShown={() => setShownAt((t) => t ?? performance.now())}
            className="h-[min(84vw,26rem)] w-full max-w-5xl sm:h-[clamp(200px,24vw,420px)]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
