import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const VIDEOS = ['/videos/hero-1.mp4', '/videos/hero-2.mp4', '/videos/hero-3.mp4', '/videos/hero-4.mp4']

// Slowed down from real playback speed — the raw clips read as quick, hand-held
// phone footage; playing them back at 60% speed gives the loop a calmer,
// more deliberate feel that suits a background rather than a foreground clip.
const PLAYBACK_RATE = 0.6

// Cuts each clip well before it actually finishes — the full clips run long
// for a background loop, so this keeps the cadence snappier than waiting for
// each one to play out completely.
const SEGMENT_MS = 4000

/**
 * Full-bleed looping background: cycles through the hero clips with a
 * crossfade on each transition, plus a fixed dark scrim so the overlaid
 * text stays legible — the treatment (dark video + light text) is meant to
 * look the same regardless of the site's own light/dark theme, so colors
 * here are literal rather than the theme-adaptive onyx/cream tokens.
 */
export function HeroVideoBackground() {
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  const advance = () => {
    setIndex((current) => (current + 1) % VIDEOS.length)
  }

  useEffect(() => {
    if (shouldReduceMotion) return
    const timer = setTimeout(advance, SEGMENT_MS)
    return () => clearTimeout(timer)
  }, [index, shouldReduceMotion])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1008]">
      <AnimatePresence>
        <motion.video
          key={index}
          src={VIDEOS[index]}
          autoPlay={!shouldReduceMotion}
          muted
          playsInline
          onEnded={advance}
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = PLAYBACK_RATE
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>

      <div
        className="absolute inset-0 bg-gradient-to-b from-[#1a1008]/75 via-[#1a1008]/45 to-[#1a1008]/80"
        aria-hidden="true"
      />
    </div>
  )
}
