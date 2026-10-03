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

// Soft focus on the footage so the text and header read clearly on top of it.
// The blur is tinted per theme: airy and light in light mode, deep and dark in
// dark mode (brightness is part of the same filter, so no overlay is needed).
const BLUR_PX = 2
const FILTER_BY_TONE = {
  light: `blur(${BLUR_PX}px)`,
  dark: `blur(${BLUR_PX}px) brightness(0.9) saturate(0.95)`,
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
          style={{ filter: FILTER_BY_TONE[tone], transition: 'filter 0.5s ease' }}
        />
      </AnimatePresence>
    </div>
  )
}
