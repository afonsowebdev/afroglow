import { useEffect, useRef, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PersonCircleFill } from '@/components/ui/apple-icons'
import { cn } from '@/lib/utils'

export interface DesktopLink {
  id: string
  label: string
}

export interface AccountItem {
  label: string
  Icon?: ComponentType<{ className?: string }>
  iconClass?: string
  onClick?: () => void
  href?: string
  danger?: boolean
  /** A thin line above this item, to group the list. */
  divider?: boolean
}

/**
 * The website header on wide screens: the sections as words in a glass pill, booking as its own button, and the
 * account behind the customer's photo. Phones and tablets keep the app's icon tab bar (Navbar).
 */
export function DesktopNav({
  links,
  active,
  onLink,
  onBook,
  bookingActive,
  profileActive,
  tone,
  avatar,
  dot,
  accountLabel,
  accountItems,
}: {
  links: DesktopLink[]
  active: string | null
  onLink: (id: string) => void
  onBook: () => void
  bookingActive: boolean
  profileActive: boolean
  tone: 'onDark' | 'onLight'
  avatar: string | null
  dot: boolean
  /** Name shown at the top of the account menu (or how to sign in). */
  accountLabel: string
  accountItems: AccountItem[]
}) {
  const onDark = tone === 'onDark'
  const ink = onDark ? 'text-[#ffffff] [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.25))]' : 'text-onyx'

  return (
    <div className="pointer-events-auto flex items-center gap-2.5">
      <nav aria-label="Secções" className="liquid-glass flex h-[56px] items-center gap-1 rounded-full px-2">
        {links.map((link) => {
          const isActive = link.id === active
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onLink(link.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'relative h-10 whitespace-nowrap rounded-full px-3 font-subtitle text-sm transition-colors duration-500 xl:px-4',
                ink,
                isActive ? 'font-semibold' : 'opacity-80 hover:opacity-100',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="desktop-nav-active"
                  className="liquid-glass-bubble absolute inset-0 rounded-full"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{link.label}</span>
            </button>
          )
        })}
      </nav>

      {/* The one action of the site, set apart from the sections: plain, solid, no icon. Dark over the light
          sections, white over the video. */}
      <button
        type="button"
        onClick={onBook}
        aria-current={bookingActive ? 'page' : undefined}
        className={cn(
          'h-11 rounded-full px-6 font-subtitle text-sm font-medium tracking-wide transition-colors duration-300',
          onDark ? 'bg-[#ffffff] text-[#1a1008] hover:bg-[#ffffff]/85' : 'bg-onyx text-white hover:bg-onyx/85',
        )}
      >
        Marcar sessão
      </button>

      <AccountMenu
        tone={tone}
        avatar={avatar}
        dot={dot}
        active={profileActive}
        label={accountLabel}
        items={accountItems}
      />
    </div>
  )
}

function AccountMenu({
  tone,
  avatar,
  dot,
  active,
  label,
  items,
}: {
  tone: 'onDark' | 'onLight'
  avatar: string | null
  dot: boolean
  active: boolean
  label: string
  items: AccountItem[]
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Closes on a click anywhere else or on Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="A minha conta"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'liquid-glass relative flex size-[56px] items-center justify-center rounded-full transition-colors duration-500',
          tone === 'onDark' ? 'text-[#ffffff]' : 'text-onyx',
          active && 'ring-2 ring-gold/70',
        )}
      >
        {avatar ? (
          <img src={avatar} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <PersonCircleFill className="size-7" />
        )}
        {dot && (
          <span
            className="absolute right-1.5 top-1.5 size-3 rounded-full bg-red-600 ring-2 ring-[rgba(255,255,255,0.9)]"
            role="status"
            aria-label="Novidades"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full mt-3 w-64 origin-top-right overflow-hidden rounded-2xl border border-onyx/10 bg-white p-1.5 shadow-xl shadow-black/15"
          >
            <p className="px-3 pb-2 pt-2.5 font-subtitle text-xs text-muted-dark">{label}</p>
            {items.map((item) => {
              const content = (
                <>
                  <span className="flex size-5 items-center justify-center text-gold-ink">
                    {item.Icon ? (
                      <item.Icon className="size-[18px]" />
                    ) : (
                      <i className={cn(item.iconClass, 'text-lg')} aria-hidden="true" />
                    )}
                  </span>
                  {item.label}
                </>
              )
              const cls = cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-subtitle text-sm transition-colors hover:bg-cream',
                item.danger ? 'text-red-700 dark:text-red-400' : 'text-onyx',
              )
              return (
                <div key={item.label}>
                  {item.divider && <div className="mx-3 my-1 border-t border-onyx/10" />}
                  {item.href ? (
                    <a role="menuitem" href={item.href} target="_blank" rel="noreferrer" className={cls} onClick={() => setOpen(false)}>
                      {content}
                    </a>
                  ) : (
                    <button
                      role="menuitem"
                      type="button"
                      className={cls}
                      onClick={() => {
                        setOpen(false)
                        item.onClick?.()
                      }}
                    >
                      {content}
                    </button>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
