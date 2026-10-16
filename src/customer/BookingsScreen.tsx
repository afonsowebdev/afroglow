import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { Sheet } from '@/components/ui/sheet'
import { api, ApiError } from '@/lib/api'
import { success, tap } from '@/lib/haptics'
import { bookPath } from '@/lib/app-mode'
import { mapSearchText, useBusinessInfo, useWhatsapp } from '@/lib/site-config'
import { downloadBookingIcs } from '@/lib/calendar'
import { formatPrice, type AvailabilitySlot, type Booking } from '@/lib/types'
import { dayKey, dayParts, longDay, timeLabel } from './dates'
import { useBookingAlerts } from './booking-alerts'
import { StatusDot } from './panel'
import { SlotPicker } from './SlotPicker'
import { usePullToRefresh } from './usePullToRefresh'
import { bookingPrice, bookingExtras } from '@/lib/pricing'

const STATUS: Record<Booking['status'], { label: string; chip: string; hint: string }> = {
  PENDING: {
    label: 'Por confirmar',
    chip: 'bg-onyx/[0.07] text-onyx',
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

const group =
  'divide-y divide-onyx/[0.08] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))]'

/** "Hoje", "Amanhã", "Daqui a 3 dias" (by calendar day, Lisbon time). */
function countdown(iso: string) {
  const days = Math.round((Date.parse(dayKey(iso)) - Date.parse(dayKey(new Date().toISOString()))) / 86_400_000)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Amanhã'
  return `Daqui a ${days} dias`
}

/** "09:00 · Média · Cor 30 (Castanho claro)": the time and what was chosen. */
const rowDetails = (b: Booking) => [timeLabel(b.slot.startsAt), bookingExtras(b)].filter(Boolean).join(' · ')

/** Calendar, directions and WhatsApp for an upcoming session, as small round-cornered pills. */
function SessionActions({ booking, onDark = false }: { booking: Booking; onDark?: boolean }) {
  const business = useBusinessInfo()
  const whatsapp = useWhatsapp()
  const pill = `inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full font-subtitle text-sm ${
    onDark ? 'bg-white/15 text-white' : 'glass-chip text-onyx'
  }`
  const mapHref =
    business.mapUrl ||
    (business.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapSearchText(business.address))}`
      : '')
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void tap()
          downloadBookingIcs({
            serviceName: booking.service.name,
            startsAtIso: booking.slot.startsAt,
            durationLabel: booking.service.durationLabel,
          })
        }}
        className={pill}
      >
        <i className="bx bx-calendar-plus text-lg" aria-hidden="true" />
        Calendário
      </button>
      {mapHref && (
        <a href={mapHref} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={pill}>
          <i className="bx bx-map text-lg" aria-hidden="true" />
          Como chegar
        </a>
      )}
      {whatsapp.enabled && (
        <a
          href={whatsapp.url(
            `Olá! Sobre a minha marcação de ${booking.service.name} (${longDay(booking.slot.startsAt)} às ${timeLabel(booking.slot.startsAt)}).`,
          )}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          onClick={(e) => e.stopPropagation()}
          className={`${pill} max-w-[3.25rem]`}
        >
          <i className="bx bxl-whatsapp text-xl" aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

/** The next session, large: the day and time, the hairstyle, how long until it, and quick actions. */
function NextSession({ booking, onOpen, isNew }: { booking: Booking; onOpen: () => void; isNew?: boolean }) {
  const { weekday, day, month } = dayParts(booking.slot.startsAt)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      role="button"
      tabIndex={0}
      onClick={() => {
        void tap()
        onOpen()
      }}
      className="cursor-pointer rounded-3xl bg-onyx p-5 text-white"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-white/60">Próxima sessão</p>
        <span className="flex items-center gap-2">
          {isNew && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 font-subtitle text-[10px] font-semibold uppercase tracking-wide text-[#ffffff]">
              Novo
            </span>
          )}
          <span className="rounded-full bg-white/15 px-2.5 py-1 font-subtitle text-xs font-medium">
            {countdown(booking.slot.startsAt)}
          </span>
        </span>
      </div>

      <div className="mt-4 flex items-end gap-4">
        <div className="text-center">
          <p className="font-subtitle text-xs uppercase tracking-wide text-white/60">{weekday}</p>
          <p className="font-subtitle text-5xl font-semibold leading-none tracking-tight">{day}</p>
          <p className="mt-1 font-subtitle text-xs uppercase tracking-wide text-white/60">{month}</p>
        </div>
        <div className="min-w-0 flex-1 border-l border-white/15 pl-4">
          <p className="font-subtitle text-3xl font-semibold leading-none tabular-nums">
            {timeLabel(booking.slot.startsAt)}
          </p>
          <p className="mt-2 truncate font-subtitle text-base font-medium">{booking.service.name}</p>
          {bookingExtras(booking) && (
            <p className="truncate font-subtitle text-sm text-white/60">{bookingExtras(booking)}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3 font-subtitle text-sm">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${booking.status === 'ACCEPTED' ? 'bg-emerald-400' : 'bg-amber-400'}`}
            aria-hidden="true"
          />
          {STATUS[booking.status].label}
        </span>
        <span className="tabular-nums text-white/80">{formatPrice(bookingPrice(booking))}</span>
      </div>

      <div className="mt-4">
        <SessionActions booking={booking} onDark />
      </div>
    </motion.div>
  )
}

