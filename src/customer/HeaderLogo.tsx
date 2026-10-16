import { useEffect, useRef, useState } from 'react'
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
 * The way out: a quick sweep across the word, as a finger would, so its particles scatter like dust in the wind just
 * before it fades away.
 */
function blowAway(el: HTMLElement | null) {
  if (!el) return
  const r = el.getBoundingClientRect()
  const y = r.top + r.height / 2
  const send = (type: string, x: number) =>
    el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType: 'touch', bubbles: true }))
  send('pointerdown', r.left)
  const steps = 10
  for (let i = 1; i <= steps; i++) window.setTimeout(() => send('pointermove', r.left + (r.width * i) / steps), i * 32)
  window.setTimeout(() => send('pointerup', r.right), steps * 32 + 20)
}

/**
 * The "A" at the top of the customer app. Once per launch, after the opening, AFROGLOW assembles from particles
 * beside its circle (as in the opening), on nothing; a few seconds later the word goes and only the "A" stays.
 */
export function HeaderLogo({ onClick, onDark = false }: { onClick: () => void; onDark?: boolean }) {
  const [word, setWord] = useState(false)
  const letters = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (played) return
    let timer = 0
    const stop = afterIntro(() => {
      timer = window.setTimeout(() => {
        played = true
        setWord(true)
        timer = window.setTimeout(() => {
          blowAway(letters.current)
          timer = window.setTimeout(() => setWord(false), 380)
        }, SHOW_MS)
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: 14, filter: 'blur(6px)', transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } }}
            transition={ease}
            className="pointer-events-none relative whitespace-nowrap font-logo leading-none"
            aria-hidden="true"
          >
            {/* A soft haze behind the word (no edges), so it reads over any frame of the video or over the page. */}
            <span
              aria-hidden="true"
              className={`absolute -inset-x-5 -inset-y-4 -z-10 rounded-full blur-md ${
                onDark
                  ? 'bg-[radial-gradient(closest-side,rgba(0,0,0,0.38),transparent)]'
                  : 'bg-[radial-gradient(closest-side,rgba(255,255,255,0.75),transparent)] dark:bg-[radial-gradient(closest-side,rgba(43,29,18,0.75),transparent)]'
              }`}
            />
            <LiquidLogo inkKey={onDark ? 'header-dark' : 'header-light'}>
              <span
                ref={letters}
                data-liquid="text"
                className={`logo-weight inline-block translate-y-[0.1em] text-[1.4rem] tracking-[0.12em] [--logo-weight:0.075em] ${
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
