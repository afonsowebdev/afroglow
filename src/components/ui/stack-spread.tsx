import {
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  motion,
} from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface StackSpreadImage {
  src?: string
  alt: string
}

interface CardLayout {
  cluster: { x: number; y: number; rotate: number }
  spread: { x: number; y: number; rotate: number; scale: number }
  z: number
}

// Fraction of the scroll progress at which the cards finish spreading; the
// remainder holds the fully-open composition before the section releases.
const SPREAD_END = 0.7

const LAYOUTS: CardLayout[] = [
  { cluster: { x: -3, y: -5, rotate: -9 }, spread: { x: -34, y: -12, rotate: -12, scale: 1 }, z: 20 },
  { cluster: { x: 2, y: 3, rotate: 6 }, spread: { x: -16, y: 14, rotate: -4, scale: 1 }, z: 22 },
  { cluster: { x: -1, y: 1, rotate: -2 }, spread: { x: 0, y: -16, rotate: 2, scale: 1.08 }, z: 30 },
  { cluster: { x: 3, y: -2, rotate: 5 }, spread: { x: 16, y: 12, rotate: 7, scale: 1 }, z: 22 },
  { cluster: { x: -2, y: 4, rotate: -6 }, spread: { x: 34, y: -10, rotate: 13, scale: 1 }, z: 20 },
]

export interface StackSpreadStageProps {
  images: StackSpreadImage[]
  bgColor?: string
  textColor?: string
  scrollLength?: number
  stackScale?: number
  cardRadius?: number
  clusterRotation?: boolean
  showScrollHint?: boolean
  eyebrow?: string
  headline: ReactNode
  subtitle?: string
  children?: ReactNode
  className?: string
}

function StackCard({
  layout,
  image,
  progress,
  stackScale,
  cardRadius,
  clusterRotation,
}: {
  layout: CardLayout
  image: StackSpreadImage
  progress: ReturnType<typeof useMotionValue<number>>
  stackScale: number
  cardRadius: number
  clusterRotation: boolean
}) {
  const clusterRotate = clusterRotation ? layout.cluster.rotate : 0

  // Spread finishes at SPREAD_END, then holds fully open for the remaining scroll
  // so the composition is visible before the page continues to the next section.
  const xPercent = useTransform(progress, [0, SPREAD_END], [layout.cluster.x, layout.spread.x])
  const yPercent = useTransform(progress, [0, SPREAD_END], [layout.cluster.y, layout.spread.y])
  const rotate = useTransform(progress, [0, SPREAD_END], [clusterRotate, layout.spread.rotate])
  const scale = useTransform(progress, [0, SPREAD_END], [stackScale, layout.spread.scale])
  const x = useMotionTemplate`${xPercent}vw`
  const y = useMotionTemplate`${yPercent}vh`

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 aspect-[3/4] w-[46vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-2xl shadow-black/40 sm:w-[30vw] md:w-[19vw]"
      style={{ x, y, rotate, scale, zIndex: layout.z, borderRadius: `${cardRadius}px` }}
    >
      {image.src ? (
        <img src={image.src} alt={image.alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-muted/30"
          role="img"
          aria-label={image.alt}
        >
          <i className="bx bx-image text-3xl text-onyx/30" aria-hidden="true" />
        </div>
      )}
    </motion.div>
  )
}

export function StackSpreadStage({
  images,
  bgColor = 'var(--color-white)',
  textColor = 'var(--color-onyx)',
  scrollLength = 350,
  stackScale = 0.82,
  cardRadius = 10,
  clusterRotation = true,
  showScrollHint = true,
  eyebrow,
  headline,
  subtitle,
  children,
  className,
}: StackSpreadStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const staticProgress = useMotionValue(1)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const progress = shouldReduceMotion ? staticProgress : scrollYProgress

  const hintOpacity = useTransform(progress, [0, 0.08], [1, 0])

  const cards = images.slice(0, LAYOUTS.length)

  return (
    <section
      ref={containerRef}
      className={cn('relative', className)}
      style={{ height: shouldReduceMotion ? '100vh' : `${scrollLength}vh` }}
    >
      <div
        className="sticky top-0 flex h-screen w-full flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundColor: bgColor,
          color: textColor,
          transition: 'background-color 0.35s ease, color 0.35s ease',
        }}
      >
        {cards.map((image, i) => (
          <StackCard
            key={i}
            layout={LAYOUTS[i]}
            image={image}
            progress={progress}
            stackScale={stackScale}
            cardRadius={cardRadius}
            clusterRotation={clusterRotation}
          />
        ))}

        <div className="relative z-40 flex max-w-3xl flex-col items-center px-6 text-center">
          {eyebrow && (
            <span className="mb-4 font-body text-xs uppercase tracking-[0.3em] text-gold-deep">
              {eyebrow}
            </span>
          )}
          <h1 className="font-logo text-[10vw] leading-[1.05] sm:text-[7vw] md:text-[6vw]">
            {headline}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-md font-subtitle text-base font-light text-muted-dark sm:text-lg md:text-[1.15vw]">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </div>

        {showScrollHint && (
          <motion.div
            className="absolute bottom-8 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1"
            style={{ opacity: hintOpacity }}
            animate={shouldReduceMotion ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="font-body text-[0.65rem] uppercase tracking-[0.3em] text-gold-deep">Scroll</span>
            <i className="bx bx-chevron-down text-3xl text-gold-deep" aria-hidden="true" />
          </motion.div>
        )}
      </div>
    </section>
  )
}
