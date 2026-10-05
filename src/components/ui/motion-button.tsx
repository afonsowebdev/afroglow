import type { MouseEventHandler, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/*
 * The one button format of the whole system (website, admin app and customer app): a compact pill in clear
 * "liquid glass" with the label on the left and a round glass disc with an arrow on the right. No colour, only
 * dark letters (white over a video).
 */
const SIZE = {
  default: { button: 'h-12 gap-5 ps-6 pe-1.5', disc: 'size-9', text: 'text-sm' },
  sm: { button: 'h-10 gap-4 ps-5 pe-1', disc: 'size-8', text: 'text-xs' },
} as const

const TEXT_BY_VARIANT = {
  primary: 'text-onyx',
  secondary: 'text-onyx',
  danger: 'text-red-700',
} as const

interface MotionButtonProps {
  label: string
  icon?: ReactNode
  variant?: keyof typeof TEXT_BY_VARIANT
  size?: keyof typeof SIZE
  /** On top of a video or photo: white letters with a soft shadow and a faint veil so they stay legible. */
  onMedia?: boolean
  className?: string
  href?: string
  target?: string
  rel?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: MouseEventHandler<HTMLElement>
}

export function MotionButton({
  label,
  icon,
  variant = 'primary',
  size = 'default',
  onMedia = false,
  className,
  href,
  target,
  rel,
  disabled,
  type = 'button',
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
      disabled={href ? undefined : disabled}
      aria-disabled={href ? disabled : undefined}
      type={href ? undefined : type}
      style={onMedia ? { background: 'rgba(255, 255, 255, 0.14)' } : undefined}
      className={cn(
        'liquid-glass group inline-flex w-fit shrink-0 cursor-pointer items-center rounded-full outline-none transition-transform duration-300 ease-out active:scale-[0.97]',
        s.button,
        onMedia ? 'text-[#ffffff]' : TEXT_BY_VARIANT[variant],
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'whitespace-nowrap font-subtitle font-medium tracking-wide',
          s.text,
          onMedia && '[text-shadow:0_1px_8px_rgba(0,0,0,0.45)]',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'liquid-glass-bubble flex items-center justify-center rounded-full transition-transform duration-300 ease-out',
          s.disc,
          !icon && 'group-hover:-rotate-45',
        )}
        aria-hidden="true"
      >
        {icon ?? <i className="bx bx-right-arrow-alt text-xl" aria-hidden="true" />}
      </span>
    </Comp>
  )
}
