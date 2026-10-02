import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatePicker } from '@/components/ui/date-picker'
import { Avatar, EmptyState, IosButton, IosGroup, IosRow, Segmented } from '@/components/ui/ios'
import { TimePicker } from '@/components/ui/time-picker'
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

type AdminTab = 'pedidos' | 'agenda' | 'disponibilidade' | 'servicos' | 'testemunhos'

const TABS: Array<{ id: AdminTab; label: string; icon: string; iconActive: string; title: string; subtitle: string }> =
  [
    {
      id: 'pedidos',
      label: 'Pedidos',
      icon: 'bx bx-bell',
      iconActive: 'bx bxs-bell',
      title: 'Pedidos',
      subtitle: 'Marcações por aceitar ou recusar.',
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: 'bx bx-calendar-check',
      iconActive: 'bx bxs-calendar-check',
      title: 'Agenda',
      subtitle: 'Sessões confirmadas e histórico.',
    },
    {
      id: 'disponibilidade',
      label: 'Horários',
      icon: 'bx bx-time-five',
      iconActive: 'bx bxs-time-five',
      title: 'Horários',
      subtitle: 'Define quando estás disponível.',
    },
    {
      id: 'servicos',
      label: 'Serviços',
      icon: 'bx bx-cut',
      iconActive: 'bx bx-cut',
      title: 'Serviços',
      subtitle: 'Modelos de tranças e preços.',
    },
    {
      id: 'testemunhos',
      label: 'Testemunhos',
      icon: 'bx bx-message-rounded-dots',
      iconActive: 'bx bxs-message-rounded-dots',
      title: 'Testemunhos',
      subtitle: 'Avaliações das clientes por rever.',
    },
  ]

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

