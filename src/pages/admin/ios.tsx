/*
 * The admin app's building blocks, after the iPhone's own management apps (Settings, Contacts, Calendar): a large
 * title that turns into a small bar when scrolling, inset grouped lists with hairlines, coloured icon tiles,
 * switches, segmented controls, a search field, modal sheets with Cancelar / Guardar on top, alerts and the tab bar.
 * Colours come from the --ios-* tokens of .admin-ios (index.css), light and dark.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, Search, X, type LucideIcon } from 'lucide-react'
import { BrandLogo } from '@/components/ui/brand-logo'
import { cn } from '@/lib/utils'

/* ── Screen: large title, small bar on scroll ─────────────────────────────────────────────────────────────────── */

export function Screen({
  title,
  subtitle,
  back,
  trailing,
  children,
  bottomInset = true,
}: {
  title: string
  subtitle?: ReactNode
  /** A pushed screen: "‹ Clientes" on the left of the bar. */
  back?: { label: string; onClick: () => void }
  /** Buttons on the right of the bar (e.g. "+" or "Editar"). */
  trailing?: ReactNode
  children: ReactNode
  /** Room for the tab bar at the bottom. */
  bottomInset?: boolean
}) {
  const [compact, setCompact] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // The small title shows once the large one has gone under the bar.
    const onScroll = () => {
      const title = titleRef.current?.getBoundingClientRect().bottom ?? 0
      const bar = barRef.current?.getBoundingClientRect().bottom ?? 0
      setCompact(title - 4 < bar)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={cn('min-h-screen', bottomInset && 'pb-[calc(8rem+env(safe-area-inset-bottom))]')}>
      {/* The bar: back and actions always; the small title and the blur only once the large title is gone. */}
      <div
        ref={barRef}
        className={cn(
          'fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-200',
          compact ? 'ios-bar ios-hairline-b' : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-11 max-w-3xl items-center gap-2 px-2">
          <div className="flex min-w-0 flex-1 items-center">
            {/* The tabs' own screens wear the AFROGLOW pill, on the left; pushed screens show "‹ Back" there. */}
            {!back && (
              <span
                className={cn(
                  'ml-2 flex h-10 items-center rounded-full bg-[var(--ios-elevated)] pe-4 ps-1.5 shadow-lg shadow-black/10 transition-opacity duration-200',
                  compact ? 'pointer-events-none opacity-0' : 'opacity-100',
                )}
              >
                <BrandLogo size="sm" />
              </span>
            )}
            {back && (
              <button
                type="button"
                onClick={back.onClick}
                className="flex h-11 min-w-0 items-center text-[15px] text-[var(--ios-tint)] active:opacity-50"
              >
                <ChevronLeft className="size-7 shrink-0" strokeWidth={2.4} />
                <span className="-ml-0.5 truncate">{back.label}</span>
              </button>
            )}
          </div>
          <div className="relative flex max-w-[55%] items-center justify-center">
            <p
              className={cn(
                'truncate text-[15px] font-semibold transition-opacity duration-200',
                compact ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden={!compact}
            >
              {title}
            </p>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">{trailing}</div>
        </div>
      </div>

      <div className={cn('mx-auto max-w-3xl', back ? 'pt-[calc(2.75rem+env(safe-area-inset-top))]' : 'pt-[calc(4rem+env(safe-area-inset-top))]')}>
        <div className="px-5 pb-2 pt-1">
          <h1 ref={titleRef} className="text-[32px] font-semibold leading-[40px] tracking-tight">
            {title}
          </h1>
          {subtitle && <div className="mt-1 text-sm font-light text-[var(--ios-secondary)]">{subtitle}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}

/** A round or text button for the bar. */
export function BarButton({
  label,
  Icon,
  onClick,
  bold = false,
  disabled = false,
}: {
  label: string
  Icon?: LucideIcon
  onClick: () => void
  bold?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex h-11 min-w-11 items-center justify-center px-2 text-[15px] text-[var(--ios-tint)] active:opacity-50 disabled:opacity-30',
        bold && 'font-semibold',
      )}
    >
      {Icon ? <Icon className="size-[22px]" strokeWidth={2} /> : label}
    </button>
  )
}

/* ── Grouped lists ─────────────────────────────────────────────────────────────────────────────────────────────── */

export function Section({
  header,
  footer,
  children,
  className,
  flush = false,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  /** No card: for content that draws its own (a calendar, a chart, buttons). */
  flush?: boolean
}) {
  return (
    <section className={cn('mt-[22px] px-4', className)}>
      {header && (
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--ios-secondary)]">{header}</h2>
      )}
      {flush ? (
        children
      ) : (
        <div className="ios-list overflow-hidden rounded-2xl bg-[var(--ios-cell)]">{children}</div>
      )}
      {footer && <div className="mt-2 px-1 text-xs leading-[18px] text-[var(--ios-secondary)]">{footer}</div>}
    </section>
  )
}

/** The system colours for icon tiles. */
export type Tint = 'red' | 'orange' | 'green' | 'blue' | 'indigo' | 'teal' | 'pink' | 'purple' | 'gray' | 'tint'

export function tintVar(tint: Tint) {
  return `var(--ios-${tint})`
}

/** A round icon on a soft raised disc (red for what deletes or closes). */
export function IconTile({ Icon, tint = 'gray', size = 36 }: { Icon: LucideIcon; tint?: Tint; size?: number }) {
  const red = tint === 'red'
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        red
          ? 'bg-[color-mix(in_srgb,var(--ios-red)_12%,transparent)] text-[var(--ios-red)]'
          : 'bg-[var(--ios-bg)] text-[var(--ios-label)] shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_0_0_0.5px_var(--ios-separator)]',
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.9} />
    </span>
  )
}

