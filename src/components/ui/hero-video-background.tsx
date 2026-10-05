import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

interface Clip {
  /** 720p rendition, used on phones and when data saving is on. */
  sd: string
  /** 1080p rendition, used on regular screens. */
  hd: string
  /** 4K rendition, used on large / high-density screens. */
  uhd?: string
  /** High-bitrate 4K made for the iPhone app (about 11 Mbps, ~8 MB per clip). */
  app?: string
}

// The customer iPhone app streams the clips from the website instead of bundling
// ~45 MB of video into the app; the site build serves them from its own origin.
const VIDEO_BASE = import.meta.env.MODE === 'customer' ? 'https://www.afroglow.pt' : ''

// Dark theme playlist (1080p only).
const DARK_CLIPS: Clip[] = [1, 2, 3, 4, 5, 6].map((n) => ({
  sd: `/videos/hero-hd-${n}-sd.mp4`,
  hd: `/videos/hero-hd-${n}.mp4`,
}))

// Light theme playlist. The order is deliberate: each clip ends on colours and
// light close to where the next one begins, so the crossfade barely shows.
const LIGHT_CLIPS: Clip[] = [1, 2, 3, 4, 5].map((n) => ({
  sd: `/videos/hero-light-${n}-sd.mp4?v=2`,
  hd: `/videos/hero-light-${n}.mp4?v=2`,
  uhd: `/videos/hero-light-${n}-4k.mp4?v=2`,
  app: `/videos/hero-light-${n}-app.mp4?v=1`,
}))

// Trial clips for the customer iPhone app (filmed by the studio). Remove this list and the override in the
// component to go back to the usual playlists.
const APP_TRIAL_CLIPS: Clip[] = [1].map((n) => ({
  sd: `/videos/hero-test-${n}-app.mp4`,
  hd: `/videos/hero-test-${n}-app.mp4`,
  app: `/videos/hero-test-${n}-app.mp4`,
}))

// Where a trial clip is framed in the tall phone screen (the clip is 16:9, so only a slice shows).
const FOCUS_BY_CLIP: Record<string, string> = { 'hero-test-2-app.mp4': '30% 50%' }
const focusFor = (src: string) => FOCUS_BY_CLIP[src.split('/').pop()?.split('?')[0] ?? ''] ?? '50% 50%'

// Smallest file that still looks sharp on the visitor's screen: 720p on phones and
// when data saving is on, 4K only on large/high-density screens, 1080p otherwise.
function pickRendition(clip: Clip) {
  if (typeof window === 'undefined') return clip.hd
  // The iPhone app always plays the best version available: true 4K where we have it, 1080p otherwise.
  if (import.meta.env.MODE === 'customer') return clip.app ?? clip.uhd ?? clip.hd
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData || window.innerWidth < 768) return clip.sd
  if (clip.uhd && window.innerWidth * (window.devicePixelRatio || 1) >= 2400) return clip.uhd
  return clip.hd
}

// A still from the first clip of each theme: painted immediately (a few KB), so the hero is
// never an empty box while the video downloads.
const POSTER_BY_TONE = {
  light: '/images/hero-poster-light.jpg',
  dark: '/images/hero-poster-dark.jpg',
} as const

// Normal playback speed (1 = real time). Lower it for a calmer, slow-motion feel.
const PLAYBACK_RATE = import.meta.env.MODE === 'customer' ? 0.8 : 1

// The next clip starts this long before the current one ends, and the two
// crossfade over the same window, so playback is continuous: no frozen last
// frame, no black gap while the next file loads.
const CROSSFADE_SECONDS = 1.5

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
export function HeroVideoBackground({ tone = 'dark', tint = true }: { tone?: 'dark' | 'light'; tint?: boolean }) {
  const shouldReduceMotion = useReducedMotion()
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)]

  const [active, setActive] = useState(0)
  // The waiting slot only starts downloading once the first clip is actually playing, so it
  // never competes with the first paint for bandwidth.
  const [firstPlaying, setFirstPlaying] = useState(false)
  // Resolved once per mount; the Hero remounts this component when the theme changes.
  const [videos] = useState(() => {
    const clips = import.meta.env.MODE === 'customer' ? APP_TRIAL_CLIPS : tone === 'light' ? LIGHT_CLIPS : DARK_CLIPS
    // The trial clips travel inside the app; the usual ones are streamed from the website.
    return clips.map((clip) => {
      const src = pickRendition(clip)
      return (src.includes('hero-test-') ? '' : VIDEO_BASE) + src
    })
  })
  const [sources, setSources] = useState([videos[0], videos[1 % videos.length]])

  const activeRef = useRef(0)
  const upcomingIndex = useRef(1 % videos.length) // index in `videos` loaded in the waiting slot
  const switching = useRef(false)

  const play = (video: HTMLVideoElement | null) => {
    if (!video) return
    video.playbackRate = PLAYBACK_RATE
    video.play().catch(() => {
      // Autoplay refused (e.g. data-saver): the poster colour simply stays.
    })
  }

  const crossfade = useCallback(() => {
    // With a single clip the two slots take turns playing it, so it loops with the same soft crossfade.
    if (switching.current) return
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
        upcomingIndex.current = (upcomingIndex.current + 1) % videos.length
        setSources((current) => {
          const next = [...current]
          next[outgoing] = videos[upcomingIndex.current]
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
    <div
      className="absolute inset-0 overflow-hidden bg-[#1a1008] bg-cover bg-center"
      style={{ backgroundImage: `url(${VIDEO_BASE}${POSTER_BY_TONE[tone]})` }}
    >
      {[0, 1].map((slot) => (
        <video
          key={slot}
          ref={videoRefs[slot]}
          src={sources[slot]}
          muted
          playsInline
          poster={slot === 0 ? VIDEO_BASE + POSTER_BY_TONE[tone] : undefined}
          preload={slot === 0 || firstPlaying ? 'auto' : 'none'}
          onPlaying={() => {
            if (slot === 0) setFirstPlaying(true)
          }}
          // If the 4K file isn't on the server yet (or fails), fall back to the regular 1080p one.
          onError={(e) => {
            const video = e.currentTarget
            if (!video.src.includes('-app.mp4')) return
            video.src = video.src.replace(/-app\.mp4\?v=\d+/, '.mp4?v=2')
            video.load()
            if (slot === activeRef.current) play(video)
          }}
          data-slot={slot}
          data-active={active === slot}
          onTimeUpdate={(e) => {
            const video = e.currentTarget
            if (slot !== activeRef.current || !video.duration) return
            if (video.duration - video.currentTime <= CROSSFADE_SECONDS * PLAYBACK_RATE) crossfade()
          }}
          // Safety net: if the clip is too short or timeupdate was throttled.
          onEnded={() => {
            if (slot === activeRef.current) crossfade()
          }}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            objectPosition: focusFor(sources[slot]),
            opacity: active === slot ? 1 : 0,
            transition: `opacity ${CROSSFADE_SECONDS}s ease-in-out`,
          }}
        />
      ))}

      {tint && (
        <div
          className={`absolute inset-0 bg-gradient-to-b transition-colors duration-500 ${TINT_BY_TONE[tone]}`}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
