import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

/* ── adapted from a scroll-driven marketing hero ────────────────────
 * The original drives the circle→arc morph from the page's wheel/touch
 * events (with preventDefault, i.e. it hijacks scrolling) and shows its
 * own headline copy. As a login-page background neither makes sense:
 * hijacking the scroll wheel behind a login form would trap the page,
 * and the headline would compete with the actual login card. So the
 * morph now drives itself on a slow auto-loop (circle → arc → circle),
 * the headline is gone, and the cards show a placeholder tile instead
 * of stock photos — mouse-parallax and the 3D flip-on-hover stay.
 * ───────────────────────────────────────────────────────────────── */

type Phase = 'scatter' | 'line' | 'settled'

interface CardTarget {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
}

const CARD_WIDTH = 92
const CARD_HEIGHT = 130
const TOTAL_CARDS = 12
const LOOP_MS = 22000

const PLACEHOLDER_TILE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='340'%3E%3Crect width='240' height='340' fill='%23f5efdf'/%3E%3Cg fill='none' stroke='%231a1008' stroke-opacity='0.25' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='55' y='95' width='130' height='95' rx='10'/%3E%3Ccircle cx='95' cy='130' r='11'/%3E%3Cpath d='M55 165l35-30 30 24 35-40 30 34'/%3E%3C/g%3E%3C/svg%3E"

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t

function FlipCard({ target }: { target: CardTarget }) {
  return (
    <motion.div
      animate={{ x: target.x, y: target.y, rotate: target.rotation, scale: target.scale, opacity: target.opacity }}
      transition={{ type: 'spring', stiffness: 40, damping: 15 }}
      style={{ position: 'absolute', width: CARD_WIDTH, height: CARD_HEIGHT, perspective: '1000px' }}
      className="group cursor-pointer"
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ rotateY: 180 }}
      >
        <div
          className="absolute inset-0 h-full w-full overflow-hidden rounded-xl bg-cream shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <img src={PLACEHOLDER_TILE} alt="" aria-hidden="true" className="h-full w-full object-cover" />
        </div>

        <div
          className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-gold/30 bg-onyx shadow-lg"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <span className="font-logo text-[10px] tracking-wide text-gold-deep">AfroGlow</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ScrollMorphHero({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('scatter')
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(el)
    setContainerSize({ width: el.offsetWidth, height: el.offsetHeight })
    return () => observer.disconnect()
  }, [])

  // Drives the circle→arc morph — auto-looping instead of scroll-driven,
  // since this container sits behind a login form, not a scrollable hero.
  const loopProgress = useMotionValue(0)
  const smoothMorph = useSpring(useTransform(loopProgress, [0, 0.5, 1], [0, 1, 0]), { stiffness: 40, damping: 20 })
  const smoothRotate = useSpring(useTransform(loopProgress, [0, 1], [0, 360]), { stiffness: 40, damping: 20 })

  const mouseX = useMotionValue(0)
  const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseX.set(normalizedX * 60)
    }
    el.addEventListener('mousemove', onMouseMove)
    return () => el.removeEventListener('mousemove', onMouseMove)
  }, [mouseX])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('line'), 400)
    const t2 = setTimeout(() => setPhase('settled'), 1800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'settled') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf: number
    let last = performance.now()
    let value = 0
    const tick = (now: number) => {
      value = (value + (now - last) / LOOP_MS) % 1
      last = now
      loopProgress.set(value)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, loopProgress])

  const [morphValue, setMorphValue] = useState(0)
  const [rotateValue, setRotateValue] = useState(0)
  const [parallaxValue, setParallaxValue] = useState(0)

  useEffect(() => {
    const unsub1 = smoothMorph.on('change', setMorphValue)
    const unsub2 = smoothRotate.on('change', setRotateValue)
    const unsub3 = smoothMouseX.on('change', setParallaxValue)
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [smoothMorph, smoothRotate, smoothMouseX])

  const scatterPositions = useMemo(
    () =>
      Array.from({ length: TOTAL_CARDS }, () => ({
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.5) * 600,
        rotation: (Math.random() - 0.5) * 180,
        scale: 0.6,
        opacity: 0,
      })),
    [],
  )

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      <div className="flex h-full w-full items-center justify-center">
        {Array.from({ length: TOTAL_CARDS }).map((_, i) => {
          let target: CardTarget

          if (phase === 'scatter') {
            target = scatterPositions[i]
          } else if (phase === 'line') {
            const spacing = 105
            const totalWidth = TOTAL_CARDS * spacing
            target = { x: i * spacing - totalWidth / 2, y: 0, rotation: 0, scale: 1, opacity: 1 }
          } else {
            const isMobile = containerSize.width < 768
            const minDimension = Math.min(containerSize.width, containerSize.height)

            const circleRadius = Math.min(minDimension * 0.35, 300)
            const circleAngle = (i / TOTAL_CARDS) * 360
            const circleRad = (circleAngle * Math.PI) / 180
            const circlePos = {
              x: Math.cos(circleRad) * circleRadius,
              y: Math.sin(circleRad) * circleRadius,
              rotation: circleAngle + 90,
            }

            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5)
            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1)
            const arcApexY = containerSize.height * (isMobile ? 0.35 : 0.25)
            const arcCenterY = arcApexY + arcRadius
            const spreadAngle = isMobile ? 100 : 130
            const startAngle = -90 - spreadAngle / 2
            const step = spreadAngle / (TOTAL_CARDS - 1)
            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1)
            const maxRotation = spreadAngle * 0.8
            const boundedRotation = -scrollProgress * maxRotation
            const currentArcAngle = startAngle + i * step + boundedRotation
            const arcRad = (currentArcAngle * Math.PI) / 180
            const arcPos = {
              x: Math.cos(arcRad) * arcRadius + parallaxValue,
              y: Math.sin(arcRad) * arcRadius + arcCenterY,
              rotation: currentArcAngle + 90,
              scale: isMobile ? 1.4 : 1.8,
            }

            target = {
              x: lerp(circlePos.x, arcPos.x, morphValue),
              y: lerp(circlePos.y, arcPos.y, morphValue),
              rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
              scale: lerp(1, arcPos.scale, morphValue),
              opacity: 1,
            }
          }

          return <FlipCard key={i} target={target} />
        })}
      </div>
    </div>
  )
}

export default ScrollMorphHero