export function Cell({
  Icon,
  tint,
  leading,
  title,
  subtitle,
  detail,
  accessory,
  onClick,
  href,
  destructive = false,
  tinted = false,
  disabled = false,
  badge,
  multiline = false,
}: {
  Icon?: LucideIcon
  tint?: Tint
  /** Anything else on the left (an avatar, a date). */
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Grey text on the right. */
  detail?: ReactNode
  /** 'chevron' (opens something), 'check' (chosen), or any element (a switch). Defaults to a chevron when tappable. */
  accessory?: 'chevron' | 'check' | 'none' | ReactNode
  onClick?: () => void
  href?: string
  destructive?: boolean
  /** The title in the tint colour (an action, like "Adicionar"). */
  tinted?: boolean
  disabled?: boolean
  badge?: number
  multiline?: boolean
}) {
  const tappable = Boolean(onClick || href)
  const acc = accessory ?? (tappable && !destructive && !tinted ? 'chevron' : 'none')
  // A switch (or any control) on the right of a row that also opens something: the control must stay its own button.
  const control = acc !== 'chevron' && acc !== 'check' && acc !== 'none' ? acc : null
  const text = (
    <span className="min-w-0 flex-1">
      <span
        className={cn(
          'block text-[15px] leading-[21px]',
          !multiline && 'truncate',
          destructive && 'text-[var(--ios-red)]',
          tinted && 'text-[var(--ios-tint)]',
        )}
      >
        {title}
      </span>
      {subtitle && (
        <span
          className={cn(
            'mt-0.5 block text-xs leading-[17px] text-[var(--ios-secondary)]',
            multiline ? 'whitespace-pre-line' : 'truncate',
          )}
        >
          {subtitle}
        </span>
      )}
    </span>
  )
  const trailing = (
    <>
      {detail !== undefined && detail !== null && (
        <span className="max-w-[55%] shrink-0 truncate text-right text-[15px] text-[var(--ios-secondary)]">{detail}</span>
      )}
      {badge ? <CountBadge count={badge} /> : null}
      {acc === 'chevron' && <ChevronRight className="size-[18px] shrink-0 text-[var(--ios-tertiary)]" strokeWidth={2.6} />}
      {acc === 'check' && <Check className="size-5 shrink-0 text-[var(--ios-tint)]" strokeWidth={2.8} />}
      {control}
    </>
  )
  const lead = (Icon || leading) && (
    <span className="flex shrink-0 items-center py-2 pl-4">{leading ?? (Icon && <IconTile Icon={Icon} tint={tint} />)}</span>
  )
  const bodyClass = cn(
    'ios-cell-body flex min-h-11 min-w-0 flex-1 items-center gap-2 py-[11px] pr-4',
    Icon || leading ? 'ml-3' : 'ml-4',
  )
  const className = cn(
    'flex w-full items-stretch text-left transition-colors duration-75',
    tappable && !control && 'active:bg-[var(--ios-cell-pressed)]',
    disabled && 'pointer-events-none opacity-40',
  )

  if (control && onClick) {
    return (
      <div className={className}>
        {lead}
        <span className={bodyClass}>
          <button type="button" onClick={onClick} disabled={disabled} className="flex min-w-0 flex-1 items-center gap-2 text-left active:opacity-50">
            {text}
            {detail !== undefined && detail !== null && (
              <span className="max-w-[55%] shrink-0 truncate text-right text-[15px] text-[var(--ios-secondary)]">{detail}</span>
            )}
          </button>
          {control}
        </span>
      </div>
    )
  }

  const body = (
    <>
      {lead}
      <span className={bodyClass}>
        {text}
        {trailing}
      </span>
    </>
  )
  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={className}>
        {body}
      </a>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}

