import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import type { MouseEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { tap } from '@/lib/haptics'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary'

/*
 * Pill button with a round icon disc. On hover / press the disc slides across to the other side while the
 * label moves over to make room (from the shadcn "button with icon" component). Here in the system brown,
 * with a visible border.
 */
const BUTTON: Record<Variant, string> = {
  primary: 'border-brand bg-brown text-brown-cream',
  secondary: 'border-brown bg-white text-brown',
}

const DISC: Record<Variant, string> = {
  primary: 'bg-brown-cream text-brown',
  secondary: 'bg-brown text-brown-cream',
}

interface ButtonWithIconProps {
  label: string
  variant?: Variant
  /** A lucide icon, an icon-font class (e.g. "bx bx-log-out"), or `ArrowUpRight` by default. */
  Icon?: LucideIcon
  iconClass?: string
  to?: string
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLElement>
  className?: string
}

export function ButtonWithIcon({
  label,
  variant = 'primary',
  Icon = ArrowUpRight,
  iconClass,
  to,
  href,
  type = 'button',
  disabled,
  onClick,
  className,
}: ButtonWithIconProps) {
  const classes = cn(
    // layout from the original: h-12 pill, padding for the disc on the right, slides on hover
    'group relative h-12 w-full cursor-pointer justify-start overflow-hidden rounded-full border-2 p-1 ps-6 pe-14 text-sm font-medium',
    'transition-all duration-500 hover:ps-14 hover:pe-6 active:ps-14 active:pe-6',
    BUTTON[variant],
    disabled && 'pointer-events-none opacity-50',
    className,
  )

  const content = (
    <>
      <span className="relative z-10 whitespace-nowrap font-subtitle transition-all duration-500">{label}</span>
      <span
        className={cn(
          'absolute right-1 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-500',
          'group-hover:right-[calc(100%-40px)] group-hover:rotate-45 group-active:right-[calc(100%-40px)] group-active:rotate-45',
          DISC[variant],
        )}
        aria-hidden="true"
      >
        {iconClass ? <i className={cn(iconClass, 'text-lg')} /> : <Icon size={17} strokeWidth={2.4} />}
      </span>
    </>
  )

  const handle: MouseEventHandler<HTMLElement> = (event) => {
    void tap('medium')
    onClick?.(event)
  }

  if (to) {
    return (
      <Button asChild className={classes}>
        <Link to={to} onClick={handle}>
          {content}
        </Link>
      </Button>
    )
  }
  if (href) {
    return (
      <Button asChild className={classes}>
        <a href={href} target="_blank" rel="noreferrer" onClick={handle}>
          {content}
        </a>
      </Button>
    )
  }

  return (
    <Button type={type} disabled={disabled} onClick={type === 'submit' ? undefined : handle} className={classes}>
      {content}
    </Button>
  )
}
