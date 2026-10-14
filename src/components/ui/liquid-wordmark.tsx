import { useEffect, useRef, useState } from 'react'
import { LiquidEngine, type EngineOptions } from '@/components/ui/liquid-engine'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * The wordmark drawn in the logo's typeface and the theme's ink, on a transparent canvas, as an image: what the
 * particles are sampled from (and the still shown without WebGL2).
 */
async function drawWordmark(lines: string[]) {
  const probe = document.createElement('span')
  probe.className = 'font-logo'
  document.body.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily
  probe.remove()
  const size = 320
  try {
    await document.fonts.load(`${size}px ${family}`, lines.join(''))
  } catch {
    // the fallback face is fine
  }
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-onyx').trim() || '#1a1008'
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = `${size}px ${family}`
  const width = Math.max(...lines.map((line) => measure.measureText(line).width))
  const pad = size * 0.12
  // Lines set close, as a block.
  const lineHeight = size * 0.98
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width + pad * 2)
  canvas.height = Math.ceil(lineHeight * lines.length + size * 0.22)
  const ctx = canvas.getContext('2d')!
  ctx.font = `${size}px ${family}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillStyle = ink
  ctx.strokeStyle = ink
  // The logo's weight (see .logo-weight): a thin stroke under the fill.
  ctx.lineWidth = size * 0.035
  ctx.lineJoin = 'round'
  lines.forEach((line, i) => {
    const y = size * 0.11 + lineHeight * (i + 0.5) + size * 0.04
    ctx.strokeText(line, canvas.width / 2, y)
    ctx.fillText(line, canvas.width / 2, y)
  })
  return canvas.toDataURL('image/png')
}

const OPTIONS: Omit<EngineOptions, 'reducedMotion'> = {
  interactive: true,
  strength: 1,
  radius: 120,
  density: 1,
  dotSize: 1,
  spread: 1,
  turbulence: 1,
  returnSpeed: 1,
  streaks: true,
  restStyle: 'image',
  ambient: true,
  ambientIntensity: 0.22,
  speed: 1,
  intro: true,
  bg: [1, 1, 1],
  imgBg: null,
  liquid: 1,
}

/**
 * A word made of tens of thousands of particles (liquid-engine): the pointer or a finger turns it liquid, and it
 * settles back into the crisp word. It assembles when it first comes into view, in the logo's typeface and the
 * theme's colour. Without WebGL2 the still word shows instead.
 */
export function LiquidWordmark({
  text = 'AFROGLOW',
  stacked,
  className,
}: {
  text?: string
  /** Lines to use on narrow screens instead of one (e.g. ['AFRO', 'GLOW']), so the word can be larger there. */
  stacked?: string[]
  className?: string
}) {
  const { theme } = useTheme()
  const box = useRef<HTMLDivElement>(null)
  // Holds the canvas, which is made anew each time the engine starts: a canvas whose context was released by the
  // previous engine (theme change, remount) can't be used again.
  const canvasHost = useRef<HTMLDivElement>(null)
  const [still, setStill] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [touched, setTouched] = useState(false)
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  // Narrow screens (under 640px) take the stacked lines, when there are some.
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    const onChange = () => setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  const lines = narrow && stacked ? stacked : [text]
  const linesKey = lines.join('|')

  // Redrawn with the theme's ink whenever the theme changes.
  useEffect(() => {
    let cancelled = false
    void drawWordmark(linesKey.split('|')).then((url) => {
      if (!cancelled) setStill(url)
    })
    return () => {
      cancelled = true
    }
  }, [linesKey, theme])

  useEffect(() => {
    const el = box.current
    const host = canvasHost.current
    if (!still || !el || !host) return
    const cv = document.createElement('canvas')
    cv.className = 'absolute inset-0 h-full w-full'
    host.appendChild(cv)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let engine: LiquidEngine
    try {
      engine = new LiquidEngine(cv, { ...OPTIONS, reducedMotion }, () => setLive(false))
    } catch {
      cv.remove()
      setLive(false)
      return
    }
    const img = new Image()
    // The word as wide as the box allows, centred.
    const layout = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const aspect = img.naturalWidth / img.naturalHeight || 4
      let rw = w * 0.96
      if (rw / aspect > h * 0.92) rw = h * 0.92 * aspect
      const rh = rw / aspect
      engine.resize(w, h, { x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh })
    }
    let seen = false
    const io = new IntersectionObserver(
      ([entry]) => {
        engine.setVisible(entry.isIntersecting)
        // Assembles the first time it comes into view (not while still off screen).
        if (entry.isIntersecting && !seen) {
          seen = true
          engine.replayIntro()
        }
      },
      { threshold: 0.25 },
    )
    const ro = new ResizeObserver(layout)
    img.onload = () => {
      try {
        engine.setVisible(false)
        layout()
        engine.onFirstFrame = () => setLive(true)
        engine.setImage(img)
        layout()
        ro.observe(el)
        io.observe(el)
      } catch {
        setLive(false)
      }
    }
    img.src = still

    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top] as const
    }
    const onMove = (e: PointerEvent) => {
      const [x, y] = at(e)
      engine.pointer('move', x, y, e.pointerType === 'touch')
      setTouched(true)
    }
    const onDown = (e: PointerEvent) => {
      const [x, y] = at(e)
      engine.pointer('down', x, y, e.pointerType === 'touch')
      setTouched(true)
    }
    const onUp = (e: PointerEvent) => engine.pointer('up', 0, 0, e.pointerType === 'touch')
    const onLeave = (e: PointerEvent) => engine.pointer('leave', 0, 0, e.pointerType === 'touch')
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('pointerleave', onLeave)
      ro.disconnect()
      io.disconnect()
      engine.destroy()
      cv.remove()
      setLive(false)
    }
  }, [still])

  return (
    <div ref={box} className={cn('relative touch-pan-y select-none', className)}>
      {still && (
        <img
          src={still}
          alt={text}
          draggable={false}
          className={cn(
            'pointer-events-none absolute inset-0 m-auto max-h-[92%] max-w-[96%] object-contain transition-opacity duration-500',
            live ? 'opacity-0' : 'opacity-100',
          )}
        />
      )}
      <div
        ref={canvasHost}
        aria-hidden="true"
        className={cn('absolute inset-0 transition-opacity duration-500', live ? 'opacity-100' : 'opacity-0')}
      />
      {/* Says it can be played with, until it has been. */}
      <p
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 font-subtitle text-[11px] uppercase tracking-[0.16em] text-onyx/45 transition-opacity duration-700',
          touched || !live ? 'opacity-0' : 'opacity-100',
        )}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
        {touch ? 'Passa o dedo pela palavra' : 'Passa o rato pela palavra'}
      </p>
    </div>
  )
}

const EDGE_FADE =
  'linear-gradient(to right, transparent, black 14px, black calc(100% - 14px), transparent), linear-gradient(to bottom, transparent, black 12px, black calc(100% - 12px), transparent)'

/** Room around a small word for its particles to spill into while liquid. */
const BLEED = 26

/**
 * The same liquid particles for a word set inline (the logo's AFROGLOW): it keeps the exact size, spacing, weight
 * and colour the text has where it sits (the text itself stays in place, hidden, holding the layout), assembles
 * when it first comes into view and turns liquid under the pointer. Fewer, larger particles to read at this size,
 * and no motion at rest, so it costs nothing while untouched. `inkKey`: changes when the colour changes (e.g. over
 * the video), to redraw.
 */
export function LiquidInlineWord({ text, className, inkKey }: { text: string; className?: string; inkKey?: string }) {
  const { theme } = useTheme()
  const word = useRef<HTMLSpanElement>(null)
  // The canvas is made anew each time the engine starts (see LiquidWordmark).
  const canvasHost = useRef<HTMLSpanElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = word.current
    const host = canvasHost.current
    if (!el || !host) return
    const cv = document.createElement('canvas')
    cv.className = 'block h-full w-full'
    host.appendChild(cv)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let engine: LiquidEngine
    try {
      engine = new LiquidEngine(
        cv,
        {
          ...OPTIONS,
          reducedMotion,
          // Gentler than the big word: at this size the particles stay close to the letters.
          radius: 55,
          strength: 0.6,
          density: 0.15,
          dotSize: 2.4,
          spread: 0.4,
          turbulence: 0.5,
          ambient: false,
        },
        () => setLive(false),
      )
    } catch {
      cv.remove()
      return
    }
    let cancelled = false
    let seen = false
    let drawn = false

    // The text as it is on the page, drawn 8× larger so the particles are sampled from a crisp image.
    const draw = async () => {
      await document.fonts.ready
      if (cancelled) return
      const style = getComputedStyle(el)
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (!w || !h) return
      const k = 8
      const fontSize = parseFloat(style.fontSize)
      const c = document.createElement('canvas')
      c.width = Math.ceil(w * k)
      c.height = Math.ceil(h * k)
      const ctx = c.getContext('2d')!
      ctx.font = `${style.fontWeight} ${fontSize * k}px ${style.fontFamily}`
      const spacing = parseFloat(style.letterSpacing)
      if (!Number.isNaN(spacing))
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing * k}px`
      const m = ctx.measureText(text)
      // Where the browser puts the baseline in a one-line box: the content area centred in the line.
      const ascent = m.fontBoundingBoxAscent
      const descent = m.fontBoundingBoxDescent
      const baseline = (c.height - (ascent + descent)) / 2 + ascent
      const stroke = parseFloat(style.getPropertyValue('-webkit-text-stroke-width')) || 0
      ctx.fillStyle = style.color
      ctx.strokeStyle = style.color
      ctx.lineJoin = 'round'
      if (stroke > 0) {
        ctx.lineWidth = stroke * k
        ctx.strokeText(text, 0, baseline)
      }
      ctx.fillText(text, 0, baseline)
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        engine.resize(w + BLEED * 2, h + BLEED * 2, { x: BLEED, y: BLEED, w, h })
        engine.onFirstFrame = () => setLive(true)
        engine.setImage(img)
        if (!drawn) engine.setVisible(false)
        drawn = true
        engine.resize(w + BLEED * 2, h + BLEED * 2, { x: BLEED, y: BLEED, w, h })
        if (seen) engine.setVisible(true)
      }
      img.src = c.toDataURL('image/png')
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        engine.setVisible(entry.isIntersecting)
        if (entry.isIntersecting && !seen) {
          seen = true
          engine.replayIntro()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    // Draws on first layout and again whenever the word's size changes.
    const ro = new ResizeObserver(() => void draw())
    ro.observe(el)

    const at = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top] as const
    }
    const onMove = (e: PointerEvent) => engine.pointer('move', ...at(e), e.pointerType === 'touch')
    const onDown = (e: PointerEvent) => engine.pointer('down', ...at(e), e.pointerType === 'touch')
    const onUp = (e: PointerEvent) => engine.pointer('up', 0, 0, e.pointerType === 'touch')
    const onLeave = (e: PointerEvent) => engine.pointer('leave', 0, 0, e.pointerType === 'touch')
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelled = true
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('pointerleave', onLeave)
      io.disconnect()
      ro.disconnect()
      engine.destroy()
      cv.remove()
      setLive(false)
    }
  }, [text, theme, inkKey])

  return (
    <span ref={word} className={cn('relative inline-block', className)}>
      {/* Keeps the layout and is what shows until the particles are drawn (or without WebGL2). */}
      <span className={cn('transition-opacity duration-300', live && 'opacity-0')}>{text}</span>
      <span
        ref={canvasHost}
        aria-hidden="true"
        className="pointer-events-none absolute"
        // The edges fade out, so particles that stray far vanish softly instead of being cut by the canvas.
        style={{
          maskImage: EDGE_FADE,
          WebkitMaskImage: EDGE_FADE,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
          left: -BLEED,
          top: -BLEED,
          width: `calc(100% + ${BLEED * 2}px)`,
          height: `calc(100% + ${BLEED * 2}px)`,
        }}
      />
    </span>
  )
}