/** A red number, as on app icons and in Mail. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={cn(
        'flex h-[20px] min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[var(--ios-red)] px-1.5 text-[13px] font-medium tabular-nums text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** The iPhone's switch: green when on. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40',
        checked ? 'bg-[var(--ios-tint)]' : 'bg-[var(--ios-fill-strong)]',
      )}
    >
      <motion.span
        className="absolute top-[2px] size-[27px] rounded-full bg-[var(--ios-bg)] shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)]"
        animate={{ left: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 38 }}
      />
    </button>
  )
}

/** A row with a switch. */
export function ToggleCell({
  Icon,
  tint,
  title,
  subtitle,
  checked,
  onChange,
  disabled,
}: {
  Icon?: LucideIcon
  tint?: Tint
  title: string
  subtitle?: ReactNode
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <Cell
      Icon={Icon}
      tint={tint}
      title={title}
      subtitle={subtitle}
      multiline
      accessory={<Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />}
    />
  )
}

/** The iPhone's segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  const id = useRef(`seg-${Math.random().toString(36).slice(2)}`).current
  return (
    <div
      role="tablist"
      className={cn('grid h-10 rounded-xl bg-[var(--ios-fill)] p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(option.value)}
            className="relative flex min-w-0 items-center justify-center rounded-[9px] px-1 text-sm"
          >
            {on && (
              <motion.span
                layoutId={id}
                className="absolute inset-0 rounded-[9px] bg-[var(--ios-bg)] shadow-sm shadow-black/10 dark:bg-[rgba(240,230,214,0.14)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className={cn('relative truncate', on ? 'font-medium' : 'text-[var(--ios-secondary)]')}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Pesquisar',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={cn('flex h-11 items-center gap-2 rounded-full bg-[var(--ios-fill)] px-4', className)}>
      <Search className="size-[17px] shrink-0 text-[var(--ios-secondary)]" strokeWidth={2.4} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        type="search"
        className="field-plain h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--ios-secondary)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar"
          className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--ios-secondary)] text-[var(--ios-cell)]"
        >
          <X className="size-3" strokeWidth={3} />
        </button>
      )}
    </label>
  )
}

/** Big buttons: filled (the main action), tinted, gray, or destructive. */
export function Button({
  children,
  onClick,
  variant = 'filled',
  type = 'button',
  disabled = false,
  className,
  Icon,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'filled' | 'tinted' | 'gray' | 'destructive' | 'destructiveTinted'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  Icon?: LucideIcon
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium transition-opacity active:opacity-60 disabled:opacity-35',
        variant === 'filled' && 'bg-[var(--ios-tint)] text-[var(--ios-on-tint)]',
        variant === 'tinted' && 'bg-[var(--ios-fill)] text-[var(--ios-tint)]',
        variant === 'gray' && 'bg-[var(--ios-fill)] text-[var(--ios-label)]',
        variant === 'destructive' && 'bg-[var(--ios-red)] text-white',
        variant === 'destructiveTinted' && 'bg-[color-mix(in_srgb,var(--ios-red)_15%,transparent)] text-[var(--ios-red)]',
        className,
      )}
    >
      {Icon && <Icon className="size-5" strokeWidth={2.2} />}
      {children}
    </button>
  )
}

