import { useEffect, useRef, useState } from 'react'
import { LiquidEngine, type EngineOptions } from '@/components/ui/liquid-engine'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * The wordmark drawn in the logo's typeface and the theme's ink, on a transparent canvas, as an image: what the
 * particles are sampled from (and the still shown without WebGL2).
 */
async function drawWordmark(text: string) {
  const probe = document.createElement('span')
  probe.className = 'font-logo'
  document.body.appendChild(probe)
  const family = getComputedStyle(probe).fontFamily
  probe.remove()
  const size = 320
  try {
    await document.fonts.load(`${size}px ${family}`, text)
  } catch {
    // the fallback face is fine
  }
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-onyx').trim() || '#1a1008'
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = `${size}px ${family}`
  const metrics = measure.measureText(text)
  const pad = size * 0.12
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(metrics.width + pad * 2)
  canvas.height = Math.ceil(size * 1.2)
  const ctx = canvas.getContext('2d')!
  ctx.font = `${size}px ${family}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = ink
  ctx.strokeStyle = ink
  // The logo's weight (see .logo-weight): a thin stroke under the fill.
  ctx.lineWidth = size * 0.035
  ctx.lineJoin = 'round'
  const y = canvas.height / 2 + size * 0.04
  ctx.strokeText(text, pad, y)
  ctx.fillText(text, pad, y)
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
export function LiquidWordmark({ text = 'AFROGLOW', className }: { text?: string; className?: string }) {
  const { theme } = useTheme()
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [still, setStill] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [touched, setTouched] = useState(false)
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  // Redrawn with the theme's ink whenever the theme changes.
  useEffect(() => {
    let cancelled = false
    void drawWordmark(text).then((url) => {
      if (!cancelled) setStill(url)
    })
    return () => {
      cancelled = true
    }
  }, [text, theme])

  useEffect(() => {
    const el = box.current
    const cv = canvas.current
    if (!still || !el || !cv) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let engine: LiquidEngine
    try {
      engine = new LiquidEngine(cv, { ...OPTIONS, reducedMotion }, () => setLive(false))
    } catch {
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
      <canvas
        ref={canvas}
        aria-hidden="true"
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-500',
          live ? 'opacity-100' : 'opacity-0',
        )}
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
