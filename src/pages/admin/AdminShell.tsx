import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LogOut, Moon, Sun, X, type LucideIcon } from 'lucide-react'
import { tap } from '@/lib/haptics'
import { cn } from '@/lib/utils'

/*
 * The AFRO ADMIN frame, in the Rende+ system: a sticky top bar of separate liquid-glass islands (the logo, the pages
 * as pills on wide screens, the tools, the profile); on a computer a floating rail on the left (theme · pages ·
 * quick settings); on a phone or tablet a dock at the bottom, like the iPhone's tab bar, whose "Mais" opens a sheet
 * with the rest. The active page carries the brand gradient, which glides from one item to the next.
 */

export interface NavItem {
  id: string
  label: string
  Icon: LucideIcon
  /** A small red count (things waiting). */
  badge?: number
}

const spring = { type: 'spring', stiffness: 500, damping: 38 } as const

function Badge({ count, className }: { count?: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'tabular absolute flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-neg px-1 text-[10px] font-semibold leading-none text-[#ffffff]',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

/** Fades the page behind the top bar once it scrolls under it. */
function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return scrolled
}

export function AdminTopBar({
  logo,
  nav,
  active,
  onNavigate,
  tools,
  profile,
  raised = false,
}: {
  logo: ReactNode
  nav: NavItem[]
  active: string
  onNavigate: (id: string) => void
  /** Search, notifications, the "+" menu… inside one island. */
  tools: ReactNode
  profile: ReactNode
  /** Above the blur of an open menu. */
  raised?: boolean
}) {
  const scrolled = useScrolled()
  return (
    <header
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:px-6',
        raised ? 'z-[55]' : 'z-50',
      )}
    >
      {/* Behind the islands once the page scrolls: the background fading out, softly blurred. */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-[calc(5rem+env(safe-area-inset-top))] transition-opacity duration-300',
          scrolled ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: 'linear-gradient(to bottom, var(--c-bg) 35%, transparent)',
          WebkitBackdropFilter: 'blur(6px)',
          backdropFilter: 'blur(6px)',
          maskImage: 'linear-gradient(to bottom, black 55%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent)',
        }}
      />
      <div className="relative flex items-center gap-2">
        <div className="pointer-events-auto relative z-[62]">{logo}</div>

        <nav aria-label="Páginas" className="pointer-events-auto mx-auto hidden xl:block">
          <ul className="glass-island flex h-12 items-center gap-1 rounded-full p-1">
            {nav.map(({ id, label, badge }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={active === id ? 'page' : undefined}
                  className={cn(
                    'relative flex h-10 items-center rounded-full px-4 text-[13px] font-medium transition-colors',
                    active === id ? 'text-[var(--c-brand-ink)]' : 'text-ink-2 hover:text-ink',
                  )}
                >
                  {active === id && <motion.span layoutId="top-nav-active" transition={spring} className="brand-gradient absolute inset-0 rounded-full" />}
                  <span className="relative">{label}</span>
                  <Badge count={badge} className="-right-0.5 -top-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="pointer-events-auto relative z-[62] ml-auto flex items-center gap-2 xl:ml-0">
          <div className="glass-island flex h-12 items-center gap-0.5 rounded-full p-1">{tools}</div>
          {profile}
        </div>
      </div>
    </header>
  )
}

/** One icon of the computer's rail, with its name as a tooltip. */
function RailButton({
  item,
  active,
  group,
  danger = false,
  onClick,
}: {
  item: NavItem
  active?: boolean
  group: string
  danger?: boolean
  onClick: () => void
}) {
  const { Icon, label, badge } = item
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={cn(
        'group relative flex size-12 items-center justify-center rounded-full transition-colors',
        active ? 'text-[var(--c-brand-ink)]' : danger ? 'text-neg hover:bg-surface-3/70' : 'text-ink-2 hover:bg-surface-3/70 hover:text-ink',
      )}
    >
      {active && <motion.span layoutId={`rail-active-${group}`} transition={spring} className="brand-gradient absolute inset-0 rounded-full" />}
      <Icon size={20} className="relative" />
      <Badge count={badge} className="right-0.5 top-0.5" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium text-surface opacity-0 shadow-[var(--shadow-pop)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
  )
}

/** The computer's floating rail: theme · pages · quick settings and signing out. */
export function AdminRail({
  nav,
  quick,
  active,
  dark,
  onToggleTheme,
  onNavigate,
  onSignOut,
}: {
  nav: NavItem[]
  quick: NavItem[]
  active: string
  dark: boolean
  onToggleTheme: () => void
  onNavigate: (id: string) => void
  onSignOut: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <aside
      aria-label="Navegação"
      className="fixed bottom-6 left-4 top-[calc(env(safe-area-inset-top)+0.75rem+3rem+clamp(24px,7vh,80px))] z-40 hidden w-[84px] flex-col items-center justify-between gap-3 lg:flex"
    >
      <div className="glass-island flex flex-col rounded-full p-1.5">
        <RailButton
          item={{ id: 'tema', label: dark ? 'Tema claro' : 'Tema escuro', Icon: dark ? Sun : Moon }}
          group="tema"
          onClick={onToggleTheme}
        />
      </div>
      <nav className="glass-island flex flex-col gap-1 rounded-full p-1.5">
        {nav.map((item) => (
          <RailButton key={item.id} item={item} group="nav" active={active === item.id} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>
      <div className="glass-island flex flex-col gap-1 rounded-full p-1.5">
        {quick.map((item) => (
          <RailButton key={item.id} item={item} group="quick" active={active === item.id} onClick={() => onNavigate(item.id)} />
        ))}
        <RailButton
          item={{ id: 'sair', label: confirming ? 'Toca de novo para sair' : 'Terminar sessão', Icon: LogOut }}
          group="quick"
          danger
          onClick={() => {
            if (!confirming) {
              setConfirming(true)
              window.setTimeout(() => setConfirming(false), 3000)
              return
            }
            onSignOut()
          }}
        />
      </div>
    </aside>
  )
}

/** The phone and tablet dock: icon and name, like the iPhone's tab bar, floating above the bottom edge. */
export function AdminDock({
  items,
  active,
  hidden,
  onNavigate,
  beside,
}: {
  items: NavItem[]
  active: string
  hidden: boolean
  onNavigate: (id: string) => void
  /** Shown to the right of the dock (the back-to-top button). */
  beside?: ReactNode
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(10px+env(safe-area-inset-bottom))] z-50 flex items-end justify-center px-4 lg:hidden">
      <motion.nav
        aria-label="Páginas"
        animate={{ y: hidden ? 120 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className={cn('glass-island flex rounded-[26px] p-1', hidden ? 'pointer-events-none' : 'pointer-events-auto')}
      >
        {items.map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              void tap()
              onNavigate(id)
            }}
            aria-current={active === id ? 'page' : undefined}
            className={cn(
              'relative flex h-[52px] w-[62px] flex-col items-center justify-center gap-0.5 rounded-[22px] transition-colors',
              active === id ? 'text-[var(--c-brand-ink)]' : 'text-ink-2',
            )}
          >
            {active === id && <motion.span layoutId="dock-active" transition={spring} className="brand-gradient absolute inset-0 rounded-[22px]" />}
            <Icon size={21} className="relative" />
            <span className="relative text-[10.5px] font-medium leading-none">{label}</span>
            <Badge count={badge} className="right-2.5 top-1" />
          </button>
        ))}
      </motion.nav>
      {beside}
    </div>
  )
}

/** The dock's "Mais": the rest of the panel in a sheet from the bottom. */
export function AdminMoreSheet({
  open,
  items,
  extras,
  onNavigate,
  onClose,
}: {
  open: boolean
  items: NavItem[]
  /** Settings of the app itself (theme, sign out…), below the pages. */
  extras: Array<NavItem & { danger?: boolean; confirm?: string; run: () => void }>
  onNavigate: (id: string) => void
  onClose: () => void
}) {
  const [confirming, setConfirming] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const tile = (item: NavItem, onClick: () => void, danger = false, label = item.label) => (
    <button key={item.id} type="button" onClick={onClick} className="relative flex flex-col items-center gap-2 rounded-2xl p-2 hover:bg-surface-2">
      <span
        className={cn(
          'relative flex size-12 items-center justify-center rounded-full border border-line bg-surface-2',
          danger ? 'text-neg' : 'text-ink',
        )}
      >
        <item.Icon size={20} />
        <Badge count={item.badge} className="-right-1 -top-1" />
      </span>
      <span className={cn('text-center text-[12px] font-medium leading-tight', danger ? 'text-neg' : 'text-ink-2')}>{label}</span>
    </button>
  )

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <motion.button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-label="Mais"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => info.offset.y > 90 && onClose()}
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[var(--shadow-pop)]"
          >
            <span aria-hidden="true" className="mx-auto block h-1.5 w-10 rounded-full bg-line-strong" />
            <div className="mt-3 flex items-center justify-between px-1">
              <h2 className="text-[17px] font-semibold tracking-tight text-ink">Mais</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-ink-2"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1">
              {items.map((item) =>
                tile(item, () => {
                  onNavigate(item.id)
                  onClose()
                }),
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1 border-t border-line pt-3">
              {extras.map((item) =>
                tile(
                  item,
                  () => {
                    if (item.confirm && confirming !== item.id) return setConfirming(item.id)
                    setConfirming(null)
                    item.run()
                    onClose()
                  },
                  item.danger,
                  confirming === item.id && item.confirm ? item.confirm : item.label,
                ),
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