/** Round initials (or a photo), as in Contacts. */
export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const initials = name.trim().charAt(0).toUpperCase() || '?'
  if (src) return <img src={src} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--ios-tint)] font-semibold text-[var(--ios-on-tint)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  )
}

/** A screen or list with nothing in it: a symbol, a title, a line and maybe an action. */
export function EmptyState({
  Icon,
  title,
  text,
  action,
}: {
  Icon: LucideIcon
  title: string
  text?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="mx-4 mt-6 flex flex-col items-center rounded-3xl bg-[var(--ios-cell)] px-6 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-[var(--ios-tint)] text-[var(--ios-on-tint)]">
        <Icon className="size-8" strokeWidth={1.8} />
      </span>
      <p className="mt-5 text-xl font-semibold tracking-tight">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[15px] text-[var(--ios-secondary)]">{text}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="mt-4 text-[15px] font-medium underline underline-offset-4 active:opacity-50">
          {action.label}
        </button>
      )}
    </div>
  )
}

/* ── Form rows ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export const plainInput =
  'field-plain min-w-0 bg-transparent text-base outline-none placeholder:text-[var(--ios-tertiary)] disabled:opacity-50'

/** A label on the left and its field on the right. */
export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex w-full items-stretch">
      <span className="ios-cell-body ml-4 flex min-h-11 flex-1 items-center gap-3 pr-4">
        <span className="w-28 shrink-0 text-[15px]">{label}</span>
        <span className="flex min-w-0 flex-1 justify-end">{children}</span>
      </span>
    </label>
  )
}

/** A field that fills its row (a placeholder says what it is). */
export function InputCell(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex w-full">
      <span className="ios-cell-body ml-4 flex min-h-11 flex-1 items-center pr-4">
        <input {...props} className={cn(plainInput, 'h-11 w-full', props.className)} />
      </span>
    </div>
  )
}

export function TextAreaCell(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex w-full">
      <span className="ios-cell-body ml-4 flex flex-1 py-[11px] pr-4">
        <textarea {...props} className={cn(plainInput, 'w-full resize-none leading-[22px]', props.className)} />
      </span>
    </div>
  )
}

/**
 * A date or time row: the value drawn by us on the right (the iPhone's own box ignores alignment), the real field
 * over the whole row, invisible, so a tap opens the iPhone's picker.
 */
