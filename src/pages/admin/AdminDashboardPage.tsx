import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { MotionButton } from '@/components/ui/motion-button'
import { TimePicker } from '@/components/ui/time-picker'
import { api, ApiError } from '@/lib/api'
import { customerWhatsappUrl } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking, type Service } from '@/lib/types'

const LISBON_TZ = 'Europe/Lisbon'

function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: LISBON_TZ })
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

function SectionHeading({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-logo text-sm text-gold-deep">{number}</span>
      <h2 className="font-subtitle text-xl text-onyx sm:text-2xl">{children}</h2>
    </div>
  )
}

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
  const [scrolled, setScrolled] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const loadDashboard = useCallback(async () => {
    try {
      const [servicesData, slotsData, bookingsData] = await Promise.all([
        api.get<Service[]>('/services'),
        api.get<AvailabilitySlot[]>('/admin/availability'),
        api.get<Booking[]>('/admin/bookings'),
      ])
      setServices(servicesData)
      setSlots(slotsData)
      setBookings(bookingsData)
    } catch {
      setError('Não foi possível carregar os dados do painel.')
    }
  }, [])

  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await api.get<{ email: string }>('/auth/me')
        setAdminEmail(me.email)
        await loadDashboard()
      } catch {
        navigate('/admin/login')
      } finally {
        setCheckingAuth(false)
      }
    }
    void checkAuth()
  }, [navigate, loadDashboard])

  async function handleLogout() {
    await api.post('/auth/logout')
    navigate('/admin/login')
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

  const slotsByDate = (() => {
    const groups = new Map<string, AvailabilitySlot[]>()
    for (const slot of slots) {
      const key = dateKey(slot.startsAt)
      const existing = groups.get(key) ?? []
      existing.push(slot)
      groups.set(key, existing)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  })()

  const nowMs = Date.now()
  const pendingBookings = bookings.filter((b) => b.status === 'PENDING')
  const upcomingConfirmed = bookings
    .filter((b) => b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime())
  const history = bookings
    .filter(
      (b) =>
        b.status === 'REJECTED' ||
        b.status === 'CANCELLED' ||
        (b.status === 'ACCEPTED' && new Date(b.slot.startsAt).getTime() < nowMs),
    )
    .sort((a, b) => new Date(b.slot.startsAt).getTime() - new Date(a.slot.startsAt).getTime())

  const weekAheadMs = nowMs + 7 * 24 * 60 * 60 * 1000
  const confirmedThisWeekCount = upcomingConfirmed.filter((b) => new Date(b.slot.startsAt).getTime() <= weekAheadMs).length

  const currentMonth = new Date()
  const monthRevenueCents = bookings
    .filter((b) => {
      if (b.status !== 'ACCEPTED') return false
      const d = new Date(b.slot.startsAt)
      return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth()
    })
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
      <div className="fixed inset-x-0 top-0 z-50 mt-4 px-4 sm:mt-6 sm:px-6">
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

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">Painel de Admin</h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">{adminEmail}</p>

        {error && <p className="mt-6 font-subtitle text-sm text-red-700">{error}</p>}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard icon="bx bx-time-five" label="Marcações pendentes" value={String(pendingBookings.length)} />
          <StatCard icon="bx bx-calendar-check" label="Confirmadas esta semana" value={String(confirmedThisWeekCount)} />
          <StatCard icon="bx bx-euro" label="Receita confirmada este mês" value={formatPrice(monthRevenueCents)} />
        </div>

        <section className="mt-16">
          <SectionHeading number="01">Serviços e preços</SectionHeading>
          <div className="mt-6 flex flex-col gap-3">
            {services.map((service) => {
              const isEditing = editingServiceId === service.id
              return (
                <div key={service.id} className="rounded-2xl border border-gold/20 p-5">
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1.5">
                          <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Duração</span>
                          <input
                            value={editDuration}
                            onChange={(e) => setEditDuration(e.target.value)}
                            className="rounded-xl border border-gold/30 px-3 py-2.5 font-subtitle text-sm text-onyx outline-none focus-visible:border-gold-deep"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5">
                          <span className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">Preço (€)</span>
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
                        <p className="mt-0.5 font-logo text-xs tracking-wide text-muted-dark">{service.durationLabel}</p>
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
        </section>

        <section className="mt-16">
          <SectionHeading number="02">Disponibilidade</SectionHeading>
          <form onSubmit={handleCreateSlots} className="mt-6 flex flex-col gap-4 rounded-2xl border border-gold/20 p-5">
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
                label={addingSlot ? 'A criar...' : batchTimes.length > 1 ? `Criar ${batchTimes.length} vagas` : 'Criar vaga'}
                size="sm"
                type="submit"
                disabled={addingSlot || !newDate || batchTimes.length === 0}
              />
            </div>
          </form>

          <div className="mt-6 flex flex-col gap-4">
            {slotsByDate.length === 0 && <p className="font-subtitle text-sm text-muted-dark">Sem vagas criadas.</p>}
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
        </section>

        <section className="mt-16">
          <SectionHeading number="03">Marcações pendentes</SectionHeading>
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

        <section className="mt-16">
          <SectionHeading number="04">Próximas sessões confirmadas</SectionHeading>
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

        <section className="mt-16">
          <SectionHeading number="05">Histórico</SectionHeading>
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
      </main>
    </div>
  )
}
