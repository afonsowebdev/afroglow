import type { ReactNode } from 'react'

/*
 * The admin's own pieces, as its pages always looked: section titles in small spaced capitals, grouped lists in light
 * grey with hairlines, black round icons, the iPhone switch in black, black pill buttons and the empty state.
 */

export const sectionTitle = 'mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark'
export const group =
  'divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]'
export const plain =
  'field-plain block w-full min-w-0 bg-transparent font-subtitle text-base text-onyx outline-none placeholder:text-onyx/35'
export const pillButton =
  'flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-onyx px-4 font-subtitle text-sm font-medium text-white disabled:opacity-40'
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

/** A row of a grouped list: a black round icon, a title and a line, and anything on the right. */
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
          className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg ${
            danger ? 'bg-red-700/10 text-red-700' : 'bg-onyx text-white'
          }`}
        >
          <i className={icon} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block font-subtitle text-[15px] font-medium ${danger ? 'text-red-700 dark:text-red-400' : 'text-onyx'}`}>{title}</span>
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

/** The iPhone switch, in black. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-onyx' : 'bg-onyx/20'}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
    </button>
  )
}

/** Two or three choices side by side, the chosen one on white. */
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
    <div className="grid rounded-xl bg-onyx/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`h-9 rounded-[9px] font-subtitle text-sm ${
            value === id ? 'bg-white font-medium text-onyx shadow-sm shadow-black/10 dark:bg-onyx/[0.14]' : 'text-onyx/55'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** The admin's empty states: a dark circle with an icon, a title and a line. */
export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-3xl bg-onyx/[0.04] px-6 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-onyx text-3xl text-white">
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
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-onyx/10 bg-white p-4 shadow-sm shadow-black/5">
      <i className="bx bx-check-circle mt-0.5 text-xl text-onyx" aria-hidden="true" />
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
