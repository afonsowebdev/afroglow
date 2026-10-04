import type { MouseEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { tap } from '@/lib/haptics'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger'

/** Shared look of every action in the customer app: full width, label on the left, arrow on the right. */
export const actionClasses = (variant: Variant = 'primary') =>
  cn(
    'flex w-full items-center justify-between rounded-xl px-5 py-3.5 font-subtitle text-sm font-medium transition-[transform,opacity] active:scale-[0.98] disabled:opacity-50',
    variant === 'primary' && 'bg-brand text-brand-ink',
    variant === 'secondary' && 'border border-onyx/20 bg-white text-onyx',
    variant === 'danger' && 'bg-red-700 text-[#ffffff]',
  )

interface ActionButtonProps {
  label: string
  variant?: Variant
  /** Icon-font class for the right side; `null` for none. Defaults to the arrow. */
  icon?: string | null
  to?: string
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLElement>
  className?: string
}

export function ActionButton({
  label,
  variant = 'primary',
  icon = 'bx bx-right-arrow-alt',
  to,
  href,
  type = 'button',
  disabled,
  onClick,
  className,
}: ActionButtonProps) {
  const classes = cn(actionClasses(variant), disabled && 'pointer-events-none opacity-50', className)
  const content = (
    <>
      <span>{label}</span>
      {icon && <i className={cn(icon, 'text-xl')} aria-hidden="true" />}
    </>
  )
  const handle: MouseEventHandler<HTMLElement> = (event) => {
    void tap('medium')
    onClick?.(event)
  }

  if (to) {
    return (
      <Link to={to} onClick={handle} className={classes}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={handle} className={classes}>
        {content}
      </a>
    )
  }
  return (
    <button type={type} disabled={disabled} onClick={type === 'submit' ? undefined : handle} className={classes}>
      {content}
    </button>
  )
}
