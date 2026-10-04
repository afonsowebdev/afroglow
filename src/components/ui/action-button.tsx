import type { MouseEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import { MotionButton } from '@/components/ui/motion-button'
import { tap } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/**
 * The customer app's action button: the same pill the admin app uses (round icon disc that slides across on
 * hover/press), here full width, with a chocolate border and disc. `icon` is an icon-font class for the disc;
 * omit it for the sliding arrow.
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
  const navigate = useNavigate()
  const handle: MouseEventHandler<HTMLElement> = (event) => {
    void tap('medium')
    onClick?.(event)
    if (to) navigate(to)
  }

  return (
    <MotionButton
      label={label}
      variant={variant === 'primary' ? 'cocoa' : 'secondary'}
      icon={icon ? <i className={cn(icon, 'text-lg')} aria-hidden="true" /> : undefined}
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      type={type}
      disabled={disabled}
      onClick={type === 'submit' ? undefined : handle}
      className={cn('w-full border-2', variant === 'primary' ? 'border-cocoa' : 'border-onyx/25', className)}
    />
  )
}
