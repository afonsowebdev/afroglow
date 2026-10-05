import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { tap } from '@/lib/haptics'
import type { AvailabilitySlot } from '@/lib/types'
import { dayKey, dayParts, longDay, timeLabel } from './dates'

const TZ = 'Europe/Lisbon'

function relativeLabel(iso: string) {
  const today = dayKey(new Date().toISOString())
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000).toISOString())
  const key = dayKey(iso)
  return key === today ? 'Hoje' : key === tomorrow ? 'Amanhã' : null
}

function monthYear(iso: string) {
  const label = new Date(iso).toLocaleDateString('pt-PT', { timeZone: TZ, month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Horizontal strip of days + the times of the chosen day. Used to book and to reschedule. */
export function SlotPicker({
  slots,
  value,
  onChange,
}: {
  slots: AvailabilitySlot[]
  value: string | null
  /** Called with the slot id, or `null` when the chosen time is tapped again (deselect). */
  onChange: (slotId: string | null) => void
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
      <div className="flex items-baseline justify-between">
        <p className="font-subtitle text-base font-semibold text-onyx">{monthYear(times[0].startsAt)}</p>
        <p className="font-subtitle text-xs text-muted-dark">
          {days.length} {days.length === 1 ? 'dia disponível' : 'dias disponíveis'}
        </p>
      </div>

      <div className="-mx-5 mt-4 flex gap-2.5 overflow-x-auto px-5 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map(([key, daySlots]) => {
          const parts = dayParts(daySlots[0].startsAt)
          const active = key === current
          const relative = relativeLabel(daySlots[0].startsAt)
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                void tap()
                setActiveDay(key)
              }}
              className="glass-chip relative flex h-[96px] w-[68px] shrink-0 flex-col items-center justify-center rounded-3xl"
            >
              {active && (
                <motion.span
                  layoutId="slot-day"
                  className="glass-chip-on absolute inset-0 rounded-3xl"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={`relative font-subtitle text-xs font-medium uppercase tracking-wide ${
                  active ? 'text-onyx' : 'text-muted-dark'
                }`}
              >
                {relative ?? parts.weekday.slice(0, 3)}
              </span>
              <span className={`relative mt-0.5 font-subtitle text-[28px] font-semibold leading-none ${'text-onyx'}`}>
                {parts.day}
              </span>
              <span
                className={`relative mt-1.5 rounded-full px-2 py-0.5 font-subtitle text-[10px] font-medium ${
                  active ? 'bg-onyx/10 text-onyx' : 'bg-onyx/5 text-muted-dark'
                }`}
              >
                {daySlots.length} {daySlots.length === 1 ? 'vaga' : 'vagas'}
              </span>
            </button>
          )
        })}
      </div>

      {current && (
        <motion.div key={current} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <p className="font-subtitle text-sm font-medium text-onyx">{longDay(times[0].startsAt)}</p>
          <p className="mt-0.5 font-subtitle text-xs text-muted-dark">Escolhe a hora de início</p>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {times.map((slot) => (
              <button
                key={slot.id}
                type="button"
                aria-pressed={value === slot.id}
                onClick={() => {
                  void tap()
                  onChange(value === slot.id ? null : slot.id)
                }}
                className={`rounded-2xl py-3.5 font-subtitle text-base font-medium text-onyx transition-shadow ${
                  value === slot.id ? 'glass-chip-on' : 'glass-chip'
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
