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
import { formatPrice, type AvailabilitySlot, type Booking, type Service } from '@/lib/types'
import { serviceImageUrls } from '@/lib/service-images'
import { dayKey, dayParts, longDay, timeLabel } from './dates'
import { useBookingAlerts } from './booking-alerts'
import { StatusDot } from './panel'
import { SlotPicker } from './SlotPicker'
import { usePullToRefresh } from './usePullToRefresh'
import { bookingPrice, bookingExtras, servicePriceLabel } from '@/lib/pricing'

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

/** "Dom", "Qua": the weekday in three letters. */
const shortWeekday = (iso: string) => dayParts(iso).weekday.slice(0, 3)

/** The colour of a booking's dot: green confirmed, amber waiting, grey cancelled, red declined. */
const DOT_COLOUR: Record<Booking['status'], string> = {
  ACCEPTED: 'bg-emerald-500',
  PENDING: 'bg-amber-400',
  CANCELLED: 'bg-onyx/30',
  REJECTED: 'bg-red-600',
}

/**
 * The next session as a ticket: the hairstyle with its day, time and length on top; a perforated line with notches
 * on the sides; then the status, how long until it, the price and quick actions.
 */
function NextTicket({ booking, onOpen, isNew }: { booking: Booking; onOpen: () => void; isNew?: boolean }) {
  const { day, month } = dayParts(booking.slot.startsAt)
  const weekday = shortWeekday(booking.slot.startsAt)
  const label = 'font-subtitle text-[10px] font-medium uppercase tracking-[0.16em] text-white/55'
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
      className="relative cursor-pointer rounded-3xl bg-onyx text-white shadow-lg shadow-black/10"
    >
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-subtitle text-xs font-medium uppercase tracking-[0.18em] text-white/60">Próxima sessão</p>
          {isNew && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 font-subtitle text-[10px] font-semibold uppercase tracking-wide text-[#ffffff]">
              Novo
            </span>
          )}
        </div>
        <p className="mt-3 font-subtitle text-[26px] font-semibold leading-tight tracking-tight">
          {booking.service.name}
        </p>
        {bookingExtras(booking) && (
          <p className="mt-0.5 font-subtitle text-sm text-white/60">{bookingExtras(booking)}</p>
        )}

        <dl className="mt-5 grid grid-cols-[1.3fr_1fr_1fr] gap-3">
          <div>
            <dt className={label}>Dia</dt>
            <dd className="mt-1 font-subtitle text-base font-semibold">
              <span className="capitalize">{weekday}</span> {day} {month}
            </dd>
          </div>
          <div>
            <dt className={label}>Hora</dt>
            <dd className="mt-1 font-subtitle text-base font-semibold tabular-nums">
              {timeLabel(booking.slot.startsAt)}
            </dd>
          </div>
          <div>
            <dt className={label}>Duração</dt>
            <dd className="mt-1 font-subtitle text-base font-semibold">{booking.service.durationLabel}</dd>
          </div>
        </dl>
      </div>

      {/* The perforation: a dashed line with a round notch cut out on each side. */}
      <div className="relative mx-5 border-t-2 border-dashed border-white/20" aria-hidden="true">
        <span className="absolute -left-8 -top-[13px] size-6 rounded-full bg-white" />
        <span className="absolute -right-8 -top-[13px] size-6 rounded-full bg-white" />
      </div>

      <div className="px-5 pb-5 pt-4">
        <div className="flex items-center justify-between gap-3 font-subtitle text-sm">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${DOT_COLOUR[booking.status]}`} aria-hidden="true" />
            {STATUS[booking.status].label}
            <span className="ml-1 text-white/70">{countdown(booking.slot.startsAt)}</span>
          </span>
          <span className="font-semibold tabular-nums">{formatPrice(bookingPrice(booking))}</span>
        </div>
        <div className="mt-4">
          <SessionActions booking={booking} onDark />
        </div>
      </div>
    </motion.div>
  )
}

/** "Outubro 2026": the month a session falls in, for the timeline's headings. */
const monthHeading = (iso: string) => {
  const label = new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon', month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1).replace(' de ', ' ')
}

/**
 * Sessions as an agenda: grouped by month; on the left the day, then a line with a dot in the status colour, and the
 * time, hairstyle and choice beside it. Cancelled and declined ones are faded.
 */
function Timeline({
  bookings,
  fresh,
  onOpen,
}: {
  bookings: Booking[]
  fresh: Set<string>
  onOpen: (b: Booking) => void
}) {
  const months: Array<{ heading: string; items: Booking[] }> = []
  for (const b of bookings) {
    const heading = monthHeading(b.slot.startsAt)
    const last = months[months.length - 1]
    if (last?.heading === heading) last.items.push(b)
    else months.push({ heading, items: [b] })
  }
  return (
    <div className="flex flex-col gap-6">
      {months.map(({ heading, items }) => (
        <section key={heading}>
          <h2 className="mb-3 font-subtitle text-sm font-semibold text-onyx">{heading}</h2>
          <ol className="relative ml-12 border-l border-onyx/15">
            {items.map((b, i) => {
              const { day } = dayParts(b.slot.startsAt)
              const weekday = shortWeekday(b.slot.startsAt)
              const faded = b.status === 'CANCELLED' || b.status === 'REJECTED'
              return (
                <li key={b.id} className={`relative pl-5 ${i < items.length - 1 ? 'pb-4' : ''}`}>
                  <span className={`absolute -left-12 top-0.5 w-9 text-center ${faded ? 'opacity-50' : ''}`}>
                    <span className="block font-subtitle text-[10px] uppercase tracking-wide text-muted-dark">
                      {weekday}
                    </span>
                    <span className="block font-subtitle text-xl font-semibold leading-tight text-onyx">{day}</span>
                  </span>
                  <span
                    className={`absolute -left-[5px] top-2.5 size-2.5 rounded-full ring-4 ring-white ${DOT_COLOUR[b.status]}`}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void tap()
                      onOpen(b)
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--color-onyx)_4%,var(--color-white))] px-4 py-3 text-left active:bg-onyx/[0.07] ${faded ? 'opacity-60' : ''}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-subtitle text-[15px] font-semibold tabular-nums text-onyx">
                          {timeLabel(b.slot.startsAt)}
                        </span>
                        <span className="truncate font-subtitle text-[15px] text-onyx">{b.service.name}</span>
                        {fresh.has(b.id) && (
                          <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 font-subtitle text-[9px] font-semibold uppercase tracking-wide text-[#ffffff]">
                            Novo
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate font-subtitle text-[13px] text-muted-dark">
                        {STATUS[b.status].label}
                        {bookingExtras(b) && <span className="ml-2">{bookingExtras(b)}</span>}
                      </span>
                    </span>
                    <i className="bx bx-chevron-right -mr-1 text-xl text-onyx/30" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

/**
 * No sessions yet: three hairstyle photos fanned out, a short line and the way to book; then the hairstyles to start
 * from, as tall photo cards.
 */
function NoSessions({ onBook }: { onBook: (serviceId?: string) => void }) {
  const [services, setServices] = useState<Service[]>([])
  useEffect(() => {
    api
      .get<Service[]>('/services')
      .then((list) => setServices(list.filter((s) => s.active !== false)))
      .catch(() => {})
  }, [])
  const fan = services
    .map((s) => serviceImageUrls(s)[0])
    .filter(Boolean)
    .slice(0, 3)
  const tilt = ['-rotate-[9deg] -translate-x-[70%]', 'z-10', 'rotate-[9deg] translate-x-[70%]']

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center pt-4 text-center">
        <div className="relative flex h-44 w-full items-center justify-center">
          {(fan.length ? fan : ['', '', '']).map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute h-40 w-28 overflow-hidden rounded-2xl bg-onyx/[0.06] shadow-lg shadow-black/15 ring-4 ring-white ${tilt[i]}`}
            >
              {src && <img src={src} alt="" className="h-full w-full object-cover" />}
            </motion.div>
          ))}
        </div>
        <p className="mt-8 font-subtitle text-[22px] font-semibold tracking-tight text-onyx">Ainda não tens sessões</p>
        <p className="mt-1.5 max-w-xs font-subtitle text-sm leading-relaxed text-muted-dark">
          Escolhe o teu modelo e um horário livre. As tuas marcações aparecem aqui.
        </p>
        <div className="mt-6">
          <ActionButton label="Marcar sessão" onClick={() => onBook()} />
        </div>
      </div>

      {services.length > 0 && (
        <section>
          <h2 className="mb-3 px-1 font-subtitle text-xs font-medium uppercase tracking-[0.14em] text-muted-dark">
            Escolhe um modelo
          </h2>
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {services.map((service) => {
              const photo = serviceImageUrls(service)[0]
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    void tap()
                    onBook(service.id)
                  }}
                  className="relative aspect-[3/4] w-40 shrink-0 snap-start overflow-hidden rounded-3xl bg-onyx/5 text-left"
                >
                  {photo && (
                    <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3.5 pb-3.5 pt-12">
                    <span className="block truncate font-subtitle text-[15px] font-semibold text-[#ffffff]">
                      {service.name}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between font-subtitle text-xs text-[#ffffff]/75">
                      {servicePriceLabel(service)}
                      <i className="bx bx-right-arrow-alt text-base" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
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

        {/* Próximas / Anteriores as the iPhone's segmented control: a grey track, the chosen one on a lighter block
            that slides across. */}
        <div
          className={`mt-6 flex rounded-[12px] bg-[color-mix(in_srgb,var(--color-onyx)_7%,var(--color-white))] p-[3px] ${wide ? 'max-w-md' : ''}`}
          role="tablist"
        >
          {(
            [
              ['next', 'Próximas', next.length],
              ['past', 'Anteriores', past.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                void tap()
                setTab(id)
              }}
              className="relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] font-subtitle text-sm"
            >
              {tab === id && (
                <motion.span
                  layoutId="bookings-tab"
                  className="absolute inset-0 rounded-[9px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] dark:bg-[color-mix(in_srgb,var(--color-onyx)_20%,var(--color-white))]"
                  transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                />
              )}
              <span className={`relative ${tab === id ? 'font-semibold text-onyx' : 'text-onyx/60'}`}>{label}</span>
              {count > 0 && (
                <span
                  className={`relative min-w-5 rounded-full px-1.5 text-[11px] font-semibold tabular-nums leading-5 ${
                    tab === id ? 'bg-onyx text-white' : 'bg-onyx/10 text-onyx/60'
                  }`}
                >
                  {count}
                </span>
              )}
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
          <div className="mt-6">
            {tab === 'next' ? (
              <NoSessions onBook={(id) => navigate(id ? `${bookPath}?service=${id}` : bookPath)} />
            ) : (
              <div className="mt-10 flex flex-col items-center text-center">
                <i className="bx bx-history text-5xl text-onyx/25" aria-hidden="true" />
                <p className="mt-3 font-subtitle text-lg text-onyx">Ainda sem histórico</p>
                <p className="mt-1 font-subtitle text-sm font-light text-muted-dark">
                  As sessões que já tiveste aparecem aqui.
                </p>
              </div>
            )}
          </div>
        )}

        {bookings && list.length > 0 && (
          <div className={`mt-6 ${wide ? 'grid items-start gap-8 lg:grid-cols-2' : 'flex flex-col gap-8'}`}>
            {/* The next session as a ticket; the rest as an agenda by month. */}
            {tab === 'next' && (
              <NextTicket booking={list[0]} isNew={fresh.has(list[0].id)} onOpen={() => open(list[0])} />
            )}
            {(tab === 'next' ? list.slice(1) : list).length > 0 && (
              <Timeline bookings={tab === 'next' ? list.slice(1) : list} fresh={fresh} onOpen={open} />
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
