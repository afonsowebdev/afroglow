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
  hint = true,
  stillFirst = true,
  onShown,
}: {
  text?: string
  /** Lines to use on narrow screens instead of one (e.g. ['AFRO', 'GLOW']), so the word can be larger there. */
  stacked?: string[]
  className?: string
  /** The "pass over the word" line under it. */
  hint?: boolean
  /** Shows the still word until the particles come; false keeps it hidden unless there is no WebGL2. */
  stillFirst?: boolean
  /** Called once the particles are on screen (or at once without WebGL2, where the still word shows). */
  onShown?: (live: boolean) => void
}) {
  const { theme } = useTheme()
  const box = useRef<HTMLDivElement>(null)
  // Holds the canvas, which is made anew each time the engine starts: a canvas whose context was released by the
  // previous engine (theme change, remount) can't be used again.
  const canvasHost = useRef<HTMLDivElement>(null)
  const [still, setStill] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [touched, setTouched] = useState(false)
  const onShownRef = useRef(onShown)
  onShownRef.current = onShown
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
      setFailed(true)
      onShownRef.current?.(false)
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
        engine.onFirstFrame = () => {
          setLive(true)
          onShownRef.current?.(true)
        }
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
            live || !(stillFirst || failed) ? 'opacity-0' : 'opacity-100',
          )}
        />
      )}
      <div
        ref={canvasHost}
        aria-hidden="true"
        className={cn('absolute inset-0 transition-opacity duration-500', live ? 'opacity-100' : 'opacity-0')}
      />
      {/* Says it can be played with, until it has been. */}
      {hint && (
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
      )}
    </div>
  )
}

const EDGE_FADE =
  'linear-gradient(to right, transparent, black 22px, black calc(100% - 22px), transparent), linear-gradient(to bottom, transparent, black 18px, black calc(100% - 18px), transparent)'

/** Room around the logo for its particles to spill into while liquid. */
const BLEED = 40

/** Draws one marked element (`data-liquid="circle"` or `"text"`) as it looks on the page, `k`× larger, at (ox, oy). */
function drawPart(ctx: CanvasRenderingContext2D, el: HTMLElement, ox: number, oy: number, k: number) {
  const r = el.getBoundingClientRect()
  const style = getComputedStyle(el)
  const x = (r.left - ox) * k
  const y = (r.top - oy) * k
  if (el.dataset.liquid === 'circle') {
    ctx.fillStyle = style.backgroundColor
    ctx.beginPath()
    ctx.ellipse(x + (r.width * k) / 2, y + (r.height * k) / 2, (r.width * k) / 2, (r.height * k) / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const text = el.textContent ?? ''
  const fontSize = parseFloat(style.fontSize)
  ctx.font = `${style.fontWeight} ${fontSize * k}px ${style.fontFamily}`
  const spacing = parseFloat(style.letterSpacing)
  ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = Number.isNaN(spacing)
    ? '0px'
    : `${spacing * k}px`
  const m = ctx.measureText(text)
  // Where the browser puts the baseline in a one-line box: the content area centred in the line.
  const baseline =
    y + (r.height * k - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent
  // Centred text (the "A" in its circle) is placed by its own width.
  const left = style.textAlign === 'center' ? x + (r.width * k - m.width) / 2 : x
  const stroke = parseFloat(style.getPropertyValue('-webkit-text-stroke-width')) || 0
  ctx.fillStyle = style.color
  ctx.strokeStyle = style.color
  ctx.lineJoin = 'round'
  if (stroke > 0) {
    ctx.lineWidth = stroke * k
    ctx.strokeText(text, left, baseline)
  }
  ctx.fillText(text, left, baseline)
}

/**
 * The same liquid particles as the contact section for a logo set inline (the "A" in its circle and AFROGLOW): the
 * pieces marked `data-liquid` inside are drawn exactly as they sit (size, spacing, colours; the real ones stay in
 * place, hidden, holding the layout). It assembles when it first comes into view, stays still and sharp at rest and
 * turns liquid under the pointer, as the big word does; fewer, larger particles to read at this size. `inkKey`: changes
 * when the colours change (e.g. over the video), to redraw.
 */
export function LiquidLogo({
  children,
  className,
  inkKey,
}: {
  children: React.ReactNode
  className?: string
  inkKey?: string
}) {
  const { theme } = useTheme()
  const root = useRef<HTMLSpanElement>(null)
  // The canvas is made anew each time the engine starts (see LiquidWordmark).
  const canvasHost = useRef<HTMLSpanElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = root.current
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
          radius: 70,
          density: 0.15,
          dotSize: 2.4,
          // Still and sharp at rest, exactly over the real letters: it only moves under the pointer (and on arrival).
          ambient: false,
          maxDpr: 3,
        },
        () => setLive(false),
      )
    } catch {
      cv.remove()
      return
    }
    let cancelled = false
    let seen = false

    // The logo as it is on the page, drawn 8× larger so the particles are sampled from a crisp image.
    const draw = async () => {
      await document.fonts.ready
      if (cancelled) return
      const box = el.getBoundingClientRect()
      const w = box.width
      const h = box.height
      if (!w || !h) return
      const k = 8
      const c = document.createElement('canvas')
      c.width = Math.ceil(w * k)
      c.height = Math.ceil(h * k)
      const ctx = c.getContext('2d')!
      el.querySelectorAll<HTMLElement>('[data-liquid]').forEach((part) => drawPart(ctx, part, box.left, box.top, k))
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        const size = [w + BLEED * 2, h + BLEED * 2, { x: BLEED, y: BLEED, w, h }] as const
        engine.resize(...size)
        engine.onFirstFrame = () => setLive(true)
        engine.setImage(img)
        engine.resize(...size)
        engine.setVisible(seen)
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
    // Draws on first layout and again whenever the logo's size changes.
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
  }, [theme, inkKey])

  return (
    <span ref={root} className={cn('relative inline-flex', className)}>
      {/* Keeps the layout and is what shows until the particles are drawn (or without WebGL2). */}
      <span className={cn('contents [&>*]:transition-opacity [&>*]:duration-300', live && '[&>*]:opacity-0')}>
        {children}
      </span>
      <span
        ref={canvasHost}
        aria-hidden="true"
        className="pointer-events-none absolute"
        // The edges fade out, so particles that stray far vanish softly instead of being cut by the canvas.
        style={{
          left: -BLEED,
          top: -BLEED,
          width: `calc(100% + ${BLEED * 2}px)`,
          height: `calc(100% + ${BLEED * 2}px)`,
          maskImage: EDGE_FADE,
          WebkitMaskImage: EDGE_FADE,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />
    </span>
  )
}
