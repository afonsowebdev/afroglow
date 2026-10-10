'use client'

import { motion } from 'motion/react'
import { Plus, type LucideIcon } from 'lucide-react'
import { useState, type ComponentType } from 'react'
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
  /** A lucide icon or any icon component taking `size` (e.g. the Apple-style ones in apple-icons). */
  Icon?: ComponentType<{ size?: number; className?: string }>
  /** Icon-font class for brand logos lucide doesn't ship (e.g. WhatsApp). */
  iconClass?: string
  label: string
  /** Sign-out style action: the name is shown in red. */
  danger?: boolean
  /** A small red count on the label (e.g. items waiting for a decision). */
  badge?: number
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
  dot = false,
  direction = 'up',
  compact = false,
  PlusIcon = Plus,
}: {
  actions: MenuAction[]
  /** The glyph on the round button (turns into an "×" when open). */
  PlusIcon?: ComponentType<{ size?: number; strokeWidth?: number }>
  /** Which way the options open: upward from a bottom button (apps) or downward from a header button (website). */
  direction?: 'up' | 'down'
  /** The small round button used in the website header instead of the big glass one. */
  compact?: boolean
  /** A red dot on the button: something in the list needs attention. */
  dot?: boolean
  hidden?: boolean
  tone?: 'onLight' | 'onDark'
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  // A to Z, read from top to bottom. A column that opens upward is built from the bottom, so it is reversed.
  const alphabetical = [...actions].sort((a, b) => a.label.localeCompare(b.label, 'pt'))
  const ordered = direction === 'up' ? alphabetical.reverse() : alphabetical

  return (
    <>
      {open && !hidden && (
        <button
          type="button"
          aria-label="Fechar"
          onClick={close}
          className="pointer-events-auto fixed inset-0 z-40 cursor-default bg-black/35 backdrop-blur-md"
        />
      )}

      <motion.div
        className={cn('relative z-50', hidden ? 'pointer-events-none' : 'pointer-events-auto')}
        animate={hidden ? { y: 120, opacity: 0, scale: 0.96 } : { y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ pointerEvents: hidden ? 'none' : 'auto' }}
        aria-hidden={hidden || undefined}
      >
        {/* The column itself never takes taps (it would cover the page above the button); each item does when open. */}
        <div
          className={cn(
            'pointer-events-none absolute right-0 flex items-end gap-2.5',
            direction === 'up' ? 'bottom-full mb-3 flex-col-reverse' : 'top-full mt-3 flex-col',
          )}
        >
          {ordered.map(({ Icon, iconClass, label, danger, badge, onClick, href }, index) => {
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
                  y: open ? 0 : direction === 'up' ? 24 : -24,
                  filter: open ? 'blur(0px)' : 'blur(2px)',
                  scale: open ? 1 : 0.9,
                  rotate: open ? 0 : 20,
                }}
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4, delay: open ? index * 0.05 : 0 }}
              >
                <span
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-full border border-onyx/10 bg-white px-3.5 py-1.5 font-subtitle text-xs font-medium shadow-md shadow-black/10',
                    danger ? 'text-red-700' : 'text-onyx',
                  )}
                >
                  {label}
                  {badge ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none text-[#ffffff]">
                      {badge}
                    </span>
                  ) : null}
                </span>
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
          // Apps: only the thin rim, no shadow under the button.
          style={
            compact
              ? undefined
              : { boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 0 0 0.5px rgba(0, 0, 0, 0.1)' }
          }
          className={
            compact
              ? 'flex size-9 items-center justify-center rounded-full border border-onyx/20 text-onyx/60 transition-colors duration-300 hover:text-onyx'
              : cn(
                  'liquid-glass flex size-14 items-center justify-center rounded-full transition-colors duration-500 ease-in-out',
                  tone === 'onDark' ? 'text-[#ffffff]' : 'text-onyx',
                )
          }
        >
          <PlusIcon size={compact ? 18 : 24} strokeWidth={2.6} />
        </motion.button>
        {dot && !open ? (
          <span
            className="pointer-events-none absolute right-0 top-0 size-3.5 rounded-full bg-red-600 ring-2 ring-white"
            role="status"
            aria-label="Há itens por rever"
          />
        ) : null}
      </motion.div>
    </>
  )
}
