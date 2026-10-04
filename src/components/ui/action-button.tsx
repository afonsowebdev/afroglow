import type { MouseEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import { MotionButton } from '@/components/ui/motion-button'
import { tap } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/**
 * The system's own button (`MotionButton`: white pill, round icon disc that slides across) for the customer
 * app. Adds in-app navigation (`to`) and a light haptic tap. `icon` is an icon-font class for the disc; omit it
 * for the arrow.
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
      variant={variant}
      icon={icon ? <i className={cn(icon, 'text-lg')} aria-hidden="true" /> : undefined}
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      type={type}
      disabled={disabled}
      onClick={type === 'submit' ? undefined : handle}
      className={className}
    />
  )
}
