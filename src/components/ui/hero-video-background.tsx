import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const VIDEOS = ['/videos/hero-1.mp4', '/videos/hero-2.mp4', '/videos/hero-3.mp4']

// Slowed well below real playback speed for a calm, ambient loop rather than
// quick hand-held footage.
const PLAYBACK_RATE = 0.5

/**
 * Full-bleed looping background for the dark-theme Hero: cycles through the
 * clips, crossfading slowly into the next one once each finishes playing
 * (at the slowed rate), plus a fixed dark scrim so the overlaid text stays
 * legible. Colors here are literal rather than the theme-adaptive onyx/cream
 * tokens, since this treatment only ever renders in dark mode. Respects
 * prefers-reduced-motion by not autoplaying.
 */
export function HeroVideoBackground() {
  const shouldReduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  const advance = () => {
    setIndex((current) => (current + 1) % VIDEOS.length)
  }

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
          transition={{ duration: 3, ease: 'easeInOut' }}
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
