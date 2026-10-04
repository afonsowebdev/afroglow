import type { MouseEventHandler } from 'react'
import { ButtonWithIcon } from '@/components/ui/button-with-icon'

/**
 * The customer app's one action button: a bordered pill in the system brown with a round icon disc
 * (see `ButtonWithIcon`). `icon` is an icon-font class for the disc; omit it for the default arrow.
 */
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
    <ButtonWithIcon
      label={label}
      variant={variant}
      iconClass={icon}
      to={to}
      href={href}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
    />
  )
}
