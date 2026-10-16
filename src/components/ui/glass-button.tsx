import { useRef, type MouseEventHandler } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'
import { useTheme } from '@/lib/theme'
import { useBackdropTone } from '@/lib/use-backdrop-tone'
import { cn } from '@/lib/utils'

type Variant = 'overlay' | 'primary' | 'secondary'

/*
 * The customer app's button, in liquid glass like the tab bar:
 *  - overlay: over the hero video, clear neutral glass, white letters with a soft shadow;
 *  - primary / secondary: clear glass like the tab bar, no colour at all; the letters follow what is behind the
 *    glass on their own (white with a soft shadow over dark photos or backgrounds, dark over light ones).
 * Always a compact pill: label on the left, round glass disc with an arrow on the right.
 */
const LETTERS = {
  light: 'text-[#1a1008]',
  dark: 'text-[#ffffff] [text-shadow:0_1px_6px_rgba(0,0,0,0.35)]',
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
  const box = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const tone = useBackdropTone(box, theme === 'dark' ? 'dark' : 'light', variant !== 'overlay')
  const classes = cn(
    'liquid-glass inline-flex h-12 items-center gap-5 rounded-full ps-6 pe-1.5 outline-none transition-[color,opacity] duration-300',
    variant === 'overlay' ? 'text-[#ffffff]' : LETTERS[tone],
    disabled && 'pointer-events-none opacity-50',
    className,
  )
  const letters = variant === 'overlay' ? '[text-shadow:0_1px_8px_rgba(0,0,0,0.45)]' : ''
  const content = (
    <>
      <span className={cn('whitespace-nowrap font-subtitle text-sm font-medium tracking-wide', letters)}>{label}</span>
      <span className={cn('flex size-9 items-center justify-center rounded-full', 'liquid-glass-bubble')}>
        <i className={cn(icon ?? 'bx bx-right-arrow-alt', icon ? 'text-lg' : 'text-xl')} aria-hidden="true" />
      </span>
    </>
  )
  const handle: MouseEventHandler<HTMLElement> = (event) => {
    void tap('medium')
    onClick?.(event)
  }
  // On the video the clear glass needs a faint veil so white letters stay legible on bright frames.
  const style = variant === 'overlay' ? { background: 'rgba(255, 255, 255, 0.14)' } : undefined

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
      ref={box}
      className="w-fit"
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {inner}
    </motion.div>
  )
}