export function DateCell({
  label,
  type,
  value,
  display,
  onChange,
  min,
}: {
  label: string
  type: 'date' | 'time' | 'datetime-local'
  value: string
  display: string
  onChange: (value: string) => void
  min?: string
}) {
  return (
    <label className="relative flex w-full">
      <span className="ios-cell-body ml-4 flex min-h-11 flex-1 items-center gap-3 pr-4">
        <span className="flex-1 text-[15px]">{label}</span>
        <span className="rounded-[6px] bg-[var(--ios-fill)] px-2.5 py-1 text-[15px] tabular-nums">{display}</span>
      </span>
      <input
        type={type}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}

/* ── Sheets and alerts ─────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * A modal sheet, as the iPhone's: the screen behind slides back a little, the sheet comes up with Cancelar on the
 * left, the title in the middle and the main action (Guardar, Enviar…) on the right, always in reach.
 */
export function IOSSheet({
  open,
  title,
  onClose,
  done,
  children,
  busy = false,
  closeLabel = 'Cancelar',
}: {
  open: boolean
  title: string
  onClose: () => void
  done?: { label: string; onClick: () => void; disabled?: boolean }
  children: ReactNode
  busy?: boolean
  closeLabel?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, busy, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label={closeLabel}
            tabIndex={-1}
            onClick={() => !busy && onClose()}
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-[12px] bg-[var(--ios-bg)] shadow-2xl sm:h-[min(88vh,52rem)] sm:rounded-[14px]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42 }}
          >
            <div className="ios-bar ios-hairline-b relative flex h-14 shrink-0 items-center justify-between px-4">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="z-10 text-[15px] text-[var(--ios-tint)] active:opacity-50 disabled:opacity-30"
              >
                {closeLabel}
              </button>
              <h2 className="absolute inset-x-24 truncate text-center text-[15px] font-semibold">{title}</h2>
              {done ? (
                <button
                  type="button"
                  onClick={done.onClick}
                  disabled={busy || done.disabled}
                  className="z-10 text-[15px] font-semibold text-[var(--ios-tint)] active:opacity-50 disabled:opacity-30"
                >
                  {busy ? 'A guardar…' : done.label}
                </button>
              ) : (
                <span />
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(2rem+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export interface AlertButton {
  label: string
  style?: 'default' | 'cancel' | 'destructive'
  onClick?: () => void
}

/** The iPhone's alert: a title, a message and stacked or side-by-side buttons. */
export function Alert({
  open,
  title,
  message,
  buttons,
  onClose,
  children,
}: {
  open: boolean
  title: string
  message?: ReactNode
  buttons: AlertButton[]
  onClose: () => void
  children?: ReactNode
}) {
  const stacked = buttons.length > 2
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-12">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="ios-bar relative w-full max-w-[270px] overflow-hidden rounded-[14px] text-center"
            initial={{ opacity: 0, scale: 1.15 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
          >
            <div className="px-4 pb-4 pt-5">
              <p className="text-[15px] font-semibold leading-[22px]">{title}</p>
              {message && <div className="mt-0.5 text-[13px] leading-[18px]">{message}</div>}
              {children && <div className="mt-3 text-left">{children}</div>}
            </div>
            <div
              className="ios-hairline-t grid"
              style={{ gridTemplateColumns: `repeat(${stacked ? 1 : buttons.length}, minmax(0, 1fr))` }}
            >
              {buttons.map((button, i) => (
                <button
                  key={button.label}
                  type="button"
                  onClick={() => {
                    button.onClick?.()
                    if (!button.onClick || button.style === 'cancel') onClose()
                  }}
                  className={cn(
                    'h-11 text-[15px] active:bg-[var(--ios-fill)]',
                    button.style === 'destructive' ? 'text-[var(--ios-red)]' : 'text-[var(--ios-tint)]',
                    button.style === 'cancel' || (!stacked && i === buttons.length - 1 && button.style !== 'destructive')
                      ? 'font-semibold'
                      : '',
                    stacked ? (i > 0 ? 'ios-hairline-t' : '') : i > 0 ? 'shadow-[inset_0.5px_0_0_var(--ios-separator)]' : '',
                  )}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** The menu that slides up from the bottom with a list of actions and Cancelar apart. */
export function ActionSheet({
  open,
  title,
  actions,
  onClose,
}: {
  open: boolean
  title?: string
  actions: Array<{ label: string; destructive?: boolean; onClick: () => void }>
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-md"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', stiffness: 460, damping: 40 }}
          >
            <div className="ios-bar overflow-hidden rounded-[14px] text-center">
              {title && <p className="ios-hairline-b px-4 py-3.5 text-[13px] text-[var(--ios-secondary)]">{title}</p>}
              {actions.map((action, i) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    onClose()
                    action.onClick()
                  }}
                  className={cn(
                    'h-[57px] w-full text-[20px] active:bg-[var(--ios-fill)]',
                    action.destructive ? 'text-[var(--ios-red)]' : 'text-[var(--ios-tint)]',
                    i > 0 && 'ios-hairline-t',
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 h-[57px] w-full rounded-[14px] bg-[var(--ios-elevated)] text-[20px] font-semibold text-[var(--ios-tint)] active:opacity-70"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ── Toasts ────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Toast = { id: number; text: string; error?: boolean }
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {})

/** Short confirmations ("Guardado") that drop from the top and go away on their own. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((text: string, error = false) => {
    const id = Date.now() + Math.random()
    setToasts((list) => [...list.slice(-2), { id, text, error }])
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2600)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(3.25rem+env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-6">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              className="ios-bar flex max-w-sm items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-medium shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
            >
              {toast.error ? (
                <X className="size-4 shrink-0 text-[var(--ios-red)]" strokeWidth={3} />
              ) : (
                <Check className="size-4 shrink-0 text-[var(--ios-green)]" strokeWidth={3} />
              )}
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
