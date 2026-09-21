import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export function TextHoverEffect({
  text,
  duration,
  className,
}: {
  text: string
  duration?: number
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [maskPosition, setMaskPosition] = useState({ cx: '50%', cy: '50%' })

  useEffect(() => {
    if (svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect()
      // Hidden below the `lg` breakpoint (`hidden lg:flex`), so the rect is
      // zero-sized there — skip to avoid dividing by zero into NaN.
      if (svgRect.width === 0 || svgRect.height === 0) return
      const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100
      const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100
      setMaskPosition({ cx: `${cxPercentage}%`, cy: `${cyPercentage}%` })
    }
  }, [cursor])

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn('select-none cursor-pointer', className)}
    >
      <defs>
        <linearGradient id="afroglowTextGradient" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%">
          {hovered && (
            <>
              <stop offset="0%" stopColor="#c9a84c" />
              <stop offset="35%" stopColor="#8c6a24" />
              <stop offset="65%" stopColor="#1a1008" />
              <stop offset="100%" stopColor="#c9a84c" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="afroglowRevealMask"
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: '50%', cy: '50%' }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: 'easeOut' }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="afroglowTextMask">
          <rect x="0" y="0" width="100%" height="100%" fill="url(#afroglowRevealMask)" />
        </mask>
      </defs>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent font-logo text-7xl stroke-onyx/10"
        style={{ opacity: hovered ? 0.7 : 0 }}
      >
        {text}
      </text>
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent font-logo text-7xl stroke-gold-deep"
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{ strokeDashoffset: 0, strokeDasharray: 1000 }}
        transition={{ duration: 4, ease: 'easeInOut' }}
      >
        {text}
      </motion.text>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#afroglowTextGradient)"
        strokeWidth="0.3"
        mask="url(#afroglowTextMask)"
        className="fill-transparent font-logo text-7xl"
      >
        {text}
      </text>
    </svg>
  )
}

export function FooterBackgroundGradient() {
  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        background: 'radial-gradient(125% 125% at 50% 10%, transparent 45%, #c9a84c26 100%)',
      }}
    />
  )
}