function BookingCard({
  booking,
  variant,
  busy,
  onDecision,
}: {
  booking: Booking
  variant: 'pending' | 'confirmed'
  busy: boolean
  onDecision: (id: string, decision: 'accept' | 'reject' | 'cancel') => void
}) {
  const { day, month, weekday, time } = dateParts(booking.slot.startsAt)
  const whatsappMessage =
    variant === 'pending'
      ? `Olá ${booking.customerName}! Sobre a tua marcação de ${booking.service.name}...`
      : `Olá ${booking.customerName}! Sobre a tua sessão de ${booking.service.name}...`

  return (
    <IosGroup>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Avatar name={booking.customerName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-[22px] text-onyx">{booking.customerName}</p>
          <p className="truncate text-[15px] leading-5 text-[#8e8e93]">
            {booking.service.name} · {formatPrice(booking.service.priceCents)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[17px] font-semibold leading-[22px] tabular-nums text-onyx">{time}</p>
          <p className="text-[13px] leading-5 text-[#8e8e93]">
            <span className="capitalize">{weekday.slice(0, 3)}</span>, {day} {month}
          </p>
        </div>
      </div>

      <a
        href={customerWhatsappUrl(booking.customerPhone, whatsappMessage)}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-11 items-center gap-3 px-4 py-2 active:bg-[#e5e5ea]"
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-[#34c759] text-lg text-white">
          <i className="bx bxl-whatsapp" aria-hidden="true" />
        </span>
        <span className="flex-1 text-[17px] text-onyx">{booking.customerPhone}</span>
        <i className="bx bx-chevron-right text-2xl text-[#c7c7cc]" aria-hidden="true" />
      </a>

      {booking.notes && (
        <p className="px-4 py-3 text-[15px] leading-5 text-[#8e8e93]">
          <span className="font-medium text-onyx">Notas: </span>
          {booking.notes}
        </p>
      )}

      <div className="grid gap-3 px-4 py-3" style={{ gridTemplateColumns: variant === 'pending' ? '1fr 1fr' : '1fr' }}>
        {variant === 'pending' ? (
          <>
            <IosButton kind="destructive" disabled={busy} onClick={() => onDecision(booking.id, 'reject')}>
              Recusar
            </IosButton>
            <IosButton kind="filled" disabled={busy} onClick={() => onDecision(booking.id, 'accept')}>
              Aceitar
            </IosButton>
          </>
        ) : (
          <IosButton kind="destructive" disabled={busy} onClick={() => onDecision(booking.id, 'cancel')}>
            Cancelar sessão
          </IosButton>
        )}
      </div>
    </IosGroup>
  )
}

function MonthStepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <IosGroup>
      <div className="flex h-12 items-center justify-between px-1">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={onPrev}
          className="flex h-11 w-11 items-center justify-center text-gold-deep active:opacity-50"
        >
          <i className="bx bx-chevron-left text-3xl" aria-hidden="true" />
        </button>
        <span className="text-[17px] font-semibold text-onyx">{label}</span>
        <button
          type="button"
          aria-label="Mês seguinte"
          onClick={onNext}
          className="flex h-11 w-11 items-center justify-center text-gold-deep active:opacity-50"
        >
          <i className="bx bx-chevron-right text-3xl" aria-hidden="true" />
        </button>
      </div>
    </IosGroup>
  )
}

const FIELD_CLASS =
  'w-full rounded-[10px] bg-[#f2f2f7] px-3 py-2.5 text-[17px] text-onyx outline-none placeholder:text-[#c7c7cc] focus:ring-2 focus:ring-gold-deep/40'
const PICKER_CLASS =
  'flex w-full items-center gap-2 rounded-[10px] bg-[#f2f2f7] px-3 py-2.5 text-[17px] text-onyx outline-none active:opacity-70'

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-[13px] uppercase tracking-wide text-[#6d6d72]">{children}</span>
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>(() => {
    const fromHash = window.location.hash.slice(1)
    return TABS.some((t) => t.id === fromHash) ? (fromHash as AdminTab) : 'pedidos'
  })

  const [agendaView, setAgendaView] = useState<'proximas' | 'historico'>('proximas')
  const [scrolled, setScrolled] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState('')
  const [newTimeInput, setNewTimeInput] = useState('')
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
    const onScroll = () => setScrolled(window.scrollY > 34)
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

  function addTimeToBatch() {
    if (newTimeInput && !batchTimes.includes(newTimeInput)) {
      setBatchTimes([...batchTimes, newTimeInput].sort())
      setNewTimeInput('')
    }
  }

  function removeTimeFromBatch(time: string) {
    setBatchTimes(batchTimes.filter((t) => t !== time))
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

  const nowMs = Date.now()
  // Pending requests need action no matter which month they are for, so they
  // are not filtered by the month being viewed (that used to hide new requests).
  const pendingBookings = bookings
    .filter((b) => b.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const upcomingConfirmed = monthBookings
    .filter((b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime())
  const allUpcomingCount = bookings.filter(
    (b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() >= nowMs,
  ).length
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

  if (checkingAuth) {
    return (
      <div className="ios-app flex min-h-screen items-center justify-center bg-[#f2f2f7] text-[17px] text-[#8e8e93]">
        A verificar sessão...
      </div>
    )
  }

  const currentTab = TABS.find((t) => t.id === tab)!
  const pendingSummary = `${pendingBookings.length} ${pendingBookings.length === 1 ? 'pendente' : 'pendentes'} · ${allUpcomingCount} ${allUpcomingCount === 1 ? 'sessão a vir' : 'sessões a vir'}`

  return (
    <div className="ios-app min-h-screen bg-[#f2f2f7] text-onyx">
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-colors duration-200 ${
          scrolled ? 'border-black/10 bg-[#f2f2f7]/80' : 'border-transparent bg-[#f2f2f7]/0'
        }`}
      >
        <div className="relative mx-auto flex h-11 max-w-2xl items-center justify-between px-4">
          <span className="font-logo text-xl leading-none tracking-wide text-gold-deep">AFROGLOW</span>
          <span
            className={`pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold transition-opacity duration-200 ${
              scrolled ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {currentTab.title}
          </span>
          <button type="button" onClick={handleLogout} className="text-[17px] text-gold-deep active:opacity-50">
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-[calc(3.25rem+env(safe-area-inset-top))]">
        <h1 className="px-1 text-[34px] font-bold leading-[41px] tracking-tight">{currentTab.title}</h1>
        <p className="mt-0.5 px-1 text-[15px] text-[#8e8e93]">
          {tab === 'pedidos' ? pendingSummary : currentTab.subtitle}
        </p>

        {error && <p className="mt-4 rounded-[12px] bg-[#ff3b30]/10 px-4 py-3 text-[15px] text-[#ff3b30]">{error}</p>}

        {/* ---------------- Pedidos ---------------- */}
        {tab === 'pedidos' &&
          (pendingBookings.length === 0 ? (
            <EmptyState icon="bx bx-bell-off" title="Sem pedidos" text="Os novos pedidos aparecem aqui." />
          ) : (
            pendingBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                variant="pending"
                busy={busyId === booking.id}
                onDecision={handleBookingDecision}
              />
            ))
          ))}

        {/* ---------------- Agenda ---------------- */}
        {tab === 'agenda' && (
          <>
            <MonthStepper
              label={formatMonthLabel(viewMonth)}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
            />

            <IosGroup>
              <IosRow title="Pedidos pendentes" trailing={String(pendingBookings.length)} />
              <IosRow title="Confirmadas no mês" trailing={String(monthConfirmedCount)} />
              <IosRow title="Receita confirmada" trailing={formatPrice(monthRevenueCents)} />
            </IosGroup>

            <div className="mt-6">
              <Segmented
                value={agendaView}
                onChange={setAgendaView}
                options={[
                  { value: 'proximas', label: 'Próximas' },
                  { value: 'historico', label: 'Histórico' },
                ]}
              />
            </div>

            {agendaView === 'proximas' &&
              (upcomingConfirmed.length === 0 ? (
                <EmptyState icon="bx bx-calendar" title="Sem sessões" text="Não há sessões confirmadas neste mês." />
              ) : (
                upcomingConfirmed.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    variant="confirmed"
                    busy={busyId === booking.id}
                    onDecision={handleBookingDecision}
                  />
                ))
              ))}

            {agendaView === 'historico' &&
              (history.length === 0 ? (
                <EmptyState icon="bx bx-history" title="Sem histórico" text="Ainda não há sessões passadas." />
              ) : (
                <IosGroup>
                  {history.map((booking) => (
                    <IosRow
                      key={booking.id}
                      title={booking.customerName}
                      subtitle={`${booking.service.name} · ${formatDateTime(booking.slot.startsAt)}`}
                      trailing={
                        <span
                          className={`text-[15px] ${
                            booking.status === 'ACCEPTED'
                              ? 'text-[#34c759]'
                              : booking.status === 'CANCELLED'
                                ? 'text-[#8e8e93]'
                                : 'text-[#ff3b30]'
                          }`}
                        >
                          {HISTORY_STATUS_LABEL[booking.status]}
                        </span>
                      }
                    />
                  ))}
                </IosGroup>
              ))}
          </>
        )}

        {/* ---------------- Horários ---------------- */}
        {tab === 'disponibilidade' && (
          <>
            <MonthStepper
              label={formatMonthLabel(viewMonth)}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
            />

            <form onSubmit={handleCreateSlots}>
              <IosGroup title="Novo horário">
                <div className="grid grid-cols-2 gap-3 px-4 py-3.5">
                  <div>
                    <FieldLabel>Data</FieldLabel>
                    <DatePicker value={newDate} onChange={setNewDate} triggerClassName={PICKER_CLASS} />
                  </div>
                  <div>
                    <FieldLabel>Hora</FieldLabel>
                    <TimePicker value={newTimeInput} onChange={setNewTimeInput} triggerClassName={PICKER_CLASS} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addTimeToBatch}
                  disabled={!newTimeInput}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-[17px] text-gold-deep active:bg-[#e5e5ea] disabled:text-[#c7c7cc]"
                >
                  <i className="bx bxs-plus-circle text-[26px]" aria-hidden="true" />
                  Adicionar horário
                </button>

                {batchTimes.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {batchTimes.map((time) => (
                      <span
                        key={time}
                        className="flex items-center gap-1.5 rounded-full bg-gold-deep/10 py-1 pl-3 pr-2 text-[15px] font-medium text-gold-deep"
                      >
                        {time}
                        <button
                          type="button"
                          onClick={() => removeTimeFromBatch(time)}
                          aria-label={`Remover ${time}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-deep/15"
                        >
                          <i className="bx bx-x" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3">
                  <IosButton type="submit" full disabled={addingSlot || !newDate || batchTimes.length === 0}>
                    {addingSlot
                      ? 'A criar...'
                      : batchTimes.length > 1
                        ? `Criar ${batchTimes.length} vagas`
                        : 'Criar vaga'}
                  </IosButton>
                </div>
              </IosGroup>
            </form>

            {slotsByDate.length === 0 && (
              <EmptyState icon="bx bx-time-five" title="Sem horários" text="Cria vagas para este mês acima." />
            )}

            {slotsByDate.map(([key, daySlots]) => {
              const parts = dateParts(daySlots[0].startsAt)
              return (
                <IosGroup
                  key={key}
                  title={`${parts.weekday.charAt(0).toUpperCase()}${parts.weekday.slice(1)}, ${parts.day} ${parts.month}`}
                >
                  {daySlots.map((slot) => (
                    <IosRow
                      key={slot.id}
                      title={dateParts(slot.startsAt).time}
                      trailing={
                        <span className="flex items-center gap-4">
                          <span
                            className={`text-[15px] ${
                              slot.status === 'OPEN'
                                ? 'text-[#34c759]'
                                : slot.status === 'PENDING'
                                  ? 'text-[#ff9500]'
                                  : 'text-[#8e8e93]'
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
                              className="text-[#ff3b30] active:opacity-50 disabled:opacity-40"
                            >
                              <i className="bx bxs-minus-circle text-[26px]" aria-hidden="true" />
                            </button>
                          )}
                        </span>
                      }
                    />
                  ))}
                </IosGroup>
              )
            })}

            {!clearingOpen ? (
              <IosGroup footer="Apaga todas as vagas e marcações do mês, permanentemente.">
                <IosRow
                  title={<span className="block text-center">Limpar dados de {formatMonthLabel(viewMonth)}</span>}
                  destructive
                  onClick={openClearPanel}
                />
              </IosGroup>
            ) : (
              <IosGroup title="Limpar mês">
                <div className="px-4 py-3.5">
                  <p className="text-[15px] leading-5 text-[#ff3b30]">
                    Isto apaga permanentemente {clearSummary ? clearSummary.slotCount : '...'} vaga(s) e{' '}
                    {clearSummary ? clearSummary.bookingCount : '...'} marcação(ões) de {formatMonthLabel(viewMonth)},
                    incluindo marcações já aceites. <strong>Não pode ser desfeito.</strong>
                  </p>
                  <div className="mt-3">
                    <FieldLabel>Confirma com a tua password</FieldLabel>
                    <input
                      type="password"
                      value={clearPassword}
                      onChange={(e) => setClearPassword(e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                  {clearError && <p className="mt-2 text-[15px] text-[#ff3b30]">{clearError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 px-4 py-3">
                  <IosButton
                    kind="tinted"
                    onClick={() => {
                      setClearingOpen(false)
                      setClearPassword('')
                      setClearError(null)
                    }}
                  >
                    Cancelar
                  </IosButton>
                  <IosButton kind="destructive" disabled={!clearPassword || clearBusy} onClick={handleClearMonth}>
                    {clearBusy ? 'A limpar...' : 'Apagar'}
                  </IosButton>
                </div>
              </IosGroup>
            )}
          </>
        )}

        {/* ---------------- Serviços ---------------- */}
        {tab === 'servicos' && (
          <>
            <IosGroup>
              {services.map((service) =>
                editingServiceId === service.id ? (
                  <div key={service.id} className="px-4 py-3.5">
                    <p className="text-[17px] font-semibold">{service.name}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label>
                        <FieldLabel>Duração</FieldLabel>
                        <input
                          value={editDuration}
                          onChange={(e) => setEditDuration(e.target.value)}
                          className={FIELD_CLASS}
                        />
                      </label>
                      <label>
                        <FieldLabel>Preço (€)</FieldLabel>
                        <input
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          inputMode="decimal"
                          className={FIELD_CLASS}
                        />
                      </label>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <IosButton kind="tinted" onClick={() => setEditingServiceId(null)}>
                        Cancelar
                      </IosButton>
                      <IosButton disabled={savingServiceId === service.id} onClick={() => saveServiceEdit(service)}>
                        {savingServiceId === service.id ? 'A guardar...' : 'Guardar'}
                      </IosButton>
                    </div>
                  </div>
                ) : (
                  <IosRow
                    key={service.id}
                    title={service.name}
                    subtitle={service.durationLabel}
                    trailing={formatPrice(service.priceCents)}
                    chevron
                    onClick={() => startEditService(service)}
                  />
                ),
              )}
            </IosGroup>

            {showAddService ? (
              <form onSubmit={handleCreateService}>
                <IosGroup title="Novo modelo">
                  <div className="grid gap-3 px-4 py-3.5 sm:grid-cols-2">
                    <label>
                      <FieldLabel>Nome</FieldLabel>
                      <input
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Ex: Twist Braids"
                        className={FIELD_CLASS}
                      />
                    </label>
                    <label>
                      <FieldLabel>Duração</FieldLabel>
                      <input
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        placeholder="Ex: 3-5h"
                        className={FIELD_CLASS}
                      />
                    </label>
                    <label className="sm:col-span-2">
                      <FieldLabel>Descrição</FieldLabel>
                      <input
                        value={newServiceDescription}
                        onChange={(e) => setNewServiceDescription(e.target.value)}
                        placeholder="Breve descrição para as clientes"
                        className={FIELD_CLASS}
                      />
                    </label>
                    <label>
                      <FieldLabel>Preço (€)</FieldLabel>
                      <input
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        inputMode="decimal"
                        placeholder="Ex: 65"
                        className={FIELD_CLASS}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3">
                    <IosButton kind="tinted" onClick={() => setShowAddService(false)}>
                      Cancelar
                    </IosButton>
                    <IosButton type="submit" disabled={addingService}>
                      {addingService ? 'A adicionar...' : 'Adicionar'}
                    </IosButton>
                  </div>
                </IosGroup>
              </form>
            ) : (
              <IosGroup>
                <button
                  type="button"
                  onClick={() => setShowAddService(true)}
                  className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-[17px] text-gold-deep active:bg-[#e5e5ea]"
                >
                  <i className="bx bxs-plus-circle text-[26px]" aria-hidden="true" />
                  Adicionar modelo de tranças
                </button>
              </IosGroup>
            )}
          </>
        )}

        {/* ---------------- Testemunhos ---------------- */}
        {tab === 'testemunhos' && (
          <>
            {pendingTestimonials.length === 0 ? (
              <EmptyState
                icon="bx bx-message-rounded-check"
                title="Tudo revisto"
                text="Não há testemunhos por rever."
              />
            ) : (
              pendingTestimonials.map((testimonial) => (
                <IosGroup key={testimonial.id}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <Avatar name={testimonial.customer.name} />
                    <p className="text-[17px] font-semibold">{testimonial.customer.name}</p>
                  </div>
                  <p className="px-4 py-3 text-[17px] leading-[22px]">“{testimonial.content}”</p>
                  <div className="grid grid-cols-2 gap-3 px-4 py-3">
                    <IosButton
                      kind="destructive"
                      disabled={busyId === testimonial.id}
                      onClick={() => handleTestimonialDecision(testimonial.id, 'reject')}
                    >
                      Recusar
                    </IosButton>
                    <IosButton
                      disabled={busyId === testimonial.id}
                      onClick={() => handleTestimonialDecision(testimonial.id, 'approve')}
                    >
                      Aprovar
                    </IosButton>
                  </div>
                </IosGroup>
              ))
            )}

            {resolvedTestimonials.length > 0 && (
              <IosGroup title="Já revistos">
                {resolvedTestimonials.map((testimonial) => (
                  <IosRow
                    key={testimonial.id}
                    title={testimonial.customer.name}
                    subtitle={`“${testimonial.content}”`}
                    trailing={
                      <span
                        className={`text-[15px] ${testimonial.status === 'APPROVED' ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}
                      >
                        {testimonial.status === 'APPROVED' ? 'Aprovado' : 'Recusado'}
                      </span>
                    }
                  />
                ))}
              </IosGroup>
            )}
          </>
        )}
      </main>

      <nav
        aria-label="Secções do painel"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-black/15 bg-[#f9f9f9]/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map(({ id, label, icon, iconActive }) => {
            const badge =
              id === 'pedidos' ? pendingBookings.length : id === 'testemunhos' ? pendingTestimonials.length : 0
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id)
                  window.scrollTo({ top: 0 })
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 pb-1.5 pt-1.5 ${
                  active ? 'text-gold-deep' : 'text-[#8e8e93]'
                }`}
              >
                <span className="relative text-[26px] leading-none">
                  <i className={active ? iconActive : icon} aria-hidden="true" />
                  {badge > 0 && (
                    <span className="absolute -right-3 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b30] px-1 text-[11px] font-semibold leading-none text-white">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium leading-3">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
