import type { MouseEventHandler } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'
import { cn } from '@/lib/utils'

type Variant = 'overlay' | 'primary' | 'secondary'

/*
 * The customer app's button, in liquid glass like the tab bar:
 *  - overlay: over the hero video, clear glass with a light dark veil, white letters;
 *  - primary: brown-tinted glass with white letters (readable on white pages);
 *  - secondary: light glass with dark letters.
 * Always a compact pill: label on the left, round glass disc with an arrow on the right.
 */
const PILL: Record<Variant, string> = {
  overlay: 'liquid-glass text-[#ffffff]',
  primary: 'glass-action text-[#ffffff]',
  secondary: 'liquid-glass bg-white/60 text-onyx',
}

export function GlassButton({
  label,
  variant = 'overlay',
  icon,
  to,
  href,
  type = 'button',
  disabled,
  onClick,
  className,
}: {
  label: string
  variant?: Variant
  /** Icon-font class for the disc; omit for the arrow. */
  icon?: string
  to?: string
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLElement>
  className?: string
}) {
  const classes = cn(
    'inline-flex h-12 items-center gap-5 rounded-full ps-6 pe-1.5 outline-none transition-opacity',
    PILL[variant],
    disabled && 'pointer-events-none opacity-50',
    className,
  )
  const letters = variant === 'secondary' ? '' : '[text-shadow:0_1px_10px_rgba(0,0,0,0.35)]'
  const content = (
    <>
      <span className={cn('whitespace-nowrap font-subtitle text-sm font-medium tracking-wide', letters)}>{label}</span>
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-full',
          variant === 'primary' ? 'glass-action-bubble' : 'liquid-glass-bubble',
        )}
      >
        <i className={cn(icon ?? 'bx bx-right-arrow-alt', icon ? 'text-lg' : 'text-xl')} aria-hidden="true" />
      </span>
    </>
  )
  const handle: MouseEventHandler<HTMLElement> = (event) => {
    void tap('medium')
    onClick?.(event)
  }
  // On the video the clear glass needs a faint veil so white letters stay legible on bright frames.
  const style = variant === 'overlay' ? { background: 'rgba(0, 0, 0, 0.14)' } : undefined

  const inner = to ? (
    <Link to={to} onClick={handle} className={classes} style={style}>
      {content}
    </Link>
  ) : href ? (
    <a href={href} target="_blank" rel="noreferrer" onClick={handle} className={classes} style={style}>
      {content}
    </a>
  ) : (
    <button
      type={type}
      disabled={disabled}
      onClick={type === 'submit' ? undefined : handle}
      className={classes}
      style={style}
    >
      {content}
    </button>
  )

  return (
    <motion.div
      className="w-fit"
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {inner}
    </motion.div>
  )
}
