import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const CIRCLE_BY_VARIANT = {
  primary: 'bg-gold-deep',
  secondary: 'bg-onyx',
} as const

const SIZE = {
  default: { button: 'h-14 w-56', circle: 'h-12 w-12', icon: 'left-4', text: 'text-sm ml-4' },
  sm: { button: 'h-11 w-44', circle: 'h-9 w-9', icon: 'left-3', text: 'text-xs ml-3' },
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
        'group relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-gold/30 bg-white p-1 outline-none',
        s.button,
        className,
      )}
    >
      <span
        className={cn(
          'block shrink-0 rounded-full duration-500 ease-out group-hover:w-full',
          s.circle,
          CIRCLE_BY_VARIANT[variant],
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-cream duration-500 ease-out group-hover:translate-x-1.5',
          s.icon,
        )}
      >
        {icon ?? <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />}
      </span>
      <span
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-body tracking-wide text-onyx duration-500 ease-out group-hover:text-cream',
          s.text,
        )}
      >
        {label}
      </span>
    </Comp>
  )
}
