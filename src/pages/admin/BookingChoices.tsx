import { BRAID_COLORS } from '@/lib/braid-colors'
import type { Booking } from '@/lib/types'

/**
 * What the client chose for a booking, spelled out for the admin: the length / parting and the hair colour (swatch,
 * code and name). Nothing when the booking was made without them.
 */
export function BookingChoices({ booking, className = '' }: { booking: Pick<Booking, 'optionLabel' | 'colorCode'>; className?: string }) {
  const color = BRAID_COLORS.find((c) => c.code === booking.colorCode)
  if (!booking.optionLabel && !color) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {booking.optionLabel?.split(' · ').map((option) => (
        <span key={option} className="rounded-full bg-onyx/[0.07] px-2.5 py-1 font-subtitle text-xs font-medium text-onyx">
          {option}
        </span>
      ))}
      {color && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-onyx/[0.07] py-1 pe-2.5 ps-1 font-subtitle text-xs font-medium text-onyx">
          <span className="size-4 rounded-full ring-1 ring-onyx/15" style={{ background: color.hex }} aria-hidden="true" />
          Cor {color.code} · {color.name}
        </span>
      )}
    </div>
  )
}
