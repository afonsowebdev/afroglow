import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { MotionButton } from '@/components/ui/motion-button'
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

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="font-subtitle text-xl text-onyx sm:text-2xl">{children}</h2>
}

type AdminTab = 'pedidos' | 'agenda' | 'disponibilidade' | 'servicos' | 'testemunhos'

const TABS: Array<{ id: AdminTab; label: string; icon: string }> = [
  { id: 'pedidos', label: 'Pedidos', icon: 'bx bx-bell' },
  { id: 'agenda', label: 'Agenda', icon: 'bx bx-calendar-check' },
  { id: 'disponibilidade', label: 'Disponibilidade', icon: 'bx bx-time-five' },
  { id: 'servicos', label: 'Serviços', icon: 'bx bx-cut' },
  { id: 'testemunhos', label: 'Testemunhos', icon: 'bx bx-message-rounded-dots' },
]

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gold/20 bg-cream px-5 py-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lg text-gold-deep">
        <i className={icon} aria-hidden="true" />
      </span>
      <div>
        <p className="font-logo text-2xl text-onyx">{value}</p>
        <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)
  const [tab, setTab] = useState<AdminTab>('pedidos')
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
    <div className="min-h-screen bg-white">
      <div className="fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
            <span className="font-logo text-2xl leading-none tracking-wide text-gold-deep">AFROGLOW</span>
          </div>

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

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-8 sm:pt-[calc(8rem+env(safe-area-inset-top))]">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">Painel de Admin</h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">{adminEmail}</p>

        {error && <p className="mt-6 font-subtitle text-sm text-red-700">{error}</p>}

        <nav
          aria-label="Secções do painel"
          className="-mx-5 mt-10 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max gap-1 rounded-full border border-gold/20 bg-cream p-1 sm:w-full">
            {TABS.map(({ id, label, icon }) => {
              const badge =
                id === 'pedidos' ? pendingBookings.length : id === 'testemunhos' ? pendingTestimonials.length : 0
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? 'page' : undefined}
                  className="relative flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 font-subtitle text-sm sm:flex-1"
                >
                  {tab === id && (
                    <motion.span
                      layoutId="admin-tab-pill"
                      className="absolute inset-0 rounded-full bg-gold-deep shadow-md shadow-gold-deep/30"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span
                    className={`relative flex items-center gap-2 transition-colors duration-300 ${
                      tab === id ? 'text-cream' : 'text-onyx/60 hover:text-onyx'
                    }`}
                  >
                    <i className={icon} aria-hidden="true" />
                    {label}
                    {badge > 0 && (
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none ${
                          tab === id ? 'bg-cream text-gold-deep' : 'bg-gold-deep text-cream'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        {(tab === 'agenda' || tab === 'disponibilidade') && (
          <div className="mt-6 flex items-center justify-center gap-4 rounded-full border border-gold/20 bg-cream px-4 py-2 sm:justify-start">
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
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard icon="bx bx-time-five" label="Marcações pendentes" value={String(pendingBookings.length)} />
            <StatCard icon="bx bx-calendar-check" label="Confirmadas no mês" value={String(monthConfirmedCount)} />
            <StatCard icon="bx bx-euro" label="Receita confirmada no mês" value={formatPrice(monthRevenueCents)} />
          </div>
        )}

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
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
            <section className="mt-8">
              <SectionHeading>Disponibilidade</SectionHeading>
              <form
                onSubmit={handleCreateSlots}
                className="mt-6 flex flex-col gap-4 rounded-2xl border border-gold/20 p-5"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Data</span>
                    <DatePicker value={newDate} onChange={setNewDate} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Hora</span>
                    <TimePicker value={newTimeInput} onChange={setNewTimeInput} />
                  </label>
                  <button
                    type="button"
                    onClick={addTimeToBatch}
                    disabled={!newTimeInput}
                    className="flex h-11 items-center gap-1.5 rounded-full border border-gold/30 px-4 font-subtitle text-sm text-onyx transition-colors duration-300 hover:border-gold-deep disabled:opacity-40"
                  >
                    <i className="bx bx-plus" aria-hidden="true" />
                    Adicionar horário
                  </button>
                </div>

                {batchTimes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {batchTimes.map((time) => (
                      <span
                        key={time}
                        className="flex items-center gap-2 rounded-full bg-cream px-3 py-1.5 font-subtitle text-sm text-onyx"
                      >
                        {time}
                        <button
                          type="button"
                          onClick={() => removeTimeFromBatch(time)}
                          aria-label={`Remover ${time}`}
                          className="text-muted-dark transition-colors hover:text-red-700"
                        >
                          <i className="bx bx-x" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div>
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

              <div className="mt-6 flex flex-col gap-4">
                {slotsByDate.length === 0 && (
                  <p className="font-subtitle text-sm text-muted-dark">Sem vagas criadas.</p>
                )}
                {slotsByDate.map(([key, daySlots]) => (
                  <div key={key}>
                    <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">{key}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center gap-2 rounded-full border border-gold/30 px-4 py-1.5 font-subtitle text-sm text-onyx"
                        >
                          <span>{formatDateTime(slot.startsAt).split(', ').slice(1).join(', ')}</span>
                          <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                            {SLOT_STATUS_LABEL[slot.status]}
                          </span>
                          {slot.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(slot.id)}
                              disabled={busyId === slot.id}
                              aria-label="Remover vaga"
                              className="text-muted-dark transition-colors hover:text-red-700"
                            >
                              <i className="bx bx-x text-lg" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

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
                        className="rounded-full px-4 py-2 font-subtitle text-sm text-muted-dark transition-colors hover:bg-cream hover:text-onyx"
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
                          variant="danger"
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

          {tab === 'agenda' && (
            <section className="mt-8">
              <SectionHeading>Próximas sessões confirmadas</SectionHeading>
              {upcomingConfirmed.length === 0 ? (
                <p className="mt-5 font-subtitle text-sm text-muted-dark">Sem sessões confirmadas agendadas.</p>
              ) : (
                <div className="mt-6 flex flex-col gap-3">
                  {upcomingConfirmed.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/20 bg-cream p-5"
                    >
                      <div>
                        <p className="flex flex-wrap items-center gap-2 font-subtitle text-base text-onyx">
                          <span className="font-medium">{booking.customerName}</span>
                          <a
                            href={customerWhatsappUrl(
                              booking.customerPhone,
                              `Olá ${booking.customerName}! Sobre a tua sessão de ${booking.service.name}...`,
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
                          {booking.service.name} · {formatDateTime(booking.slot.startsAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === booking.id}
                        onClick={() => handleBookingDecision(booking.id, 'cancel')}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'agenda' && (
            <section className="mt-14">
              <SectionHeading>Histórico</SectionHeading>
              {history.length === 0 ? (
                <p className="mt-5 font-subtitle text-sm text-muted-dark">Ainda sem histórico.</p>
              ) : (
                <div className="mt-6 flex flex-col gap-2">
                  {history.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 py-3"
                    >
                      <p className="font-subtitle text-sm text-muted-dark">
                        {booking.customerName} · {booking.service.name} · {formatDateTime(booking.slot.startsAt)}
                      </p>
                      <span
                        className={`font-subtitle text-xs uppercase tracking-wide ${
                          booking.status === 'ACCEPTED'
                            ? 'text-gold-deep'
                            : booking.status === 'CANCELLED'
                              ? 'text-muted-dark'
                              : 'text-red-700'
                        }`}
                      >
                        {HISTORY_STATUS_LABEL[booking.status]}
                      </span>
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
                          variant="danger"
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
        </motion.div>
      </main>
    </div>
  )
}
