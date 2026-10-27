'use client'

import { motion } from 'motion/react'
import { Plus, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import { ROUND_SAMPLES, useBackdropTone } from '@/lib/use-backdrop-tone'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { BRAND_CIRCLE } from '@/components/ui/brand-logo'

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
  /** With `grouped`: the title of the card this action sits in (actions in a row with the same one share a card). */
  group?: string
}

/**
 * Round "+" button for the corner next to the tab bar. Same idea as `AnimatedSocialIcons` (the "+" turns into
 * an "×" and the actions appear out of the blur), but the actions rise upward in a column.
 */
export function FloatingActionMenu({
  actions,
  hidden = false,
  tone,
  dot = false,
  direction = 'up',
  compact = false,
  small = false,
  grid = false,
  brand = false,
  grouped = false,
  PlusIcon = Plus,
}: {
  actions: MenuAction[]
  /**
   * Opening upward: the actions in the order given, as white cards under their `group` titles (like the iPhone's
   * Settings), in a panel that never grows past the top of the screen and scrolls inside instead.
   */
  grouped?: boolean
  /** The glyph on the round button (turns into an "×" when open). */
  PlusIcon?: ComponentType<{ size?: number; strokeWidth?: number }>
  /** Which way the options open: upward from a bottom button (apps) or downward from a header button (website). */
  direction?: 'up' | 'down'
  /** The small round button used in the website header instead of the big glass one. */
  compact?: boolean
  /** Opening downward: the options in two columns, each a pill with its icon and name, so a long list stays short. */
  grid?: boolean
  /** In the logo's colours (BRAND_CIRCLE) instead of glass, beside the "A". */
  brand?: boolean
  /** The glass button at 48px instead of 56px (the app's top row, beside the bell). */
  small?: boolean
  /** A red dot on the button: something in the list needs attention. */
  dot?: boolean
  hidden?: boolean
  tone?: 'onLight' | 'onDark'
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  // The page behind stays still while the menu is open.
  useScrollLock(open && !hidden)
  // While it is open (and a moment after), the notifications' bell ignores taps.
  useEffect(() => {
    const root = document.documentElement
    if (open) {
      root.dataset.overlay = 'menu'
      return
    }
    const timer = window.setTimeout(() => root.dataset.overlay === 'menu' && delete root.dataset.overlay, 400)
    return () => window.clearTimeout(timer)
  }, [open])
  // The glass button's "+" follows what is behind it on its own, unless told (white over dark, dark over light).
  const round = useRef<HTMLButtonElement>(null)
  const { theme } = useTheme()
  const seen = useBackdropTone(round, theme === 'dark' ? 'dark' : 'light', !brand && !compact && !tone, ROUND_SAMPLES)
  const onDark = tone ? tone === 'onDark' : seen === 'dark'
  // A to Z, read from top to bottom. A column that opens upward is built from the bottom, so it is reversed.
  const alphabetical = [...actions].sort((a, b) => a.label.localeCompare(b.label, 'pt'))
  const ordered = direction === 'up' ? alphabetical.reverse() : alphabetical
  // Actions in a row with the same group share one card.
  const sections: { title?: string; items: MenuAction[] }[] = []
  for (const action of actions) {
    const last = sections[sections.length - 1]
    if (last && last.title === action.group) last.items.push(action)
    else sections.push({ title: action.group, items: [action] })
  }

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
        {grouped ? (
          <motion.div
            className="absolute bottom-full right-0 mb-3 flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-8rem)] w-[min(calc(100vw-1.5rem),17.5rem)] origin-bottom-right flex-col gap-3 overflow-y-auto overscroll-contain"
            style={{ pointerEvents: open ? 'auto' : 'none' }}
            initial={false}
            animate={{
              opacity: open ? 1 : 0,
              y: open ? 0 : 24,
              scale: open ? 1 : 0.95,
              filter: open ? 'blur(0px)' : 'blur(2px)',
            }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
          >
            {sections.map((section, index) => (
              <section key={section.title ?? index}>
                {section.title && (
                  <h2 className="mb-1.5 px-3 font-subtitle text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#ffffff]/85">
                    {section.title}
                  </h2>
                )}
                <div className="divide-y divide-onyx/10 overflow-hidden rounded-2xl bg-white shadow-md shadow-black/10">
                  {section.items.map(({ Icon, iconClass, label, danger, badge, onClick, href }) => {
                    const content = (
                      <>
                        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-onyx/[0.06]">
                          {Icon ? (
                            <Icon size={16} className={danger ? 'text-red-700' : 'text-onyx'} />
                          ) : (
                            <i className={cn(iconClass, 'text-onyx')} style={{ fontSize: 17 }} aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {badge ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] leading-none text-[#ffffff]">
                            {badge}
                          </span>
                        ) : null}
                      </>
                    )
                    const itemClass = cn(
                      'flex h-10 w-full items-center gap-3 px-3 text-left font-subtitle text-sm font-medium transition-colors hover:bg-onyx/5',
                      danger ? 'text-red-700' : 'text-onyx',
                    )
                    return href ? (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={open ? 0 : -1}
                        onClick={close}
                        className={itemClass}
                      >
                        {content}
                      </a>
                    ) : (
                      <button
                        key={label}
                        type="button"
                        tabIndex={open ? 0 : -1}
                        onClick={() => {
                          onClick?.()
                          close()
                        }}
                        className={itemClass}
                      >
                        {content}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </motion.div>
        ) : grid && direction === 'down' ? (
          // Two columns under the button, read row by row; the panel only takes taps while open.
          <div
            className="absolute right-0 top-full mt-3 grid w-[min(calc(100vw-2rem),23rem)] grid-cols-2 gap-2"
            style={{ pointerEvents: open ? 'auto' : 'none' }}
          >
            {ordered.map(({ Icon, iconClass, label, danger, badge, onClick, href }, index) => {
              const content = (
                <>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-onyx/[0.06]">
                    {Icon ? (
                      <Icon size={18} className={danger ? 'text-red-700' : 'text-onyx'} />
                    ) : (
                      <i className={cn(iconClass, 'text-onyx')} style={{ fontSize: 19 }} aria-hidden="true" />
                    )}
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-left leading-tight">{label}</span>
                  {badge ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none text-[#ffffff]">
                      {badge}
                    </span>
                  ) : null}
                </>
              )
              const itemClass = cn(
                'flex h-12 w-full items-center gap-2.5 rounded-full border border-onyx/10 bg-white pl-1.5 pr-3.5 font-subtitle text-[13px] font-medium shadow-md shadow-black/10',
                danger ? 'text-red-700' : 'text-onyx',
              )
              const run = () => {
                onClick?.()
                close()
              }
              return (
                <motion.div
                  key={label}
                  initial={false}
                  animate={{
                    opacity: open ? 1 : 0,
                    y: open ? 0 : -16,
                    filter: open ? 'blur(0px)' : 'blur(2px)',
                    scale: open ? 1 : 0.92,
                  }}
                  transition={{ type: 'tween', ease: 'easeInOut', duration: 0.32, delay: open ? index * 0.03 : 0 }}
                >
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={open ? 0 : -1}
                      onClick={close}
                      className={itemClass}
                    >
                      {content}
                    </a>
                  ) : (
                    <button type="button" tabIndex={open ? 0 : -1} onClick={run} className={itemClass}>
                      {content}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          // The column itself never takes taps (it would cover the page above the button); each item does when open.
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
        )}

        <motion.button
          ref={round}
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => {
            // Not while the notifications are open: a tap there only closes them.
            if (document.documentElement.dataset.overlay === 'bell') return
            setOpen((current) => !current)
          }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'tween', ease: 'easeInOut', duration: 0.5 }}
          // Apps: only the thin rim, no shadow under the button.
          style={
            compact || brand
              ? undefined
              : { boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 0 0 0.5px rgba(0, 0, 0, 0.1)' }
          }
          className={
            compact
              ? 'flex size-9 items-center justify-center rounded-full border border-onyx/20 text-onyx/60 transition-colors duration-300 hover:text-onyx'
              : cn(
                  'flex items-center justify-center rounded-full',
                  small ? 'size-12' : 'size-14',
                  'transition-colors duration-500 ease-in-out',
                  brand ? BRAND_CIRCLE : cn('liquid-glass', onDark ? 'text-[#ffffff]' : 'text-[#1a1008]'),
                )
          }
        >
          <PlusIcon size={compact ? 18 : small ? 22 : 24} strokeWidth={2.6} />
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
