import { motion } from 'motion/react'
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Small set of iOS-style primitives (grouped lists, rows, buttons, segmented
// control) so the admin screens follow Apple's Human Interface conventions
// instead of the website's visual language.

export function IosGroup({
  title,
  footer,
  children,
  className,
}: {
  title?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mt-6', className)}>
      {title && <h2 className="mb-1.5 px-4 text-[13px] uppercase leading-4 tracking-wide text-[#6d6d72]">{title}</h2>}
      <div className="divide-y divide-[#e5e5ea] overflow-hidden rounded-[12px] bg-white">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-[13px] leading-[18px] text-[#6d6d72]">{footer}</p>}
    </section>
  )
}

export function IosRow({
  leading,
  title,
  subtitle,
  trailing,
  chevron,
  onClick,
  destructive,
  className,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  chevron?: boolean
  onClick?: () => void
  destructive?: boolean
  className?: string
}) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[17px] leading-[22px]', destructive ? 'text-[#ff3b30]' : 'text-onyx')}>
          {title}
        </p>
        {subtitle && <p className="truncate text-[15px] leading-5 text-[#8e8e93]">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-[17px] text-[#8e8e93]">{trailing}</div>}
      {chevron && <i className="bx bx-chevron-right shrink-0 text-2xl text-[#c7c7cc]" aria-hidden="true" />}
    </>
  )
  const base = cn('flex min-h-11 items-center gap-3 px-4 py-2.5 text-left', className)
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(base, 'w-full active:bg-[#e5e5ea]')}>
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  )
}

type IosButtonKind = 'filled' | 'tinted' | 'destructive' | 'plain'

const BUTTON_KIND: Record<IosButtonKind, string> = {
  filled: 'bg-gold-deep text-white active:opacity-80',
  tinted: 'bg-gold-deep/10 text-gold-deep active:bg-gold-deep/20',
  destructive: 'bg-[#ff3b30]/10 text-[#ff3b30] active:bg-[#ff3b30]/20',
  plain: 'text-gold-deep active:opacity-50',
}

export function IosButton({
  kind = 'filled',
  full,
  className,
  ...props
}: { kind?: IosButtonKind; full?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex h-11 items-center justify-center gap-1.5 rounded-[12px] px-5 text-[17px] font-semibold transition-all disabled:opacity-40',
        BUTTON_KIND[kind],
        full && 'w-full',
        className,
      )}
    />
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <div className="flex rounded-[9px] bg-[#7676801f] p-0.5" role="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className="relative h-8 flex-1 rounded-[7px] text-[13px] font-semibold text-onyx"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[7px] bg-white shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-deep/10 text-[16px] font-semibold text-gold-deep">
      {initials || '?'}
    </span>
  )
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div className="mt-16 flex flex-col items-center px-8 text-center">
      <i className={cn(icon, 'text-6xl text-[#c7c7cc]')} aria-hidden="true" />
      <p className="mt-3 text-[20px] font-semibold text-onyx">{title}</p>
      {text && <p className="mt-1 text-[15px] text-[#8e8e93]">{text}</p>}
    </div>
  )
}
