import type { MouseEventHandler } from 'react'
import { GlassButton } from '@/components/ui/glass-button'

/** The customer app's action button: brown-tinted liquid glass (primary) or light glass (secondary). */
export function ActionButton({
  label,
  variant = 'primary',
  icon,
  to,
  href,
  type = 'button',
  disabled,
  onClick,
  className,
}: {
  label: string
  variant?: 'primary' | 'secondary'
  icon?: string
  to?: string
  href?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: MouseEventHandler<HTMLElement>
  className?: string
}) {
  return (
    <GlassButton
      label={label}
      variant={variant}
      icon={icon}
      to={to}
      href={href}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
    />
  )
}
