import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface BottomNavItem<T extends string = string> {
  id: T
  label: string
  /** Boxicons class, e.g. "bx bx-bell". */
  icon: string
  /** Optional count shown on the icon. */
  badge?: number
}

interface BottomNavBarProps<T extends string> {
  items: Array<BottomNavItem<T>>
  value: T
  onChange: (id: T) => void
  className?: string
  stickyBottom?: boolean
  /** iOS-style transparent "liquid glass" instead of the frosted default. */
  glass?: boolean
  /** With `glass`: what is behind the bar, so icons and labels stay readable. */
  tone?: 'onLight' | 'onDark'
  /** Slides the bar off the bottom of the screen (e.g. while a screen shows its own action button). */
  hidden?: boolean
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
  tone = 'onLight',
  hidden = false,
}: BottomNavBarProps<T>) {
  const onDark = glass && tone === 'onDark'
  return (
    <motion.nav
      initial={{ scale: 0.9, opacity: 0 }}
      animate={hidden ? { scale: 0.96, opacity: 0, y: 120 } : { scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{ pointerEvents: hidden ? 'none' : 'auto' }}
      aria-hidden={hidden || undefined}
      aria-label="Secções do painel"
      className={cn(
        'flex h-[56px] max-w-[95vw] items-center gap-1 rounded-full p-2 transition-colors duration-300',
        glass
          ? `liquid-glass ${stickyBottom ? '' : 'relative'}`
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
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex h-10 min-w-[44px] items-center justify-center rounded-full px-3 font-subtitle transition-colors duration-200 focus:outline-none',
              glass
                ? isActive
                  ? `liquid-glass-bubble ${onDark ? 'text-[#ffffff]' : 'text-onyx'}`
                  : onDark
                    ? 'text-[#ffffff]/80'
                    : 'text-onyx'
                : isActive
                  ? 'bg-[rgba(255,255,255,0.5)] text-onyx shadow-sm shadow-black/5 dark:bg-[rgba(255,255,255,0.14)]'
                  : 'text-onyx/60 hover:bg-[rgba(255,255,255,0.3)] hover:text-onyx dark:hover:bg-[rgba(255,255,255,0.08)]',
            )}
          >
            <span className="relative text-[22px] leading-none">
              <i className={item.icon} aria-hidden="true" />
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
              className="flex items-center overflow-hidden"
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
