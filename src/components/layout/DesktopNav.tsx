import { useEffect, useRef, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PersonCircleFill } from '@/components/ui/apple-icons'
import { ButtonWithIcon } from '@/components/ui/button-with-icon'
import { cn } from '@/lib/utils'

export interface DesktopLink {
  id: string
  label: string
}

export interface AccountItem {
  label: string
  /** An outline icon (lucide), drawn in the menu's neutral grey. */
  Icon?: ComponentType<{ className?: string; strokeWidth?: number }>
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
  inBar = false,
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
  /** Inside one header bar (which holds the glass): no glass of their own, booking as a filled button. */
  inBar?: boolean
}) {
  const onDark = tone === 'onDark'
  const ink = onDark ? 'text-[#ffffff] [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.25))]' : 'text-onyx'

  return (
    // In the bar the pieces join it: the sections centred on the header row, booking on the right.
    <div className={inBar ? 'contents' : 'pointer-events-auto flex items-center gap-2.5'}>
      <nav
        aria-label="Secções"
        className={cn(
          'flex items-center gap-1 rounded-full',
          // The bar's glass makes it the positioning box, and the bar stops short of the account circle beside it:
          // shifting by half that circle (plus the gap) centres the sections on the whole header row.
          inBar
            ? 'absolute left-[calc(50%+(var(--account-size,3.5rem)+0.625rem)/2)] h-10 -translate-x-1/2 transition-[left] duration-500'
            : 'liquid-glass h-[56px] px-2',
        )}
      >
        {links.map((link) => {
          const isActive = link.id === active
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onLink(link.id)}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'relative h-9 whitespace-nowrap rounded-full px-3 font-subtitle text-sm transition-colors duration-500 xl:px-4',
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

      <div className={inBar ? 'flex items-center gap-2' : 'contents'}>
      {/* The one action of the site, set apart from the sections. */}
      <ButtonWithIcon
        label="Agendar"
        tone={tone}
        solid={inBar}
        onClick={onBook}
        aria-current={bookingActive ? 'page' : undefined}
      />

      {!inBar && (
      <AccountMenu
        tone={tone}
        avatar={avatar}
        dot={dot}
        active={profileActive}
        label={accountLabel}
        items={accountItems}
      />
      )}
      </div>
    </div>
  )
}

export function AccountMenu({
  tone,
  avatar,
  dot,
  active,
  label,
  items,
  bare = false,
  className,
}: {
  tone: 'onDark' | 'onLight'
  /** Without its own glass (inside the header bar). */
  bare?: boolean
  /** Size override for the round button (e.g. to match the header bar's height). */
  className?: string
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
          'relative flex items-center justify-center rounded-full transition-colors duration-500',
          bare ? 'size-12' : 'liquid-glass size-[56px]',
          className,
          tone === 'onDark' ? 'text-[#ffffff]' : 'text-onyx',
          active && 'ring-2 ring-gold/70',
        )}
      >
        {/* The photo or icon fills the circle, leaving only a thin glass rim around it. */}
        {avatar ? (
          <img src={avatar} alt="" className={cn('rounded-full object-cover', bare ? 'size-10' : 'size-[84%]')} />
        ) : (
          <PersonCircleFill className={bare ? 'size-10' : 'size-[84%]'} />
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
                  <span className={cn('flex size-5 items-center justify-center', item.danger ? '' : 'text-onyx/60')}>
                    {item.Icon ? (
                      <item.Icon className="size-[18px]" strokeWidth={1.75} />
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
