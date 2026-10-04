'use client'

import { motion } from 'motion/react'
import { Plus, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface ActionIcon {
  /** A lucide icon... */
  Icon?: LucideIcon
  /** ...or an icon-font class (brand logos like WhatsApp / Instagram, which lucide no longer ships). */
  iconClass?: string
  label?: string
  /** External link (opens in a new tab). */
  href?: string
  /** In-app route. */
  to?: string
  className?: string
}

interface AnimatedSocialIconsProps {
  icons: ActionIcon[]
  className?: string
  iconSize?: number
  onToggle?: (open: boolean) => void
}

const buttonSize = 'size-12'
// Each action sits in a fixed-width column so the row (and where the "+" ends up) has a known width.
const COLUMN = 'w-[58px]'
const GAP = 8

/**
 * A "+" button that slides away to reveal a row of round action buttons. Originally the shadcn
 * floating-action-button; colours are mapped to this project's tokens (white / gold / onyx).
 */
export function AnimatedSocialIcons({ icons, className, iconSize = 22, onToggle }: AnimatedSocialIconsProps) {
  const [active, setActive] = useState(false)

  const toggle = () => {
    setActive((current) => {
      onToggle?.(!current)
      return !current
    })
  }

  const iconClasses = 'text-muted-dark transition-all hover:scale-110 hover:text-onyx'

  return (
    <div className={cn('relative flex w-full items-start justify-start overflow-x-clip', className)}>
      <div className="relative flex items-start justify-start" style={{ gap: GAP }}>
        <motion.div
          className="absolute left-0 z-10 w-full bg-white"
          animate={{ x: active ? `calc(100% + ${GAP}px)` : 0 }}
          transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
        >
          <div className={cn(COLUMN, 'flex justify-center')}>
            <motion.button
              type="button"
              aria-label={active ? 'Fechar atalhos' : 'Abrir atalhos'}
              aria-expanded={active}
              className={cn(
                buttonSize,
                'flex items-center justify-center rounded-full bg-brand shadow-lg shadow-brand/30 transition-colors hover:bg-brand/90',
              )}
              onClick={toggle}
              animate={{ rotate: active ? 45 : 0 }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
            >
              <Plus size={iconSize} strokeWidth={3} className="text-brand-ink" />
            </motion.button>
          </div>
        </motion.div>

        {icons.map(({ Icon, iconClass, label, href, to, className: itemClassName }, index) => {
          const glyph = Icon ? (
            <Icon size={iconSize} className={iconClasses} />
          ) : (
            <i className={cn(iconClass, iconClasses)} style={{ fontSize: iconSize + 2 }} aria-hidden="true" />
          )
          const circle = cn(
            buttonSize,
            'flex items-center justify-center rounded-full border border-gold/30 bg-white shadow-lg hover:shadow-xl',
            itemClassName,
          )
          const interactive = active ? 'auto' : 'none'
          return (
            <div
              key={index}
              className={cn('flex flex-col items-center gap-2', COLUMN)}
              style={{ pointerEvents: interactive }}
            >
              <motion.div
                className={circle}
                animate={{
                  filter: active ? 'blur(0px)' : 'blur(2px)',
                  scale: active ? 1 : 0.9,
                  rotate: active ? 0 : 45,
                }}
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4 }}
              >
                {to ? (
                  <Link
                    to={to}
                    aria-label={label}
                    tabIndex={active ? 0 : -1}
                    className="flex size-full items-center justify-center"
                  >
                    {glyph}
                  </Link>
                ) : href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    tabIndex={active ? 0 : -1}
                    className="flex size-full items-center justify-center"
                  >
                    {glyph}
                  </a>
                ) : (
                  glyph
                )}
              </motion.div>
              {label && (
                <motion.span
                  className="whitespace-nowrap font-subtitle text-[10.5px] text-onyx"
                  animate={{ opacity: active ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: active ? 0.25 : 0 }}
                >
                  {label}
                </motion.span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
