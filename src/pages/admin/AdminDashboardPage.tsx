import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { BottomNavBar } from '@/components/ui/bottom-nav-bar'
import { DatePicker } from '@/components/ui/date-picker'
import { MotionButton } from '@/components/ui/motion-button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { adminToken, api, ApiError } from '@/lib/api'
import { registerForPushNotifications } from '@/lib/push-notifications'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Service, type Testimonial } from '@/lib/types'

const LISBON_TZ = 'Europe/Lisbon'

function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: LISBON_TZ })
}

// Slots/bookings store UTC timestamps, but the admin thinks in Lisbon-local
// months — resolving via Intl (not a raw UTC range) keeps this consistent
// with the same calculation the backend does for the month-clear endpoint.
function getLisbonYearMonth(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LISBON_TZ,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date)
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
  }
}

function formatMonthLabel(viewMonth: { year: number; month: number }) {
  const label = new Date(viewMonth.year, viewMonth.month - 1, 1).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDateTime(iso: string) {
  const label = new Date(iso).toLocaleString('pt-PT', {
    timeZone: LISBON_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function dateParts(iso: string) {
  const d = new Date(iso)
  const tz = { timeZone: LISBON_TZ }
  return {
    day: d.toLocaleDateString('pt-PT', { ...tz, day: 'numeric' }),
    month: d.toLocaleDateString('pt-PT', { ...tz, month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('pt-PT', { ...tz, weekday: 'long' }),
    time: d.toLocaleTimeString('pt-PT', { ...tz, hour: '2-digit', minute: '2-digit' }),
  }
}

const SLOT_TIMES = Array.from({ length: 25 }, (_, i) => {
  const minutes = 8 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

const SLOT_STATUS_LABEL: Record<AvailabilitySlot['status'], string> = {
  OPEN: 'Disponível',
  PENDING: 'Pendente',
  BOOKED: 'Reservado',
}

const HISTORY_STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Concluída',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-subtitle text-xl text-onyx sm:text-2xl">{children}</h2>
}

type AdminTab = 'pedidos' | 'agenda' | 'disponibilidade' | 'servicos' | 'testemunhos'

const TABS: Array<{ id: AdminTab; label: string; icon: string }> = [
  { id: 'pedidos', label: 'Pedidos', icon: 'bx bx-bell' },
  { id: 'agenda', label: 'Agenda', icon: 'bx bx-calendar-check' },
  { id: 'disponibilidade', label: 'Horários', icon: 'bx bx-time-five' },
  { id: 'servicos', label: 'Serviços', icon: 'bx bx-cut' },
  { id: 'testemunhos', label: 'Testemunhos', icon: 'bx bx-message-rounded-dots' },
]

function dayHeading(iso: string) {
  const key = dateKey(iso)
  const today = dateKey(new Date().toISOString())
  const tomorrow = dateKey(new Date(Date.now() + 86_400_000).toISOString())
  const { weekday, day, month } = dateParts(iso)
  const base = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day} ${month}`
  if (key === today) return { title: 'Hoje', sub: base }
  if (key === tomorrow) return { title: 'Amanhã', sub: base }
  return { title: base, sub: '' }
}

const HISTORY_CHIP: Record<Booking['status'], string> = {
  PENDING: 'bg-gold-deep/10 text-gold-deep',
  ACCEPTED: 'bg-gold-deep/10 text-gold-deep',
  REJECTED: 'bg-red-700/10 text-red-700',
  CANCELLED: 'bg-onyx/5 text-muted-dark',
}

function groupByDay(bookings: Booking[]) {
  const groups = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const key = dateKey(booking.slot.startsAt)
    groups.set(key, [...(groups.get(key) ?? []), booking])
  }
  return [...groups.values()]
}

function AgendaView({
  pendingCount,
  confirmedCount,
  revenueCents,
  upcoming,
  history,
  busyId,
  onCancel,
}: {
  pendingCount: number
  confirmedCount: number
  revenueCents: number
  upcoming: Booking[]
  history: Booking[]
  busyId: string | null
  onCancel: (id: string) => void
}) {
  const [view, setView] = useState<'proximas' | 'historico'>('proximas')
  const stats = [
    { icon: 'bx bx-time-five', label: 'Pendentes', value: String(pendingCount) },
    { icon: 'bx bx-calendar-check', label: 'Confirmadas', value: String(confirmedCount) },
    { icon: 'bx bx-euro', label: 'Receita', value: formatPrice(revenueCents) },
  ]

  return (
    <div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5">
            <i className={`${stat.icon} text-lg text-gold-deep`} aria-hidden="true" />
            <p className="mt-2 font-logo text-xl leading-none text-onyx">{stat.value}</p>
            <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex rounded-full border border-gold/20 bg-white p-1 shadow-sm shadow-black/5">
        {(
          [
            ['proximas', 'Próximas', upcoming.length],
            ['historico', 'Histórico', history.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className="relative flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 font-subtitle text-sm"
          >
            {view === id && (
              <motion.span
                layoutId="agenda-segment"
                className="absolute inset-0 rounded-full bg-gold-deep"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative transition-colors ${view === id ? 'text-cream' : 'text-onyx/70'}`}>{label}</span>
            <span
              className={`relative rounded-full px-2 py-0.5 text-[11px] leading-none transition-colors ${
                view === id ? 'bg-cream/20 text-cream' : 'bg-gold-deep/10 text-gold-deep'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {view === 'proximas' &&
        (upcoming.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <i className="bx bx-calendar text-5xl text-gold-deep/40" aria-hidden="true" />
            <p className="mt-3 font-subtitle text-base text-onyx">Sem sessões marcadas</p>
            <p className="mt-1 font-subtitle text-sm text-muted-dark">
              As sessões confirmadas deste mês aparecem aqui.
            </p>
          </div>
        ) : (
          groupByDay(upcoming).map((dayBookings) => {
            const heading = dayHeading(dayBookings[0].slot.startsAt)
            return (
              <section key={dateKey(dayBookings[0].slot.startsAt)} className="mt-7">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-logo text-lg text-onyx">{heading.title}</h3>
                  {heading.sub && <span className="font-subtitle text-xs text-muted-dark">{heading.sub}</span>}
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  {dayBookings.map((booking) => (
                    <article
                      key={booking.id}
                      className="flex overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm shadow-black/5"
                    >
                      <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-gold/20 bg-gold-deep/5 py-4">
                        <span className="font-logo text-xl leading-none text-onyx">
                          {dateParts(booking.slot.startsAt).time}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-subtitle text-base font-medium text-onyx">
                              {booking.customerName}
                            </p>
                            <p className="mt-0.5 font-subtitle text-sm text-muted-dark">
                              {booking.service.name} · {formatPrice(booking.service.priceCents)}
                            </p>
                          </div>
                          <a
                            href={customerWhatsappUrl(
                              booking.customerPhone,
                              `Olá ${booking.customerName}! Sobre a tua sessão de ${booking.service.name}...`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`WhatsApp de ${booking.customerName}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/20 text-lg text-onyx transition-colors hover:border-gold-deep hover:text-gold-deep"
                          >
                            <i className="bx bxl-whatsapp" aria-hidden="true" />
                          </a>
                        </div>
                        {booking.notes && (
                          <p className="mt-2 rounded-lg bg-gold-deep/5 px-3 py-2 font-subtitle text-xs italic text-muted-dark">
                            "{booking.notes}"
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="font-subtitle text-xs text-muted-dark">{booking.customerPhone}</span>
                          <button
                            type="button"
                            disabled={busyId === booking.id}
                            onClick={() => onCancel(booking.id)}
                            className="font-subtitle text-sm text-muted-dark underline-offset-4 transition-colors hover:text-red-700 hover:underline disabled:opacity-50"
                          >
                            Cancelar sessão
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })
        ))}

      {view === 'historico' &&
        (history.length === 0 ? (
          <div className="mt-12 flex flex-col items-center text-center">
            <i className="bx bx-history text-5xl text-gold-deep/40" aria-hidden="true" />
            <p className="mt-3 font-subtitle text-base text-onyx">Sem histórico</p>
            <p className="mt-1 font-subtitle text-sm text-muted-dark">As sessões passadas aparecem aqui.</p>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-gold/15 overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-sm shadow-black/5">
            {history.map((booking) => {
              const { day, month, time } = dateParts(booking.slot.startsAt)
              return (
                <div key={booking.id} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="w-12 shrink-0 text-center">
                    <p className="font-logo text-lg leading-none text-onyx">{day}</p>
                    <p className="mt-1 font-subtitle text-[10px] uppercase text-muted-dark">{month}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-subtitle text-sm font-medium text-onyx">{booking.customerName}</p>
                    <p className="truncate font-subtitle text-xs text-muted-dark">
                      {booking.service.name} · {time}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 font-subtitle text-[11px] ${HISTORY_CHIP[booking.status]}`}
                  >
                    {HISTORY_STATUS_LABEL[booking.status]}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>(() => {
    const fromHash = window.location.hash.slice(1)
    return TABS.some((t) => t.id === fromHash) ? (fromHash as AdminTab) : 'pedidos'
  })
  const [scrolled, setScrolled] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState('')
  const [batchTimes, setBatchTimes] = useState<string[]>([])
  const [addingSlot, setAddingSlot] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [editDuration, setEditDuration] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null)

  const [showAddService, setShowAddService] = useState(false)
  const [newServiceName, setNewServiceName] = useState('')
  const [newServiceDescription, setNewServiceDescription] = useState('')
  const [newServiceDuration, setNewServiceDuration] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [addingService, setAddingService] = useState(false)

  const [viewMonth, setViewMonth] = useState(() => getLisbonYearMonth(new Date()))
  const [clearingOpen, setClearingOpen] = useState(false)
  const [clearSummary, setClearSummary] = useState<{ slotCount: number; bookingCount: number } | null>(null)
  const [clearPassword, setClearPassword] = useState('')
  const [clearBusy, setClearBusy] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const loadDashboard = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      try {
        const [servicesData, slotsData, bookingsData, testimonialsData] = await Promise.all([
          api.get<Service[]>('/services'),
          api.get<AvailabilitySlot[]>('/admin/availability'),
          api.get<Booking[]>('/admin/bookings'),
          api.get<Testimonial[]>('/admin/testimonials'),
        ])
        setServices(servicesData)
        setSlots(slotsData)
        setBookings(bookingsData)
        setTestimonials(testimonialsData)
        if (!opts.silent) setError(null)
      } catch (err) {
        // An expired/invalid session used to be swallowed by the silent poll, leaving
        // the dashboard frozen on stale data with no new requests ever appearing.
        if (err instanceof ApiError && err.status === 401) {
          adminToken.set(null)
          navigate('/admin/login')
          return
        }
        if (!opts.silent) setError('Não foi possível carregar os dados do painel.')
      }
    },
    [navigate],
  )

  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await api.get<{ email: string }>('/auth/me')
        setAdminEmail(me.email)
        await loadDashboard()
        void registerForPushNotifications()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) adminToken.set(null)
        navigate('/admin/login')
      } finally {
        setCheckingAuth(false)
      }
    }
    void checkAuth()
  }, [navigate, loadDashboard])

  // Keeps pending bookings (and everything else) live while the dashboard is
  // open, so a new request shows up on its own — no manual refresh, no
  // leaving and reopening the app. Polls only while authenticated and the
  // app is actually in the foreground, and refreshes immediately the moment
  // it comes back to the foreground rather than waiting for the next tick.
  useEffect(() => {
    if (checkingAuth || !adminEmail) return

    const poll = () => {
      if (document.visibilityState === 'visible') {
        void loadDashboard({ silent: true })
      }
    }

    const interval = setInterval(poll, 8000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [checkingAuth, adminEmail, loadDashboard])

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } finally {
      adminToken.set(null)
      navigate('/admin/login')
    }
  }

  async function handleCreateSlots(e: FormEvent) {
    e.preventDefault()
    if (!newDate || batchTimes.length === 0) return
    setAddingSlot(true)
    setError(null)
    try {
      const startsAtList = batchTimes.map((time) => new Date(`${newDate}T${time}:00`).toISOString())
      await api.post('/admin/availability/batch', { startsAtList })
      setNewDate('')
      setBatchTimes([])
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar vagas.')
    } finally {
      setAddingSlot(false)
    }
  }

  async function handleDeleteSlot(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.delete(`/admin/availability/${id}`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover vaga.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleBookingDecision(id: string, decision: 'accept' | 'reject' | 'cancel') {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/admin/bookings/${id}/${decision}`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar marcação.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleTestimonialDecision(id: string, decision: 'approve' | 'reject') {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/admin/testimonials/${id}/${decision}`)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar testemunho.')
    } finally {
      setBusyId(null)
    }
  }

  function shiftMonth(delta: number) {
    setViewMonth((prev) => {
      const zeroBased = prev.month - 1 + delta
      const year = prev.year + Math.floor(zeroBased / 12)
      const month = (((zeroBased % 12) + 12) % 12) + 1
      return { year, month }
    })
    setClearingOpen(false)
    setClearSummary(null)
    setClearPassword('')
    setClearError(null)
  }

  async function openClearPanel() {
    setClearingOpen(true)
    setClearError(null)
    try {
      const summary = await api.get<{ slotCount: number; bookingCount: number }>(
        `/admin/maintenance/months/${viewMonth.year}/${viewMonth.month}/summary`,
      )
      setClearSummary(summary)
    } catch {
      setClearError('Não foi possível carregar o resumo deste mês.')
    }
  }

  async function handleClearMonth() {
    if (!clearPassword) return
    setClearBusy(true)
    setClearError(null)
    try {
      await api.post(`/admin/maintenance/months/${viewMonth.year}/${viewMonth.month}/clear`, {
        password: clearPassword,
      })
      setClearingOpen(false)
      setClearSummary(null)
      setClearPassword('')
      await loadDashboard()
    } catch (err) {
      setClearError(err instanceof ApiError ? err.message : 'Erro ao limpar dados do mês.')
    } finally {
      setClearBusy(false)
    }
  }

  function startEditService(service: Service) {
    setEditingServiceId(service.id)
    setEditDuration(service.durationLabel)
    setEditPrice((service.priceCents / 100).toFixed(2))
  }

  async function saveServiceEdit(service: Service) {
    const price = Number(editPrice.replace(',', '.'))
    if (Number.isNaN(price) || price < 0 || !editDuration.trim()) {
      setError('Preço ou duração inválidos.')
      return
    }
    setSavingServiceId(service.id)
    setError(null)
    try {
      await api.patch(`/admin/services/${service.id}`, {
        priceCents: Math.round(price * 100),
        durationLabel: editDuration.trim(),
      })
      setEditingServiceId(null)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar serviço.')
    } finally {
      setSavingServiceId(null)
    }
  }

  async function handleCreateService(e: FormEvent) {
    e.preventDefault()
    const price = Number(newServicePrice.replace(',', '.'))
    if (!newServiceName.trim() || !newServiceDescription.trim() || !newServiceDuration.trim()) {
      setError('Preenche o nome, a descrição e a duração do novo modelo.')
      return
    }
    if (Number.isNaN(price) || price < 0) {
      setError('Preço inválido.')
      return
    }
    setAddingService(true)
    setError(null)
    try {
      await api.post('/admin/services', {
        name: newServiceName.trim(),
        description: newServiceDescription.trim(),
        durationLabel: newServiceDuration.trim(),
        priceCents: Math.round(price * 100),
      })
      setNewServiceName('')
      setNewServiceDescription('')
      setNewServiceDuration('')
      setNewServicePrice('')
      setShowAddService(false)
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao adicionar modelo de tranças.')
    } finally {
      setAddingService(false)
    }
  }

  const monthSlots = slots.filter((s) => {
    const { year, month } = getLisbonYearMonth(new Date(s.startsAt))
    return year === viewMonth.year && month === viewMonth.month
  })
  const monthBookings = bookings.filter((b) => {
    const { year, month } = getLisbonYearMonth(new Date(b.slot.startsAt))
    return year === viewMonth.year && month === viewMonth.month
  })

  const slotsByDate = (() => {
    const groups = new Map<string, AvailabilitySlot[]>()
    for (const slot of monthSlots) {
      const key = dateKey(slot.startsAt)
      const existing = groups.get(key) ?? []
      existing.push(slot)
      groups.set(key, existing)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  })()

  // Times already opened on the chosen day (so they can't be created twice).
  const takenTimes = new Set(
    slots.filter((slot) => newDate && dateKey(slot.startsAt) === newDate).map((slot) => dateParts(slot.startsAt).time),
  )

  const nowMs = Date.now()
  // Pending requests need action no matter which month they are for, so they
  // are not filtered by the month being viewed (that used to hide new requests).
  const pendingBookings = bookings
    .filter((b) => b.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const upcomingConfirmed = monthBookings
    .filter((b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime())
  const history = monthBookings
    .filter(
      (b) =>
        b.status === 'REJECTED' ||
        b.status === 'CANCELLED' ||
        (b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() < nowMs),
    )
    .sort((a, b) => new Date(b.slot.startsAt).getTime() - new Date(a.slot.startsAt).getTime())

  const pendingTestimonials = testimonials.filter((t) => t.status === 'PENDING')
  const resolvedTestimonials = testimonials
    .filter((t) => t.status !== 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const monthConfirmedCount = monthBookings.filter((b) => b.status === 'ACCEPTED').length
  const monthRevenueCents = monthBookings
    .filter((b) => b.status === 'ACCEPTED')
    .reduce((sum, b) => sum + b.service.priceCents, 0)

  const pillClasses = `flex items-center rounded-full bg-white/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow duration-500 ${
    scrolled ? 'shadow-xl shadow-black/15' : ''
  }`

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-subtitle text-muted-dark">
        A verificar sessão...
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Not fixed: the header scrolls away with the page. */}
      <div className="absolute inset-x-0 top-0 z-40 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-deep">AFROGLOW</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="h-12 w-12 border-transparent bg-white/95 shadow-lg shadow-black/10 backdrop-blur" />
            <button
              type="button"
              onClick={handleLogout}
              className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-deep sm:px-6 ${pillClasses}`}
            >
              <span>Sair</span>
              <i className="bx bx-log-out text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-5 pb-36 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-8 sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">Painel de Admin</h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">{adminEmail}</p>

        {error && <p className="mt-6 font-subtitle text-sm text-red-700">{error}</p>}

        {(tab === 'agenda' || tab === 'disponibilidade') && (
          <div className="mt-6 flex items-center justify-center gap-4 rounded-full border border-gold/20 bg-white px-4 py-2 shadow-sm shadow-black/5 sm:justify-start">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-white hover:text-gold-deep"
            >
              <i className="bx bx-chevron-left" aria-hidden="true" />
            </button>
            <span className="font-logo text-sm text-onyx">{formatMonthLabel(viewMonth)}</span>
            <button
              type="button"
              aria-label="Mês seguinte"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-white hover:text-gold-deep"
            >
              <i className="bx bx-chevron-right" aria-hidden="true" />
            </button>
          </div>
        )}

        {tab === 'agenda' && (
          <AgendaView
            pendingCount={pendingBookings.length}
            confirmedCount={monthConfirmedCount}
            revenueCents={monthRevenueCents}
            upcoming={upcomingConfirmed}
            history={history}
            busyId={busyId}
            onCancel={(id) => handleBookingDecision(id, 'cancel')}
          />
        )}

        <div key={tab}>
          {tab === 'servicos' && (
            <section className="mt-8">
              <SectionHeading>Serviços e preços</SectionHeading>
              <div className="mt-6 flex flex-col gap-3">
                {services.map((service) => {
                  const isEditing = editingServiceId === service.id
                  return (
                    <div key={service.id} className="rounded-2xl border border-gold/20 p-5">
                      {isEditing ? (
                        <div className="flex flex-col gap-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1.5">
                              <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                                Duração
                              </span>
                              <input
                                value={editDuration}
                                onChange={(e) => setEditDuration(e.target.value)}
                                className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-gold-deep"
                              />
                            </label>
                            <label className="flex flex-col gap-1.5">
                              <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                                Preço (€)
                              </span>
                              <input
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                inputMode="decimal"
                                className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-gold-deep"
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-3">
                            <MotionButton
                              label={savingServiceId === service.id ? 'A guardar...' : 'Guardar'}
                              size="sm"
                              disabled={savingServiceId === service.id}
                              onClick={() => saveServiceEdit(service)}
                              icon={<i className="bx bx-check text-lg" aria-hidden="true" />}
                            />
                            <button
                              type="button"
                              onClick={() => setEditingServiceId(null)}
                              className="font-subtitle text-sm text-muted-dark transition-colors hover:text-onyx"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-subtitle text-base text-onyx">{service.name}</p>
                            <p className="mt-0.5 font-logo text-xs tracking-wide text-muted-dark">
                              {service.durationLabel}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-logo text-xl text-gold-deep">{formatPrice(service.priceCents)}</span>
                            <button
                              type="button"
                              onClick={() => startEditService(service)}
                              aria-label={`Editar ${service.name}`}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 text-muted-dark transition-colors duration-300 hover:border-gold-deep hover:text-gold-deep"
                            >
                              <i className="bx bx-pencil" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4">
                {showAddService ? (
                  <form
                    onSubmit={handleCreateService}
                    className="flex flex-col gap-4 rounded-2xl border border-gold/20 p-5"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Nome</span>
                        <input
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="Ex: Twist Braids"
                          className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-gold-deep"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Duração</span>
                        <input
                          value={newServiceDuration}
                          onChange={(e) => setNewServiceDuration(e.target.value)}
                          placeholder="Ex: 3-5h"
                          className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-gold-deep"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 sm:col-span-2">
                        <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Descrição</span>
                        <input
                          value={newServiceDescription}
                          onChange={(e) => setNewServiceDescription(e.target.value)}
                          placeholder="Breve descrição para as clientes"
                          className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-gold-deep"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Preço (€)</span>
                        <input
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          inputMode="decimal"
                          placeholder="Ex: 65"
                          className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-gold-deep"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <MotionButton
                        label={addingService ? 'A adicionar...' : 'Adicionar modelo'}
                        size="sm"
                        type="submit"
                        disabled={addingService}
                        icon={<i className="bx bx-plus text-lg" aria-hidden="true" />}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddService(false)}
                        className="font-subtitle text-sm text-muted-dark transition-colors hover:text-onyx"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddService(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/30 py-4 font-subtitle text-sm text-muted-dark transition-colors duration-300 hover:border-gold-deep hover:text-gold-deep"
                  >
                    <i className="bx bx-plus text-lg" aria-hidden="true" />
                    Adicionar novo modelo de tranças
                  </button>
                )}
              </div>
            </section>
          )}

          {tab === 'disponibilidade' && (
            <section className="mt-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Disponíveis', value: monthSlots.filter((slot) => slot.status === 'OPEN').length },
                  { label: 'Pendentes', value: monthSlots.filter((slot) => slot.status === 'PENDING').length },
                  { label: 'Reservadas', value: monthSlots.filter((slot) => slot.status === 'BOOKED').length },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-gold/20 bg-white p-4 shadow-sm shadow-black/5"
                  >
                    <p className="font-logo text-2xl leading-none text-onyx">{stat.value}</p>
                    <p className="mt-1.5 font-subtitle text-[11px] uppercase tracking-wide text-muted-dark">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleCreateSlots}
                className="mt-6 rounded-2xl border border-gold/20 bg-white p-5 shadow-sm shadow-black/5"
              >
                <h3 className="font-logo text-lg text-onyx">Criar horários</h3>
                <p className="mt-1 font-subtitle text-sm text-muted-dark">
                  Escolhe o dia e toca nas horas que queres abrir.
                </p>

                <div className="mt-4">
                  <span className="mb-1.5 block font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                    Dia
                  </span>
                  <DatePicker value={newDate} onChange={setNewDate} />
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Horas</span>
                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Manhã', times: SLOT_TIMES.filter((t) => t >= '09:00' && t <= '12:30') },
                        { label: 'Tarde', times: SLOT_TIMES.filter((t) => t >= '14:00' && t <= '18:00') },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setBatchTimes(
                              [...new Set([...batchTimes, ...preset.times.filter((t) => !takenTimes.has(t))])].sort(),
                            )
                          }
                          className="rounded-full px-3 py-1 font-subtitle text-xs text-onyx/70 transition-colors hover:bg-gold-deep/10 hover:text-onyx"
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBatchTimes([])}
                        disabled={batchTimes.length === 0}
                        className="rounded-full px-3 py-1 font-subtitle text-xs text-onyx/70 transition-colors hover:bg-gold-deep/10 hover:text-onyx disabled:opacity-30"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {SLOT_TIMES.map((time) => {
                      const taken = takenTimes.has(time)
                      const selected = batchTimes.includes(time)
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={taken || !newDate}
                          onClick={() =>
                            setBatchTimes(
                              selected ? batchTimes.filter((t) => t !== time) : [...batchTimes, time].sort(),
                            )
                          }
                          title={taken ? 'Já existe uma vaga a esta hora' : undefined}
                          className={`rounded-full border py-2 font-subtitle text-sm transition-colors ${
                            selected
                              ? 'border-gold-deep bg-gold-deep text-cream'
                              : taken
                                ? 'border-gold/20 text-onyx/30 line-through'
                                : 'border-gold/30 text-onyx hover:border-gold-deep'
                          } disabled:cursor-not-allowed`}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                  {!newDate && (
                    <p className="mt-2 font-subtitle text-xs text-muted-dark">
                      Escolhe primeiro o dia para ativar as horas.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-gold/15 pt-4">
                  <span className="font-subtitle text-sm text-muted-dark">
                    {batchTimes.length === 0
                      ? 'Nenhuma hora selecionada'
                      : `${batchTimes.length} ${batchTimes.length === 1 ? 'hora selecionada' : 'horas selecionadas'}`}
                  </span>
                  <MotionButton
                    label={
                      addingSlot
                        ? 'A criar...'
                        : batchTimes.length > 1
                          ? `Criar ${batchTimes.length} vagas`
                          : 'Criar vaga'
                    }
                    size="sm"
                    type="submit"
                    disabled={addingSlot || !newDate || batchTimes.length === 0}
                  />
                </div>
              </form>

              {slotsByDate.length === 0 ? (
                <div className="mt-12 flex flex-col items-center text-center">
                  <i className="bx bx-time-five text-5xl text-gold-deep/40" aria-hidden="true" />
                  <p className="mt-3 font-subtitle text-base text-onyx">Sem horários neste mês</p>
                  <p className="mt-1 font-subtitle text-sm text-muted-dark">
                    Cria vagas acima para as clientes poderem marcar.
                  </p>
                </div>
              ) : (
                slotsByDate.map(([key, daySlots]) => {
                  const heading = dayHeading(daySlots[0].startsAt)
                  const past = key < dateKey(new Date().toISOString())
                  return (
                    <div key={key} className={`mt-7 ${past ? 'opacity-55' : ''}`}>
                      <div className="flex items-baseline gap-3">
                        <h3 className="font-logo text-lg text-onyx">{heading.title}</h3>
                        {heading.sub && <span className="font-subtitle text-xs text-muted-dark">{heading.sub}</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center gap-2 rounded-full border py-1.5 pl-4 ${
                              slot.status === 'OPEN' ? 'pr-2' : 'pr-4'
                            } font-subtitle text-sm ${
                              slot.status === 'BOOKED'
                                ? 'border-onyx bg-onyx text-white'
                                : slot.status === 'PENDING'
                                  ? 'border-gold-deep bg-gold-deep/10 text-onyx'
                                  : 'border-gold/30 bg-white text-onyx'
                            }`}
                          >
                            <span className="font-medium">{dateParts(slot.startsAt).time}</span>
                            <span
                              className={`text-[11px] uppercase tracking-wide ${
                                slot.status === 'BOOKED' ? 'text-white/70' : 'text-muted-dark'
                              }`}
                            >
                              {SLOT_STATUS_LABEL[slot.status]}
                            </span>
                            {slot.status === 'OPEN' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                disabled={busyId === slot.id}
                                aria-label="Remover vaga"
                                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-dark transition-colors hover:bg-red-700/10 hover:text-red-700"
                              >
                                <i className="bx bx-x text-lg" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}

              <div className="mt-8 rounded-2xl border border-red-700/20 bg-red-700/5 p-5">
                {!clearingOpen ? (
                  <button type="button" onClick={openClearPanel} className="flex w-full items-center gap-3 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-700/10 text-red-700">
                      <i className="bx bx-trash text-lg" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-subtitle text-sm font-medium text-red-700">
                        Limpar dados de {formatMonthLabel(viewMonth)}
                      </span>
                      <span className="block font-subtitle text-xs text-muted-dark">
                        Apaga vagas e marcações do mês, permanentemente
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 rounded-xl bg-red-700/10 p-4">
                      <i className="bx bx-error mt-0.5 shrink-0 text-xl text-red-700" aria-hidden="true" />
                      <p className="font-subtitle text-sm text-red-800">
                        Isto apaga permanentemente {clearSummary ? clearSummary.slotCount : '...'} vaga(s) e{' '}
                        {clearSummary ? clearSummary.bookingCount : '...'} marcação(ões) de{' '}
                        {formatMonthLabel(viewMonth)}, incluindo marcações já aceites.{' '}
                        <strong>Não pode ser desfeito.</strong>
                      </p>
                    </div>
                    <label className="flex max-w-xs flex-col gap-1.5">
                      <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                        Confirma com a tua password
                      </span>
                      <input
                        type="password"
                        value={clearPassword}
                        onChange={(e) => setClearPassword(e.target.value)}
                        className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-red-700"
                      />
                    </label>
                    {clearError && <p className="font-subtitle text-sm text-red-700">{clearError}</p>}
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={!clearPassword || clearBusy}
                        onClick={handleClearMonth}
                      >
                        {clearBusy ? 'A limpar...' : 'Confirmar limpeza'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setClearingOpen(false)
                          setClearPassword('')
                          setClearError(null)
                        }}
                        className="rounded-full px-4 py-2 font-subtitle text-sm text-muted-dark transition-colors hover:bg-gold-deep/5 hover:text-onyx"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === 'pedidos' && (
            <section className="mt-8">
              <SectionHeading>Marcações pendentes</SectionHeading>
              {pendingBookings.length === 0 ? (
                <p className="mt-5 font-subtitle text-sm text-muted-dark">Sem marcações pendentes.</p>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  {pendingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/20 p-5"
                    >
                      <div>
                        <p className="flex flex-wrap items-center gap-2 font-subtitle text-base text-onyx">
                          <span className="font-medium">{booking.customerName}</span>
                          <a
                            href={customerWhatsappUrl(
                              booking.customerPhone,
                              `Olá ${booking.customerName}! Sobre a tua marcação de ${booking.service.name}...`,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-muted-dark transition-colors hover:text-gold-deep"
                          >
                            <i className="bx bxl-whatsapp" aria-hidden="true" />
                            {booking.customerPhone}
                          </a>
                        </p>
                        <p className="mt-1 font-subtitle text-sm text-muted-dark">
                          {booking.service.name} ({formatPrice(booking.service.priceCents)}) ·{' '}
                          {formatDateTime(booking.slot.startsAt)}
                        </p>
                        {booking.notes && (
                          <p className="mt-1 font-subtitle text-xs italic text-muted-dark">"{booking.notes}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MotionButton
                          label="Aceitar"
                          size="sm"
                          disabled={busyId === booking.id}
                          onClick={() => handleBookingDecision(booking.id, 'accept')}
                          icon={<i className="bx bx-check text-lg" aria-hidden="true" />}
                        />
                        <MotionButton
                          label="Recusar"
                          size="sm"
                          variant="secondary"
                          disabled={busyId === booking.id}
                          onClick={() => handleBookingDecision(booking.id, 'reject')}
                          icon={<i className="bx bx-x text-lg" aria-hidden="true" />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'testemunhos' && (
            <section className="mt-8">
              <SectionHeading>Testemunhos pendentes</SectionHeading>
              {pendingTestimonials.length === 0 ? (
                <p className="mt-5 font-subtitle text-sm text-muted-dark">Sem testemunhos por rever.</p>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  {pendingTestimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/20 p-5"
                    >
                      <div>
                        <p className="font-subtitle text-base text-onyx">
                          <span className="font-medium">{testimonial.customer.name}</span>
                        </p>
                        <p className="mt-1 max-w-xl font-subtitle text-sm italic text-muted-dark">
                          "{testimonial.content}"
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <MotionButton
                          label="Aprovar"
                          size="sm"
                          disabled={busyId === testimonial.id}
                          onClick={() => handleTestimonialDecision(testimonial.id, 'approve')}
                          icon={<i className="bx bx-check text-lg" aria-hidden="true" />}
                        />
                        <MotionButton
                          label="Recusar"
                          size="sm"
                          variant="secondary"
                          disabled={busyId === testimonial.id}
                          onClick={() => handleTestimonialDecision(testimonial.id, 'reject')}
                          icon={<i className="bx bx-x text-lg" aria-hidden="true" />}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resolvedTestimonials.length > 0 && (
                <div className="mt-6 flex flex-col gap-2">
                  {resolvedTestimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 py-3"
                    >
                      <p className="font-subtitle text-sm text-muted-dark">
                        {testimonial.customer.name} · "{testimonial.content}"
                      </p>
                      <span
                        className={`font-subtitle text-xs uppercase tracking-wide ${
                          testimonial.status === 'APPROVED' ? 'text-gold-deep' : 'text-red-700'
                        }`}
                      >
                        {testimonial.status === 'APPROVED' ? 'Aprovado' : 'Recusado'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <BottomNavBar
        stickyBottom
        value={tab}
        onChange={(id) => {
          setTab(id)
          window.scrollTo({ top: 0 })
        }}
        items={TABS.map(({ id, label, icon }) => ({
          id,
          label,
          icon,
          badge: id === 'pedidos' ? pendingBookings.length : id === 'testemunhos' ? pendingTestimonials.length : 0,
        }))}
      />
    </div>
  )
}
