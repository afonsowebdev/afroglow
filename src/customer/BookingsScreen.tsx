import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { Sheet } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { success, tap } from '@/lib/haptics'
import { useBusinessInfo } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking } from '@/lib/types'
import { longDay, timeLabel } from './dates'
import { useBookingAlerts } from './booking-alerts'
import { Fact, Facts, labelClass, panelClass, StatusDot } from './panel'
import { SlotPicker } from './SlotPicker'
import { usePullToRefresh } from './usePullToRefresh'

const STATUS: Record<Booking['status'], { label: string; chip: string; hint: string }> = {
  PENDING: {
    label: 'Por confirmar',
    chip: 'bg-gold-deep/15 text-gold-ink',
    hint: 'Vais receber uma notificação quando for confirmada.',
  },
  ACCEPTED: {
    label: 'Confirmada',
    chip: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
    hint: 'Está tudo certo. Vemo-nos em breve!',
  },
  REJECTED: {
    label: 'Não aceite',
    chip: 'bg-red-700/10 text-red-700',
    hint: 'Esse horário não ficou disponível. Podes escolher outro.',
  },
  CANCELLED: {
    label: 'Cancelada',
    chip: 'bg-onyx/10 text-muted-dark',
    hint: '',
  },
}

type Mode = 'details' | 'reschedule' | 'cancel'

