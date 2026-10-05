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
              className={cn(buttonSize, 'liquid-glass flex items-center justify-center rounded-full transition-colors')}
              onClick={toggle}
              animate={{ rotate: active ? 45 : 0 }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
            >
              <Plus size={iconSize} strokeWidth={3} className="text-onyx" />
            </motion.button>
          </div>
        </motion.div>

        {icons.map(({ Icon, iconClass, label, href, to, className: itemClassName }, index) => {
          const glyph = Icon ? (
            <Icon size={iconSize} className={iconClasses} />
          ) : (
            <i className={cn(iconClass, iconClasses)} style={{ fontSize: iconSize + 2 }} aria-hidden="true" />
          )
          const circle = cn(buttonSize, 'glass-chip flex items-center justify-center rounded-full', itemClassName)
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

export interface MenuAction {
  Icon?: LucideIcon
  /** Icon-font class for brand logos lucide doesn't ship (e.g. WhatsApp). */
  iconClass?: string
  label: string
  onClick?: () => void
  /** External link (opens in a new tab). */
  href?: string
}

/**
 * Round "+" button for the corner next to the tab bar. Same idea as `AnimatedSocialIcons` (the "+" turns into
 * an "×" and the actions appear out of the blur), but the actions rise upward in a column.
 */
export function FloatingActionMenu({
  actions,
  hidden = false,
  tone = 'onLight',
}: {
  actions: MenuAction[]
  hidden?: boolean
  tone?: 'onLight' | 'onDark'
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      {open && !hidden && (
        <button
          type="button"
          aria-label="Fechar"
          onClick={close}
          className="pointer-events-auto fixed inset-0 z-40 cursor-default bg-black/20"
        />
      )}

      <motion.div
        className="pointer-events-auto relative z-50"
        animate={hidden ? { y: 120, opacity: 0, scale: 0.96 } : { y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ pointerEvents: hidden ? 'none' : 'auto' }}
        aria-hidden={hidden || undefined}
      >
        <div className="absolute bottom-full right-0 mb-3 flex flex-col-reverse items-end gap-2.5">
          {actions.map(({ Icon, iconClass, label, onClick, href }, index) => {
            const glyph = Icon ? (
              <Icon size={20} className="text-onyx" />
            ) : (
              <i className={cn(iconClass, 'text-onyx')} style={{ fontSize: 22 }} aria-hidden="true" />
            )
            const circle =
              'flex size-12 items-center justify-center rounded-full border border-onyx/10 bg-white shadow-md shadow-black/10'
            const run = () => {
              onClick?.()
              close()
            }
            return (
              <motion.div
                key={label}
                className="flex items-center gap-3"
                style={{ pointerEvents: open ? 'auto' : 'none' }}
                initial={false}
                animate={{
                  opacity: open ? 1 : 0,
                  y: open ? 0 : 24,
                  filter: open ? 'blur(0px)' : 'blur(2px)',
                  scale: open ? 1 : 0.9,
                  rotate: open ? 0 : 20,
                }}
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4, delay: open ? index * 0.05 : 0 }}
              >
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    tabIndex={open ? 0 : -1}
                    onClick={close}
                    className={circle}
                  >
                    {glyph}
                  </a>
                ) : (
                  <button type="button" aria-label={label} tabIndex={open ? 0 : -1} onClick={run} className={circle}>
                    {glyph}
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>

        <motion.button
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
          className={cn(
            'liquid-glass flex size-14 items-center justify-center rounded-full',
            tone === 'onDark' ? 'text-[#ffffff]' : 'text-onyx',
          )}
        >
          <Plus size={24} strokeWidth={2.6} />
        </motion.button>
      </motion.div>
    </>
  )
}