/** One booking as a row: the day in a small tile, the hairstyle and time, the status and a chevron. */
function BookingRow({ booking, onOpen, isNew }: { booking: Booking; onOpen: () => void; isNew?: boolean }) {
  const { day, month } = dayParts(booking.slot.startsAt)
  const faded = booking.status === 'CANCELLED' || booking.status === 'REJECTED'
  return (
    <button
      type="button"
      onClick={() => {
        void tap()
        onOpen()
      }}
      className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-onyx/[0.04]"
    >
      <span
        className={`flex w-12 shrink-0 flex-col items-center rounded-xl bg-white py-1.5 shadow-sm shadow-black/5 ${faded ? 'opacity-50' : ''}`}
      >
        <span className="font-subtitle text-lg font-semibold leading-none text-onyx">{day}</span>
        <span className="mt-0.5 font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">{month}</span>
      </span>
      <span className={`min-w-0 flex-1 ${faded ? 'opacity-60' : ''}`}>
        <span className="flex items-center gap-2">
          <span className="truncate font-subtitle text-[15px] font-semibold text-onyx">{booking.service.name}</span>
          {isNew && (
            <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 font-subtitle text-[9px] font-semibold uppercase tracking-wide text-[#ffffff]">
              Novo
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate font-subtitle text-[13px] text-muted-dark">{rowDetails(booking)}</span>
      </span>
      <StatusDot status={booking.status} />
      <i className="bx bx-chevron-right -mr-1 text-xl text-onyx/30" aria-hidden="true" />
    </button>
  )
}

/** `wide`: the website's layout, the cards side by side instead of the app's single column. */
export default function BookingsScreen({ wide = false }: { wide?: boolean } = {}) {
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

  // Opened from a notification (/marcacoes?abrir=<id>): show that booking's details straight away, on its tab.
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('abrir')
  useEffect(() => {
    if (!openId || !bookings) return
    const booking = bookings.find((b) => b.id === openId)
    const timer = window.setTimeout(() => {
      if (booking) {
        setTab(past.includes(booking) ? 'past' : 'next')
        open(booking)
      }
      setSearchParams({}, { replace: true })
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, bookings])

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
    <main className="px-5 pb-40 pt-[calc(4.5rem+env(safe-area-inset-top))]" {...handlers}>
      {indicator}
      <div className={wide ? 'mx-auto max-w-6xl sm:px-3' : 'mx-auto max-w-md'}>
        <h1 className="font-subtitle text-[30px] font-semibold leading-tight tracking-tight text-onyx">
          As minhas marcações
        </h1>

        <div className={`glass-chip mt-6 flex rounded-full p-1 ${wide ? 'max-w-md' : ''}`}>
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
                  className="glass-chip-on absolute inset-0 rounded-full"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className={`relative ${tab === id ? 'text-onyx' : 'text-onyx/60'}`}>
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
            <div className="h-56 animate-pulse rounded-3xl bg-onyx/5" />
            <div className="h-16 animate-pulse rounded-2xl bg-onyx/5" />
          </div>
        )}

        {bookings && list.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <i className="bx bx-calendar-heart text-6xl text-onyx/25" aria-hidden="true" />
            <p className="mt-4 font-subtitle text-lg text-onyx">
              {tab === 'next' ? 'Sem sessões marcadas' : 'Ainda sem histórico'}
            </p>
            {tab === 'next' && (
              <>
                <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
                  Marca a tua próxima sessão em poucos toques.
                </p>
                <ActionButton label="Marcar sessão" className="mt-6" onClick={() => navigate(bookPath)} />
              </>
            )}
          </div>
        )}

        {bookings && list.length > 0 && (
          <div className={`mt-6 ${wide ? 'grid items-start gap-6 lg:grid-cols-2' : 'flex flex-col gap-6'}`}>
            {/* The next session stands out; the others follow as a list. */}
            {tab === 'next' && (
              <NextSession booking={list[0]} isNew={fresh.has(list[0].id)} onOpen={() => open(list[0])} />
            )}
            {(tab === 'next' ? list.slice(1) : list).length > 0 && (
              <section>
                {tab === 'next' && (
                  <h2 className="mb-2 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">
                    Depois
                  </h2>
                )}
                <div className={group}>
                  {(tab === 'next' ? list.slice(1) : list).map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      isNew={fresh.has(booking.id)}
                      onOpen={() => open(booking)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
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
        closeLabel={mode === 'details' ? 'Fechar' : 'Voltar'}
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
            <div className={group}>
              <div className="flex min-h-[48px] items-center justify-between px-4 py-2.5">
                <span className="font-subtitle text-[15px] text-onyx">Estado</span>
                <StatusDot status={selected.status} />
              </div>
              {bookingExtras(selected) && (
                <div className="flex min-h-[48px] items-center justify-between gap-4 px-4 py-2.5 font-subtitle text-[15px]">
                  <span className="text-onyx">Escolha</span>
                  <span className="text-right text-onyx/70">{bookingExtras(selected)}</span>
                </div>
              )}
              <div className="flex min-h-[48px] items-center justify-between px-4 py-2.5 font-subtitle text-[15px]">
                <span className="text-onyx">Duração</span>
                <span className="text-onyx/70">{selected.service.durationLabel}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between px-4 py-2.5 font-subtitle text-[15px]">
                <span className="text-onyx">Preço</span>
                <span className="font-semibold tabular-nums text-onyx">{formatPrice(bookingPrice(selected))}</span>
              </div>
            </div>
            {STATUS[selected.status].hint && (
              <p className="px-1 font-subtitle text-sm font-light text-muted-dark">{STATUS[selected.status].hint}</p>
            )}
            {manageable && <SessionActions booking={selected} />}
            {manageable && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setMode('cancel')
                }}
                className="flex items-center justify-center gap-1.5 py-1 font-subtitle text-sm text-red-700 dark:text-red-400"
              >
                <i className="bx bx-calendar-x text-lg" aria-hidden="true" />
                Cancelar a marcação
              </button>
            )}
            {selected.status === 'REJECTED' && (
              <ActionButton label="Escolher outro horário" onClick={() => navigate(bookPath)} />
            )}
            {selected.status === 'ACCEPTED' && !manageable && (
              <div className="flex justify-center">
                <ActionButton
                  label="Marcar de novo"
                  onClick={() => navigate(`${bookPath}?service=${selected.service.id}`)}
                />
              </div>
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