function BookingCard({ booking, onOpen, isNew }: { booking: Booking; onOpen: () => void; isNew?: boolean }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      type="button"
      onClick={() => {
        void tap()
        onOpen()
      }}
      className={`${panelClass} block w-full text-left`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className={labelClass}>Sessão</p>
          {isNew && (
            <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 font-subtitle text-[10px] font-semibold uppercase tracking-wide text-[#ffffff]">
              Novo
            </span>
          )}
        </div>
        <StatusDot status={booking.status} />
      </div>
      <p className="mt-2 truncate font-subtitle text-xl font-semibold tracking-tight text-onyx">
        {booking.service.name}
      </p>
      <Facts columns="2fr 1fr">
        <Fact label="Data">{longDay(booking.slot.startsAt)}</Fact>
        <Fact label="Hora">{timeLabel(booking.slot.startsAt)}</Fact>
      </Facts>
      <p className="mt-4 flex items-center justify-between font-subtitle text-sm font-medium text-onyx">
        <span>{formatPrice(booking.service.priceCents)}</span>
        <span className="flex items-center gap-1">
          Ver detalhes <i className="bx bx-right-arrow-alt text-lg" aria-hidden="true" />
        </span>
      </p>
    </motion.button>
  )
}

export default function BookingsScreen() {
  const navigate = useNavigate()
  const business = useBusinessInfo()
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<'next' | 'past'>('next')

  const [selected, setSelected] = useState<Booking | null>(null)
  const [mode, setMode] = useState<Mode>('details')
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null)
  const [newSlotId, setNewSlotId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setBookings(await api.get<Booking[]>('/account/bookings'))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const { handlers, indicator } = usePullToRefresh(load)

  // Decisions the customer hasn't seen get a "Novo" tag; opening this screen clears the red dot on the tab.
  const { unseen, markSeen, refresh } = useBookingAlerts()
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (unseen.size === 0) return
    setFresh((previous) => new Set([...previous, ...unseen]))
    const timer = window.setTimeout(markSeen, 1500)
    return () => window.clearTimeout(timer)
  }, [unseen, markSeen])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const { next, past } = useMemo(() => {
    const now = Date.now()
    const live = (b: Booking) =>
      (b.status === 'PENDING' || b.status === 'ACCEPTED') && new Date(b.slot.startsAt).getTime() >= now
    const all = bookings ?? []
    return {
      next: all.filter(live).sort((a, b) => a.slot.startsAt.localeCompare(b.slot.startsAt)),
      past: all.filter((b) => !live(b)).sort((a, b) => b.slot.startsAt.localeCompare(a.slot.startsAt)),
    }
  }, [bookings])

  function open(booking: Booking) {
    setSelected(booking)
    setMode('details')
    setError(null)
    setNewSlotId(null)
  }

  async function startReschedule() {
    setMode('reschedule')
    setSlots(null)
    try {
      setSlots(await api.get<AvailabilitySlot[]>('/availability'))
    } catch {
      setError('Não foi possível carregar os horários.')
    }
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      void success()
      setSelected(null)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setBusy(false)
    }
  }

  const manageable =
    selected &&
    (selected.status === 'PENDING' || selected.status === 'ACCEPTED') &&
    new Date(selected.slot.startsAt) > new Date()
  const list = tab === 'next' ? next : past

  return (
    <main className="px-5 pb-40 pt-[calc(1.25rem+env(safe-area-inset-top))]" {...handlers}>
      {indicator}
      <div className="mx-auto max-w-md">
        <h1 className="font-subtitle font-semibold tracking-tight text-4xl text-onyx">As minhas marcações</h1>

        <div className="mt-6 flex rounded-full border border-gold/25 bg-white p-1">
          {(
            [
              ['next', 'Próximas', next.length],
              ['past', 'Anteriores', past.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                void tap()
                setTab(id)
              }}
              className="relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 font-subtitle text-sm"
            >
              {tab === id && (
                <motion.span
                  layoutId="bookings-tab"
                  className="absolute inset-0 rounded-full bg-brand"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className={`relative ${tab === id ? 'text-brand-ink' : 'text-onyx/70'}`}>
                {label} {count > 0 && <span className="opacity-70">· {count}</span>}
              </span>
            </button>
          ))}
        </div>

        {loadError && (
          <p className="mt-10 text-center font-subtitle text-sm text-red-700">
            Não foi possível carregar as marcações.{' '}
            <button type="button" onClick={() => void load()} className="underline">
              Tentar de novo
            </button>
          </p>
        )}

        {!bookings && !loadError && (
          <div className="mt-6 flex flex-col gap-3" aria-label="A carregar">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-gold/10" />
            ))}
          </div>
        )}

        {bookings && list.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <i className="bx bx-calendar-heart text-6xl text-gold-deep/40" aria-hidden="true" />
            <p className="mt-4 font-subtitle text-lg text-onyx">
              {tab === 'next' ? 'Sem sessões marcadas' : 'Ainda sem histórico'}
            </p>
            {tab === 'next' && (
              <>
                <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
                  Marca a tua próxima sessão em poucos toques.
                </p>
                <ActionButton label="Marcar sessão" className="mt-6" onClick={() => navigate('/marcar')} />
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {bookings &&
            list.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                isNew={fresh.has(booking.id)}
                onOpen={() => open(booking)}
              />
            ))}
        </div>
      </div>

      <Sheet
        open={Boolean(selected)}
        title={
          mode === 'reschedule'
            ? 'Escolhe o novo horário'
            : mode === 'cancel'
              ? 'Cancelar marcação?'
              : (selected?.service.name ?? '')
        }
        description={
          selected && mode === 'details'
            ? `${longDay(selected.slot.startsAt)} às ${timeLabel(selected.slot.startsAt)}`
            : undefined
        }
        icon={
          mode === 'cancel'
            ? 'bx bx-calendar-x'
            : mode === 'reschedule'
              ? 'bx bx-calendar-edit'
              : 'bx bx-calendar-check'
        }
        destructive={mode === 'cancel'}
        busy={busy}
        error={error}
        hideSubmit={mode === 'details' && !manageable}
        submitLabel={mode === 'cancel' ? 'Sim, cancelar' : mode === 'reschedule' ? 'Confirmar' : 'Reagendar'}
        submitDisabled={mode === 'reschedule' && !newSlotId}
        onSubmit={() => {
          if (!selected) return
          if (mode === 'details') void startReschedule()
          else if (mode === 'reschedule')
            void run(() =>
              api.post(`/account/bookings/${selected.id}/reschedule`, {
                slotId: newSlotId,
              }),
            )
          else void run(() => api.post(`/account/bookings/${selected.id}/cancel`))
        }}
        onClose={() => (mode === 'details' || busy ? setSelected(null) : setMode('details'))}
      >
        {selected && mode === 'details' && (
          <>
            <div className="rounded-2xl border border-onyx/15 p-4">
              <div className="flex items-center justify-between">
                <StatusDot status={selected.status} />
                <span className="font-subtitle text-xl font-semibold tracking-tight text-onyx">
                  {formatPrice(selected.service.priceCents)}
                </span>
              </div>
              <Facts columns="1fr 1fr">
                <Fact label="Duração">{selected.service.durationLabel}</Fact>
                <Fact label="Hora">{timeLabel(selected.slot.startsAt)}</Fact>
              </Facts>
              {STATUS[selected.status].hint && (
                <p className="mt-4 font-subtitle text-sm font-light text-muted-dark">{STATUS[selected.status].hint}</p>
              )}
            </div>
            {manageable && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setMode('cancel')
                }}
                className="font-subtitle text-sm text-red-700 underline"
              >
                Cancelar esta marcação
              </button>
            )}
            {selected.status === 'REJECTED' && (
              <ActionButton label="Escolher outro horário" onClick={() => navigate('/marcar')} />
            )}
          </>
        )}

        {selected &&
          mode === 'reschedule' &&
          (slots === null ? (
            <p className="font-subtitle text-sm text-muted-dark">A carregar horários...</p>
          ) : slots.length === 0 ? (
            <p className="font-subtitle text-sm text-muted-dark">Sem horários livres de momento.</p>
          ) : (
            <SlotPicker slots={slots} value={newSlotId} onChange={setNewSlotId} />
          ))}

        {selected && mode === 'cancel' && (
          <>
            <p className="font-subtitle text-sm text-onyx">
              {selected.service.name} · {longDay(selected.slot.startsAt)} às {timeLabel(selected.slot.startsAt)}. O
              horário fica livre para outra pessoa.
            </p>
            {business.cancellationPolicy && (
              <p className="font-subtitle text-xs font-light text-muted-dark">{business.cancellationPolicy}</p>
            )}
          </>
        )}
      </Sheet>
    </main>
  )
}
