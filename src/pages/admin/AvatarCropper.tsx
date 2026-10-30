import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Check, Minus, Move, Plus, X } from 'lucide-react'
import { tap } from '@/lib/haptics'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { cardShadow } from './admin-ui'

/** The circle on screen, in CSS pixels. */
const VIEW = 260
const MAX_ZOOM = 4

/**
 * The profile photo's editor, in a sheet like the others: the photo behind a circle exactly as it will show, moved with
 * a finger, zoomed with two fingers or the slider, and "Usar foto" keeps only what is inside the circle. Hands back
 * the square chosen, in the photo's own pixels.
 */
export function AvatarCropper({
  file,
  busy = false,
  onCancel,
  onDone,
}: {
  file: File | null
  busy?: boolean
  onCancel: () => void
  onDone: (crop: { x: number; y: number; side: number }) => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  useScrollLock(!!file)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setSrc(url)
    setNatural(null)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(url)
  }, [file])

  // At zoom 1 the photo just covers the circle.
  const base = natural ? VIEW / Math.min(natural.w, natural.h) : 1
  const shownW = natural ? natural.w * base * zoom : VIEW
  const shownH = natural ? natural.h * base * zoom : VIEW
  /** Keeps the photo covering the whole circle. */
  const clamp = (o: { x: number; y: number }, w = shownW, h = shownH) => ({
    x: Math.max(-(w - VIEW) / 2, Math.min((w - VIEW) / 2, o.x)),
    y: Math.max(-(h - VIEW) / 2, Math.min((h - VIEW) / 2, o.y)),
  })
  const setZoomKeep = (next: number) => {
    const z = Math.max(1, Math.min(MAX_ZOOM, next))
    // Zoom about the centre: the offset grows with the photo.
    const ratio = z / zoom
    setZoom(z)
    setOffset((o) => clamp({ x: o.x * ratio, y: o.y * ratio }, natural ? natural.w * base * z : VIEW, natural ? natural.h * base * z : VIEW))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const was = pointers.current.get(e.pointerId)
    if (!was) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      setZoomKeep(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.distance))
      return
    }
    setOffset((o) => clamp({ x: o.x + e.clientX - was.x, y: o.y + e.clientY - was.y }))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const use = () => {
    if (!natural) return
    void tap('medium')
    const scale = base * zoom
    const side = VIEW / scale
    const x = (shownW / 2 - VIEW / 2 - offset.x) / scale
    const y = (shownH / 2 - VIEW / 2 - offset.y) / scale
    onDone({ x: Math.max(0, x), y: Math.max(0, y), side: Math.min(side, natural.w, natural.h) })
  }

  return (
    <AnimatePresence>
      {file && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={() => !busy && onCancel()}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Ajustar a foto"
            className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center gap-3 px-5 pb-3 pt-5">
              <span className="glass-chip flex size-11 shrink-0 items-center justify-center rounded-full text-onyx">
                <Move size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-subtitle text-[19px] font-semibold tracking-tight text-onyx">Ajustar a foto</h2>
                <p className="truncate font-subtitle text-xs text-muted-dark">Arrasta para mover; dois dedos para aproximar.</p>
              </div>
              <button type="button" aria-label="Fechar" onClick={onCancel} disabled={busy} className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx">
                <X size={16} />
              </button>
            </div>

            {/* The photo behind the circle, as it will show. */}
            <div className="flex justify-center px-5 pt-2">
              <div
                className="relative touch-none select-none overflow-hidden rounded-[28px] bg-[#111111]"
                style={{ width: VIEW + 48, height: VIEW + 48 }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {src && (
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                    style={{
                      width: shownW,
                      height: shownH,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      opacity: natural ? 1 : 0,
                    }}
                  />
                )}
                {/* Outside the circle darkened, the circle with a thin bright rim. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[rgba(0,0,0,0.55)]"
                  style={{
                    WebkitMaskImage: `radial-gradient(circle at center, transparent ${VIEW / 2}px, #000 ${VIEW / 2 + 1}px)`,
                    maskImage: `radial-gradient(circle at center, transparent ${VIEW / 2}px, #000 ${VIEW / 2 + 1}px)`,
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#ffffff]/90"
                  style={{ width: VIEW, height: VIEW }}
                />
              </div>
            </div>

            {/* Zoom. */}
            <div className="flex items-center gap-3 px-8 pt-5">
              <button type="button" aria-label="Afastar" onClick={() => setZoomKeep(zoom - 0.25)} className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx">
                <Minus size={15} />
              </button>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoomKeep(Number(e.target.value))}
                aria-label="Aproximar"
                className="h-1.5 flex-1 cursor-pointer accent-[#5f935d]"
              />
              <button type="button" aria-label="Aproximar" onClick={() => setZoomKeep(zoom + 0.25)} className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-full text-onyx">
                <Plus size={15} />
              </button>
            </div>

            <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5">
              <button
                type="button"
                disabled={busy || !natural}
                onClick={use}
                className={`flex h-14 w-full items-center gap-3 rounded-full bg-card pe-2 ps-5 text-left transition-transform active:scale-[0.98] disabled:opacity-50 ${cardShadow}`}
              >
                <Check size={19} className="shrink-0" style={{ color: 'var(--c-confirmed)' }} />
                <span className="min-w-0 flex-1 truncate font-subtitle text-[15px] font-semibold text-onyx">{busy ? 'A guardar…' : 'Usar foto'}</span>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-onyx/[0.05] text-onyx">
                  <ArrowRight size={18} />
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
