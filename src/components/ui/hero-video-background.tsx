import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const VIDEOS = [
  '/videos/hero-9.mp4',
  '/videos/hero-10.mp4',
  '/videos/hero-11.mp4',
  '/videos/hero-12.mp4',
  '/videos/hero-13.mp4',
  '/videos/hero-14.mp4',
]

// Normal playback speed (1 = real time). Lower it for a calmer, slow-motion feel.
const PLAYBACK_RATE = 1

// Just a touch of softness: the footage stays clearly recognisable.
const BLUR_PX = 1

// A wash in the site's own brown, so the video feels part of the page's palette
// (same idea as a brand-coloured tint over a hero video). Deeper in dark mode.
const TINT_BY_TONE = {
  light: 'from-[#3b1f0e]/55 via-[#3b1f0e]/40 to-[#1a1008]/70',
  dark: 'from-[#1a1008]/70 via-[#1a1008]/55 to-[#1a1008]/85',
} as const

/**
 * Full-bleed looping background for the Hero (dark and light): cycles through the
 * clips, crossfading slowly into the next one once each finishes playing
 * (at the slowed rate), plus a fixed dark scrim so the overlaid text stays
 * legible. Colors here are literal rather than the theme-adaptive onyx/cream
 * tokens, since this treatment only ever renders in dark mode. Respects
 * prefers-reduced-motion by not autoplaying.
 */
export function HeroVideoBackground({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  const advance = () => {
    setIndex((current) => (current + 1) % VIDEOS.length)
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${tone === 'dark' ? 'bg-[#1a1008]' : 'bg-[#f5efdf]'}`}>
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
          transition={{ duration: 3, ease: 'easeInOut' }}
          className="absolute inset-0 h-full w-full scale-110 object-cover"
          style={{ filter: `blur(${BLUR_PX}px)` }}
        />
      </AnimatePresence>

      <div
        className={`absolute inset-0 bg-gradient-to-b transition-colors duration-500 ${TINT_BY_TONE[tone]}`}
        aria-hidden="true"
      />
    </div>
  )
}
