import type { ReactNode } from 'react'

/*
 * The admin's own pieces, in the Painel's style: small section titles, grouped lists as white cards with the Painel's
 * soft shadow, icons in glass circles, the green iPhone switch, plain white pill buttons, iOS segmented controls and the
 * empty state as a white card.
 */

/** The soft shadow of the Painel's cards, as a utility. */
export const cardShadow = 'shadow-[0px_1px_3px_0px_rgba(0,0,0,0.08),0px_12px_32px_-10px_rgba(0,0,0,0.2)]'
export const sectionTitle = 'mb-2 px-1 font-subtitle text-[12px] font-semibold text-muted-dark'
export const group = `divide-y divide-onyx/[0.06] overflow-hidden rounded-[22px] bg-card ${cardShadow}`
export const plain =
  'field-plain block w-full min-w-0 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35'
export const pillButton = `flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-card px-4 font-subtitle text-sm font-semibold text-onyx transition-transform active:scale-[0.97] disabled:opacity-40 ${cardShadow}`
export const chip = 'glass-chip rounded-full px-3.5 py-2 font-subtitle text-xs font-medium text-onyx'

export function Section({ title, note, children, className = '' }: { title?: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h2 className={sectionTitle}>{title}</h2>}
      {children}
      {note && <p className="mt-2 px-1 font-subtitle text-xs text-muted-dark">{note}</p>}
    </section>
  )
}

/** A row of a grouped list: an icon in a glass circle (soft red when it is a danger), a title and a line, and anything on the right. */
export function Row({
  icon,
  title,
  text,
  right,
  onClick,
  danger = false,
}: {
  icon?: string
  title: ReactNode
  text?: ReactNode
  right?: ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  const body = (
    <>
      {icon && (
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg ${danger ? '' : 'glass-chip text-onyx'}`}
          style={danger ? { background: 'color-mix(in srgb, var(--c-cancelled) 13%, transparent)', color: 'var(--c-cancelled)' } : undefined}
        >
          <i className={icon} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-subtitle text-[15px] font-semibold text-onyx" style={danger ? { color: 'var(--c-cancelled)' } : undefined}>
          {title}
        </span>
        {text && <span className="block font-subtitle text-xs text-muted-dark">{text}</span>}
      </span>
      {right}
      {onClick && !right && <i className="bx bx-chevron-right text-xl text-onyx/30" aria-hidden="true" />}
    </>
  )
  const className = 'flex w-full items-center gap-3.5 px-4 py-3 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} active:bg-onyx/[0.04]`}>
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  )
}

/** The iPhone switch, green when on. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: checked ? 'var(--c-pos)' : 'color-mix(in srgb, var(--color-onyx) 16%, transparent)' }}
    >
      <span
        className={`absolute top-[2px] size-[26px] rounded-full bg-[#ffffff] shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[2px]'}`}
      />
    </button>
  )
}

/** Two or three choices side by side, like an iOS segmented control: the chosen one a raised white pill. */
export function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: Array<[T, string]>
}) {
  return (
    <div className="grid rounded-full bg-onyx/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`h-9 rounded-full font-subtitle text-[13px] transition-colors ${
            value === id
              ? 'bg-white font-semibold text-onyx shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-onyx/[0.16]'
              : 'text-muted-dark'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** The admin's empty states: a white card with the icon in a glass circle, a title and a line. */
export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className={`mt-6 flex flex-col items-center rounded-[22px] bg-card px-6 py-10 text-center ${cardShadow}`}>
      <span className="glass-chip flex size-16 items-center justify-center rounded-full text-[28px] text-onyx">
        <i className={icon} aria-hidden="true" />
      </span>
      <p className="mt-5 font-subtitle text-xl font-semibold tracking-tight text-onyx">{title}</p>
      <p className="mt-1.5 max-w-xs font-subtitle text-sm text-muted-dark">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** A short message after saving, in the page. */
export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-[22px] bg-card p-4 ${cardShadow}`}>
      <i className="bx bx-check-circle mt-0.5 text-xl" style={{ color: 'var(--c-confirmed)' }} aria-hidden="true" />
      <p className="flex-1 font-subtitle text-sm text-onyx">{text}</p>
      <button type="button" onClick={onClose} aria-label="Fechar aviso" className="text-lg text-muted-dark">
        <i className="bx bx-x" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Lisbon dates, as the rest of the admin. */
const TZ = 'Europe/Lisbon'
export const dayKey = (iso: string | Date) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
export const todayKey = () => dayKey(new Date())
export function addDays(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function longDay(key: string) {
  const label = new Date(`${key}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export function shortDay(key: string) {
  const [, m, d] = key.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}
export function dayTime(iso: string) {
  return `${shortDay(dayKey(iso))}, ${new Date(iso).toLocaleTimeString('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })}`
}
export function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 60) return minutes <= 1 ? 'agora' : `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'ontem' : days < 30 ? `há ${days} dias` : shortDay(dayKey(iso))
}
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
