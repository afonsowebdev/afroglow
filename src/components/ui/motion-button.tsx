import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const CIRCLE_BY_VARIANT = {
  primary: 'bg-gold-deep',
  secondary: 'bg-onyx',
} as const

// Icon circle sits inset by `p-1` on the track; on hover it slides from the
// right edge to the left edge while the button's padding mirrors, so the
// label appears to shift over to make room — matches the button's own
// height/circle proportions rather than the reference's fixed pixel values.
const SIZE = {
  default: {
    button: 'h-14',
    circle: 'h-12 w-12',
    text: 'text-sm',
    // `hover:`, not `group-hover:` — this padding lives on the `.group`
    // element itself, and group-hover only ever matches descendants of it.
    pad: 'ps-7 pe-16 hover:ps-16 hover:pe-7',
    travel: 'group-hover:right-[calc(100%-52px)]',
  },
  sm: {
    button: 'h-11',
    circle: 'h-9 w-9',
    text: 'text-xs',
    pad: 'ps-5 pe-12 hover:ps-12 hover:pe-5',
    travel: 'group-hover:right-[calc(100%-40px)]',
  },
} as const

interface MotionButtonProps {
  label: string
  icon?: ReactNode
  variant?: keyof typeof CIRCLE_BY_VARIANT
  size?: keyof typeof SIZE
  className?: string
  href?: string
  target?: string
  rel?: string
  onClick?: MouseEventHandler<HTMLElement>
}

export function MotionButton({
  label,
  icon,
  variant = 'primary',
  size = 'default',
  className,
  href,
  target,
  rel,
  onClick,
}: MotionButtonProps) {
  const Comp = href ? 'a' : 'button'
  const s = SIZE[size]

  return (
    <Comp
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      type={href ? undefined : 'button'}
      className={cn(
        'group relative inline-flex w-fit shrink-0 cursor-pointer items-center overflow-hidden rounded-full border border-gold/30 bg-white p-1 outline-none transition-all duration-500 ease-out',
        s.button,
        s.pad,
        className,
      )}
    >
      <span className={cn('relative z-10 whitespace-nowrap font-body tracking-wide text-onyx', s.text)}>
        {label}
      </span>
      <span
        className={cn(
          'absolute right-1 top-1 flex items-center justify-center rounded-full text-cream transition-all duration-500 ease-out',
          s.circle,
          s.travel,
          CIRCLE_BY_VARIANT[variant],
          !icon && 'group-hover:rotate-45',
        )}
        aria-hidden="true"
      >
        {icon ?? <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />}
      </span>
    </Comp>
  )
}
