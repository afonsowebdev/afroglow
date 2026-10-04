import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { tap } from '@/lib/haptics'
import type { AvailabilitySlot } from '@/lib/types'
import { dayKey, dayParts, longDay, timeLabel } from './dates'

/** Horizontal strip of days + the times of the chosen day. Used to book and to reschedule. */
export function SlotPicker({
  slots,
  value,
  onChange,
}: {
  slots: AvailabilitySlot[]
  value: string | null
  onChange: (slotId: string) => void
}) {
  const days = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>()
    for (const slot of slots) {
      const key = dayKey(slot.startsAt)
      groups.set(key, [...(groups.get(key) ?? []), slot])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [slots])

  const selectedDay = value ? dayKey(slots.find((s) => s.id === value)?.startsAt ?? '') : null
  const [activeDay, setActiveDay] = useState<string | null>(selectedDay)
  const current = activeDay && days.some(([k]) => k === activeDay) ? activeDay : (days[0]?.[0] ?? null)

  useEffect(() => {
    if (selectedDay) setActiveDay(selectedDay)
  }, [selectedDay])

  if (days.length === 0) return null
  const times = days.find(([k]) => k === current)?.[1] ?? []

  return (
    <div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map(([key, daySlots]) => {
          const parts = dayParts(daySlots[0].startsAt)
          const active = key === current
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                void tap()
                setActiveDay(key)
              }}
              className={`relative flex h-[76px] w-[60px] shrink-0 flex-col items-center justify-center rounded-2xl border transition-colors ${
                active ? 'border-gold-deep text-[#ffffff]' : 'border-gold/25 bg-white text-onyx'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="slot-day"
                  className="absolute inset-0 rounded-2xl bg-gold-deep"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative font-subtitle text-[11px] uppercase tracking-wide opacity-80">
                {parts.weekday}
              </span>
              <span className="relative font-logo text-2xl leading-none">{parts.day}</span>
              <span className="relative mt-0.5 font-subtitle text-[10px] uppercase opacity-80">{parts.month}</span>
            </button>
          )
        })}
      </div>

      {current && (
        <motion.div key={current} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">{longDay(times[0].startsAt)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {times.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  void tap()
                  onChange(slot.id)
                }}
                className={`rounded-full border py-3 font-subtitle text-sm transition-colors ${
                  value === slot.id
                    ? 'border-gold-deep bg-gold-deep text-[#ffffff]'
                    : 'border-gold/30 bg-white text-onyx'
                }`}
              >
                {timeLabel(slot.startsAt)}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
