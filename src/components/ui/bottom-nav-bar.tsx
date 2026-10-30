import { useRef, type ComponentType } from 'react'
import { motion } from 'motion/react'
import { tap } from '@/lib/haptics'
import { useTheme } from '@/lib/theme'
import { useBackdropTone } from '@/lib/use-backdrop-tone'
import { cn } from '@/lib/utils'

export interface BottomNavItem<T extends string = string> {
  id: T
  label: string
  /** Boxicons class, e.g. "bx bx-bell". */
  icon: string
  /** An SVG icon component, drawn instead of the Boxicons one. */
  Icon?: ComponentType<{ className?: string }>
  /** Optional count shown on the icon. */
  badge?: number
  /** A plain red dot (something new here) instead of a count. */
  dot?: boolean
  /** A photo shown instead of the icon (e.g. the customer's profile picture). */
  image?: string | null
}

interface BottomNavBarProps<T extends string> {
  items: Array<BottomNavItem<T>>
  value: T
  onChange: (id: T) => void
  className?: string
  stickyBottom?: boolean
  /** iOS-style transparent "liquid glass" instead of the frosted default. */
  glass?: boolean
  /** With `glass`: what is behind the bar, so icons and labels stay readable. Left out, the bar works it out on its
   *  own as the page moves (white over dark, dark over light). */
  tone?: 'onLight' | 'onDark'
  /** Tighter spacing, for bars with many items next to another button. */
  compact?: boolean
  /** Slides the bar off the bottom of the screen (e.g. while a screen shows its own action button). */
  hidden?: boolean
  /**
   * The newer iOS tab bar (the admin): clearer glass with a bright rim, thinner icons, and a glass lens that slides
   * with a spring to the tab tapped while the tab swells a little under the finger, with a light haptic.
   */
  ios?: boolean
}

// Floating pill navigation: the active item expands to show its label while
// the others collapse to just their icon.
export function BottomNavBar<T extends string>({
  items,
  value,
  onChange,
  className,
  stickyBottom = false,
  glass = false,
  tone,
  hidden = false,
  compact = false,
  ios = false,
}: BottomNavBarProps<T>) {
  const bar = useRef<HTMLElement>(null)
  const { theme } = useTheme()
  const seen = useBackdropTone(bar, theme === 'dark' ? 'dark' : 'light', glass && !tone)
  const onDark = glass && (tone ? tone === 'onDark' : seen === 'dark')
  return (
    <motion.nav
      ref={bar}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={hidden ? { scale: 0.96, opacity: 0, y: 120 } : { scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{ pointerEvents: hidden ? 'none' : 'auto' }}
      aria-hidden={hidden || undefined}
      aria-label="Secções do painel"
      className={cn(
        'flex h-[56px] max-w-[95vw] items-center rounded-full p-2 transition-colors duration-300',
        compact ? 'gap-0' : 'gap-1',
        glass
          ? `${ios ? 'glass-clear' : 'liquid-glass'} ${stickyBottom ? '' : 'relative'}`
          : 'border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.4)] shadow-[0_8px_32px_rgba(26,16,8,0.14)] ring-1 ring-inset ring-[rgba(255,255,255,0.4)] dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(58,40,24,0.5)] dark:shadow-[0_10px_36px_rgba(0,0,0,0.55)] dark:ring-[rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150',
        stickyBottom && 'fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto w-fit',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === value
        return (
          <motion.button
            key={item.id}
            type="button"
            whileTap={ios ? { scale: 1.08 } : { scale: 0.95 }}
            transition={ios ? { type: 'spring', stiffness: 500, damping: 26 } : undefined}
            onClick={() => {
              if (ios && !isActive) void tap()
              onChange(item.id)
            }}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              compact ? 'px-2.5' : 'px-3',
              'relative flex h-10 min-w-[40px] items-center justify-center rounded-full font-subtitle transition-[color,filter,background-color,box-shadow] duration-500 ease-in-out focus:outline-none',
              glass
                ? isActive
                  ? `${ios ? '' : 'liquid-glass-bubble'} ${onDark ? 'text-[#ffffff] [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.25))]' : 'text-onyx'}`
                  : onDark
                    ? 'text-[#ffffff] [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.25))]'
                    : 'text-onyx'
                : isActive
                  ? 'bg-[rgba(255,255,255,0.5)] text-onyx shadow-sm shadow-black/5 dark:bg-[rgba(255,255,255,0.14)]'
                  : 'text-onyx/60 hover:bg-[rgba(255,255,255,0.3)] hover:text-onyx dark:hover:bg-[rgba(255,255,255,0.08)]',
            )}
          >
            {/* The newer iOS lens: one piece of glass that slides from tab to tab. */}
            {ios && isActive && (
              <motion.span
                layoutId="nav-lens"
                aria-hidden="true"
                className="nav-lens absolute inset-0 rounded-full"
                transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
              />
            )}
            <span className={cn('relative text-[22px] leading-none', ios && '[&_svg]:[stroke-width:1.5]')}>
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  className="size-[26px] rounded-full object-cover ring-[1.5px] ring-current"
                />
              ) : item.Icon ? (
                <item.Icon className="size-[22px]" />
              ) : (
                <i className={item.icon} aria-hidden="true" />
              )}
              {item.dot && !item.badge ? (
                <span
                  className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-[rgba(255,255,255,0.9)]"
                  role="status"
                  aria-label="Novidades"
                />
              ) : null}
              {item.badge ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none text-[#ffffff]">
                  {item.badge}
                </span>
              ) : null}
            </span>
            <motion.span
              initial={false}
              animate={{
                width: isActive ? 'auto' : 0,
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? 8 : 0,
              }}
              transition={{
                width: { type: 'spring', stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className="relative flex items-center overflow-hidden"
            >
              <span className="select-none whitespace-nowrap text-xs font-semibold">{item.label}</span>
            </motion.span>
          </motion.button>
        )
      })}
    </motion.nav>
  )
}

export default BottomNavBar
