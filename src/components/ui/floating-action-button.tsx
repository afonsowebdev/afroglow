'use client'

import { motion } from 'motion/react'
import { ChevronUp, Ellipsis, Plus, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
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
  /** Actions in a row with the same group sit together, and the next group starts a little apart. */
  group?: string
  /** The menu stays open after it (e.g. "Mais opções"). */
  keepOpen?: boolean
  /** Under "Mais opções": asks once more before running (the name turns into this, e.g. "Sair?"). */
  confirm?: string
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
  face,
  faceLabel = 'menu',
  keepOrder = false,
  more,
  bare = false,
  shrink = false,
  smallItems = false,
  raised = false,
  onOpenChange,
  PlusIcon = Plus,
}: {
  actions: MenuAction[]
  /** What fills the round button instead of the "+" (e.g. the account's photo); it stays still instead of turning into an "×". */
  face?: ReactNode
  /** The actions in the order given, read top to bottom, instead of A to Z (see `group`). */
  keepOrder?: boolean
  /** Hidden under a last "Mais opções" until it is tapped: then in a smaller column to its left, going down, in the order given. */
  more?: MenuAction[]
  /** A plain 40px round button with no fill, for sitting inside a glass island. */
  bare?: boolean
  /** The round button a little smaller (a header that has scrolled); the menu keeps its place. */
  shrink?: boolean
  /** Every option, main or under "Mais opções", the same size (44px buttons, names a little larger). */
  smallItems?: boolean
  /** The button stays clear above the blur of any menu opened beside it (a header that stays sharp). */
  raised?: boolean
  /** Told when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** With `face`: what the button opens, for screen readers ("Abrir conta"). */
  faceLabel?: string
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
  const [showMore, setShowMore] = useState(false)
  // The option under "Mais opções" waiting for its second tap.
  const [confirming, setConfirming] = useState<string | null>(null)
  const close = () => {
    setOpen(false)
    setShowMore(false)
    setConfirming(null)
  }
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
  useEffect(() => onOpenChange?.(open), [open, onOpenChange])
  // The glass button's "+" follows what is behind it on its own, unless told (white over dark, dark over light).
  const round = useRef<HTMLButtonElement>(null)
  const { theme } = useTheme()
  const seen = useBackdropTone(round, theme === 'dark' ? 'dark' : 'light', !brand && !compact && !tone, ROUND_SAMPLES)
  const onDark = tone ? tone === 'onDark' : seen === 'dark'
  // A to Z, read from top to bottom. A column that opens upward is built from the bottom, so it is reversed.
  const alphabetical = [...actions].sort((a, b) => a.label.localeCompare(b.label, 'pt'))
  const extra: MenuAction[] = more?.length
    ? [
        {
          Icon: showMore ? ChevronUp : Ellipsis,
          label: showMore ? 'Menos opções' : 'Mais opções',
          group: 'mais',
          keepOpen: true,
          onClick: () => {
            setShowMore((current) => !current)
            setConfirming(null)
          },
        },
      ]
    : []
  // "Mais opções" opens the rest just below it, like a dropdown; the main options stay.
  const listed = [...(keepOrder ? actions : alphabetical), ...extra]
  const ordered = direction === 'up' ? listed.reverse() : listed

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
        className={cn('relative', raised ? 'z-[62]' : 'z-50', hidden ? 'pointer-events-none' : 'pointer-events-auto')}
        animate={hidden ? { y: 120, opacity: 0, scale: 0.96 } : { y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ pointerEvents: hidden ? 'none' : 'auto' }}
        aria-hidden={hidden || undefined}
      >
        {grid && direction === 'down' ? (
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
              'pointer-events-none absolute right-0 flex items-end',
              // 44px buttons centred under the 48px round one.
              smallItems ? 'gap-2.5 pe-0.5' : keepOrder ? 'gap-1.5' : 'gap-2.5',
              direction === 'up' ? 'bottom-full mb-3 flex-col-reverse' : 'top-full mt-3 flex-col',
            )}
          >
            {ordered.map(({ Icon, iconClass, label, danger, badge, onClick, href, group, keepOpen }, index) => {
              // The one just above on screen: a new group starts a little apart from it.
              const above = direction === 'up' ? ordered[index + 1] : ordered[index - 1]
              const apart = above !== undefined && above.group !== group
              const glyph = Icon ? (
                <Icon size={smallItems ? 19 : 20} className="text-onyx" />
              ) : (
                <i className={cn(iconClass, 'text-onyx')} style={{ fontSize: smallItems ? 21 : 22 }} aria-hidden="true" />
              )
              const circle =
                cn(
                  'flex items-center justify-center rounded-full border border-onyx/10 bg-white shadow-md shadow-black/10',
                  smallItems ? 'size-11' : 'size-12',
                )
              const run = () => {
                onClick?.()
                if (!keepOpen) close()
              }
              return (
                <motion.div
                  key={label}
                  className={cn('flex items-center', smallItems ? 'gap-2.5' : 'gap-3', apart && 'mt-2')}
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
                      'flex items-center gap-2 whitespace-nowrap rounded-full border border-onyx/10 bg-white font-subtitle font-medium shadow-md shadow-black/10',
                      smallItems ? 'px-4 py-2 text-[13px]' : 'px-3.5 py-1.5 text-xs',
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
            {/* What "Mais opções" opens: a column to the left of the main one, starting level with "Mais opções" and going
                down from there, smaller and closer together, each like the options beside it (the name in a white pill
                and its round button); the app's own settings (group "app") a little apart at the end. */}
            {open && showMore && more && (
              <div
                className={cn(
                  'pointer-events-auto absolute right-[calc(100%+0.5rem)] flex flex-col items-end',
                  smallItems ? 'top-[calc(100%-2.75rem)] gap-2.5' : 'top-[calc(100%-2.625rem)] gap-1.5',
                )}
              >
                {more.map(({ Icon, iconClass, label, danger, onClick, confirm, group }, index) => {
                  const asking = confirming === label
                  const apart = group === 'app' && more[index - 1]?.group !== 'app'
                  return (
                    <motion.button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (confirm && !asking) return setConfirming(label)
                        onClick?.()
                        close()
                      }}
                      initial={{ opacity: 0, x: 12, filter: 'blur(2px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      transition={{ type: 'tween', ease: 'easeOut', duration: 0.25, delay: index * 0.03 }}
                      className={cn('flex items-center gap-2', apart && 'mt-2')}
                    >
                      <span
                        className={cn(
                          'whitespace-nowrap rounded-full border border-onyx/10 bg-white font-subtitle font-medium shadow-md shadow-black/10',
                          smallItems ? 'px-4 py-2 text-[13px]' : 'px-3 py-1 text-xs',
                          danger || asking ? 'text-red-700' : 'text-onyx',
                        )}
                      >
                        {asking ? confirm : label}
                      </span>
                      <span
                        className={cn(
                          'flex shrink-0 items-center justify-center rounded-full border shadow-md shadow-black/10 transition-colors',
                          smallItems ? 'size-11' : 'size-9',
                          asking ? 'border-red-700 bg-red-700' : 'border-onyx/10 bg-white',
                        )}
                      >
                        {Icon ? (
                          <Icon size={smallItems ? 19 : 16} className={asking ? 'text-[#ffffff]' : danger ? 'text-red-700' : 'text-onyx'} />
                        ) : (
                          <i className={cn(iconClass, 'text-onyx')} style={{ fontSize: 18 }} aria-hidden="true" />
                        )}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <motion.button
          ref={round}
          type="button"
          aria-label={open ? `Fechar ${faceLabel}` : `Abrir ${faceLabel}`}
          aria-expanded={open}
          onClick={() => {
            // Not while the notifications are open: a tap there only closes them.
            if (document.documentElement.dataset.overlay === 'bell') return
            // Nor while another menu is open.
            if (!open && document.documentElement.dataset.overlay === 'menu') return
            setOpen((current) => !current)
            setShowMore(false)
            setConfirming(null)
          }}
          animate={{ rotate: open && !face ? 45 : 0, scale: shrink ? 0.86 : 1 }}
          // The same curve and length as the admin header's CSS, so every button moves together.
          transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.5 }}
          // Apps: only the thin rim, no shadow under the button.
          style={
            compact || brand || bare
              ? undefined
              : { boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 0 0 0.5px rgba(0, 0, 0, 0.1)' }
          }
          className={
            bare
              ? 'flex size-10 items-center justify-center rounded-full text-onyx transition-colors hover:bg-onyx/[0.06]'
              : compact
              ? 'flex size-9 items-center justify-center rounded-full border border-onyx/20 text-onyx/60 transition-colors duration-300 hover:text-onyx'
              : cn(
                  'flex items-center justify-center overflow-hidden rounded-full',
                  small ? 'size-12' : 'size-14',
                  'transition-colors duration-500 ease-in-out',
                  brand ? BRAND_CIRCLE : cn('liquid-glass', onDark ? 'text-[#ffffff]' : 'text-[#1a1008]'),
                )
          }
        >
          {face ?? <PlusIcon size={bare ? 19 : compact ? 18 : small ? 22 : 24} strokeWidth={bare ? 2.2 : 2.6} />}
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
