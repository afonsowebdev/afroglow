import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const VIDEOS = [
  '/videos/hero-hd-1.mp4',
  '/videos/hero-hd-2.mp4',
  '/videos/hero-hd-3.mp4',
  '/videos/hero-hd-4.mp4',
  '/videos/hero-hd-5.mp4',
  '/videos/hero-hd-6.mp4',
]

// Normal playback speed (1 = real time). Lower it for a calmer, slow-motion feel.
const PLAYBACK_RATE = 1

// The next clip starts this long before the current one ends, and the two
// crossfade over the same window, so playback is continuous: no frozen last
// frame, no black gap while the next file loads.
const CROSSFADE_SECONDS = 1.2

// A wash in the site's own brown, so the video feels part of the page's palette
// (same idea as a brand-coloured tint over a hero video). Deeper in dark mode.
const TINT_BY_TONE = {
  light: 'from-[#3b1f0e]/55 via-[#3b1f0e]/40 to-[#1a1008]/70',
  dark: 'from-[#1a1008]/70 via-[#1a1008]/55 to-[#1a1008]/85',
} as const

/**
 * Full-bleed looping background for the Hero. Two stacked <video> slots: one is
 * visible and playing, the other has the next clip preloaded and waiting. Just
 * before the visible clip ends, the waiting one starts and fades in over it; once
 * the fade is done the old slot is reloaded with the clip after that. Respects
 * prefers-reduced-motion by not autoplaying.
 */
export function HeroVideoBackground({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const shouldReduceMotion = useReducedMotion()
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)]

  const [active, setActive] = useState(0)
  const [sources, setSources] = useState([VIDEOS[0], VIDEOS[1 % VIDEOS.length]])

  const activeRef = useRef(0)
  const upcomingIndex = useRef(1 % VIDEOS.length) // VIDEOS index loaded in the waiting slot
  const switching = useRef(false)

  const play = (video: HTMLVideoElement | null) => {
    if (!video) return
    video.playbackRate = PLAYBACK_RATE
    video.play().catch(() => {
      // Autoplay refused (e.g. data-saver): the poster colour simply stays.
    })
  }

  const crossfade = useCallback(() => {
    if (switching.current || VIDEOS.length < 2) return
    switching.current = true

    const outgoing = activeRef.current
    const incoming = 1 - outgoing

    const incomingVideo = videoRefs[incoming].current
    if (incomingVideo) incomingVideo.currentTime = 0
    play(incomingVideo)

    activeRef.current = incoming
    setActive(incoming)

    // After the fade, the old slot preloads the clip that follows the one now playing.
    window.setTimeout(
      () => {
        upcomingIndex.current = (upcomingIndex.current + 1) % VIDEOS.length
        setSources((current) => {
          const next = [...current]
          next[outgoing] = VIDEOS[upcomingIndex.current]
          return next
        })
        switching.current = false
      },
      CROSSFADE_SECONDS * 1000 + 150,
    )
    // videoRefs are stable ref objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!shouldReduceMotion) play(videoRefs[0].current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReduceMotion])

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#1a1008]">
      {[0, 1].map((slot) => (
        <video
          key={slot}
          ref={videoRefs[slot]}
          src={sources[slot]}
          muted
          playsInline
          preload="auto"
          data-slot={slot}
          data-active={active === slot}
          onTimeUpdate={(e) => {
            const video = e.currentTarget
            if (slot !== activeRef.current || !video.duration) return
            if (video.duration - video.currentTime <= CROSSFADE_SECONDS) crossfade()
          }}
          // Safety net: if the clip is too short or timeupdate was throttled.
          onEnded={() => {
            if (slot === activeRef.current) crossfade()
          }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: active === slot ? 1 : 0,
            transition: `opacity ${CROSSFADE_SECONDS}s ease-in-out`,
          }}
        />
      ))}

      <div
        className={`absolute inset-0 bg-gradient-to-b transition-colors duration-500 ${TINT_BY_TONE[tone]}`}
        aria-hidden="true"
      />
    </div>
  )
}
