import type { ReactNode } from 'react'
import type { BookingStatus } from '@/lib/types'

/*
 * The app's card language: a white panel with a hairline border, small-caps labels, columns of data and a
 * single dark action. Shared so every screen looks like the "next session" panel on the home screen.
 */

export const panelClass = 'rounded-2xl border border-onyx/15 bg-white p-5'
export const labelClass = 'font-subtitle text-[11px] font-medium uppercase tracking-[0.18em] text-muted-dark'

const DOT: Record<BookingStatus, { color: string; label: string }> = {
  PENDING: { color: 'bg-amber-500', label: 'Por confirmar' },
  ACCEPTED: { color: 'bg-emerald-600', label: 'Confirmada' },
  REJECTED: { color: 'bg-red-600', label: 'Não aceite' },
  CANCELLED: { color: 'bg-muted-dark/60', label: 'Cancelada' },
}

export function StatusDot({ status }: { status: BookingStatus }) {
  const { color, label } = DOT[status]
  return (
    <span className="flex items-center gap-1.5 font-subtitle text-xs text-onyx">
      <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
      {label}
    </span>
  )
}

/** Label above a value, used in two or three columns separated from the title by a hairline. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={labelClass}>{label}</dt>
      <dd className="mt-1 font-subtitle text-sm font-medium text-onyx">{children}</dd>
    </div>
  )
}

export function Facts({ columns = '1fr 1fr', children }: { columns?: string; children: ReactNode }) {
  return (
    <dl className="mt-4 grid gap-4 border-t border-onyx/15 pt-4" style={{ gridTemplateColumns: columns }}>
      {children}
    </dl>
  )
}
