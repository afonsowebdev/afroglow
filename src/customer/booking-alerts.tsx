import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { useCustomerAuth } from '@/lib/customer-auth'
import { onPushReceived } from '@/lib/customer-push'
import type { Booking } from '@/lib/types'

const SEEN_KEY = 'afroglow-seen-decisions'

// "id:STATUS" of every decision (accepted / declined / cancelled) the customer has already looked at.
function readSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // storage unavailable: the dot just comes back next time
  }
}

const decisionKey = (b: Booking) => `${b.id}:${b.status}`
const isDecision = (b: Booking) => b.status === 'ACCEPTED' || b.status === 'REJECTED' || b.status === 'CANCELLED'

interface BookingAlerts {
  /** Booking ids with a decision the customer hasn't opened yet. */
  unseen: Set<string>
  refresh: () => Promise<void>
  markSeen: () => void
}

const Context = createContext<BookingAlerts>({ unseen: new Set(), refresh: async () => {}, markSeen: () => {} })

export const useBookingAlerts = () => useContext(Context)

/**
 * Tracks which booking decisions the customer hasn't looked at yet, to show the red dot on the Marcações
 * tab. Checks on launch, when the app comes back to the front, when a push arrives and every minute.
 */
export function BookingAlertsProvider({ children }: { children: ReactNode }) {
  const { customer } = useCustomerAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [seen, setSeen] = useState<Set<string>>(() => readSeen() ?? new Set())
  const baselineDone = useRef(readSeen() !== null)

  const refresh = useCallback(async () => {
    if (!customer) return
    try {
      const list = await api.get<Booking[]>('/account/bookings')
      // First time on this device: whatever already exists counts as seen, so old history doesn't light the dot.
      if (!baselineDone.current) {
        const initial = new Set(list.filter(isDecision).map(decisionKey))
        writeSeen(initial)
        setSeen(initial)
        baselineDone.current = true
      }
      setBookings(list)
    } catch {
      // offline: keep the last known state
    }
  }, [customer])

  useEffect(() => {
    if (!customer) {
      setBookings([])
      return
    }
    void refresh()
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => void refresh(), 60_000)
    let stop: (() => void) | undefined
    void onPushReceived(() => void refresh()).then((remove) => (stop = remove))
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
      stop?.()
    }
  }, [customer, refresh])

  const unseen = useMemo(
    () => new Set(bookings.filter((b) => isDecision(b) && !seen.has(decisionKey(b))).map((b) => b.id)),
    [bookings, seen],
  )

  const markSeen = useCallback(() => {
    setSeen((current) => {
      const next = new Set(current)
      for (const b of bookings) if (isDecision(b)) next.add(decisionKey(b))
      writeSeen(next)
      return next
    })
  }, [bookings])

  return <Context.Provider value={{ unseen, refresh, markSeen }}>{children}</Context.Provider>
}
