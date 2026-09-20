import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { formatPrice, type AvailabilitySlot, type Booking } from '@/lib/types'

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

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [adminEmail, setAdminEmail] = useState<string | null>(null)

  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState<string | null>(null)

  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const [slotsData, bookingsData] = await Promise.all([
        api.get<AvailabilitySlot[]>('/admin/availability'),
        api.get<Booking[]>('/admin/bookings'),
      ])
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

  async function handleAddSlot(e: FormEvent) {
    e.preventDefault()
    if (!newDate || !newTime) return
    setAddingSlot(true)
    setError(null)
    try {
      const startsAt = new Date(`${newDate}T${newTime}:00`).toISOString()
      await api.post('/admin/availability', { startsAt })
      setNewDate('')
      setNewTime('')
      await loadDashboard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar vaga.')
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

  async function handleBookingDecision(id: string, decision: 'accept' | 'reject') {
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

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>()
    for (const slot of slots) {
      const key = dateKey(slot.startsAt)
      const existing = groups.get(key) ?? []
      existing.push(slot)
      groups.set(key, existing)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [slots])

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING')
  const resolvedBookings = bookings.filter((b) => b.status !== 'PENDING')

  if (checkingAuth) {
    return <div className="flex min-h-screen items-center justify-center bg-white font-body text-muted-dark">A verificar sessão...</div>
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between border-b border-gold/20 px-5 py-5 sm:px-8">
        <div>
          <h1 className="font-display text-2xl italic">Painel de Admin</h1>
          <p className="font-body text-xs text-muted-dark">{adminEmail}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sair
        </Button>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        {error && <p className="mb-8 font-body text-sm text-red-700">{error}</p>}

        <section>
          <h2 className="font-display text-2xl italic">Disponibilidade</h2>
          <form onSubmit={handleAddSlot} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">Data</span>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="border border-gold/30 px-3 py-2 font-body text-sm outline-none focus-visible:border-gold-deep"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">Hora</span>
              <input
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="border border-gold/30 px-3 py-2 font-body text-sm outline-none focus-visible:border-gold-deep"
              />
            </label>
            <Button type="submit" size="sm" disabled={addingSlot}>
              {addingSlot ? 'A adicionar...' : 'Adicionar vaga'}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-4">
            {slotsByDate.length === 0 && <p className="font-body text-sm text-muted-dark">Sem vagas criadas.</p>}
            {slotsByDate.map(([key, daySlots]) => (
              <div key={key}>
                <p className="font-ui text-xs uppercase tracking-wide text-muted-dark">{key}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center gap-2 border border-gold/30 px-3 py-1.5 font-body text-sm"
                    >
                      <span>{formatDateTime(slot.startsAt).split(', ').slice(1).join(', ')}</span>
                      <span className="font-ui text-xs uppercase tracking-wide text-muted-dark">
                        {SLOT_STATUS_LABEL[slot.status]}
                      </span>
                      {slot.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.id)}
                          disabled={busyId === slot.id}
                          aria-label="Remover vaga"
                          className="text-muted-dark hover:text-red-700"
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
          <h2 className="font-display text-2xl italic">Marcações pendentes</h2>
          {pendingBookings.length === 0 ? (
            <p className="mt-4 font-body text-sm text-muted-dark">Sem marcações pendentes.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {pendingBookings.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 border border-gold/30 p-4">
                  <div>
                    <p className="font-body text-sm">
                      <strong>{booking.customerName}</strong> · {booking.customerPhone}
                    </p>
                    <p className="mt-1 font-body text-sm text-muted-dark">
                      {booking.service.name} ({formatPrice(booking.service.priceCents)}) ·{' '}
                      {formatDateTime(booking.slot.startsAt)}
                    </p>
                    {booking.notes && <p className="mt-1 font-body text-xs text-muted-dark">"{booking.notes}"</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === booking.id}
                      onClick={() => handleBookingDecision(booking.id, 'accept')}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === booking.id}
                      onClick={() => handleBookingDecision(booking.id, 'reject')}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl italic">Histórico</h2>
          {resolvedBookings.length === 0 ? (
            <p className="mt-4 font-body text-sm text-muted-dark">Ainda sem histórico.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              {resolvedBookings.map((booking) => (
                <div key={booking.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 py-3">
                  <p className="font-body text-sm text-muted-dark">
                    {booking.customerName} · {booking.service.name} · {formatDateTime(booking.slot.startsAt)}
                  </p>
                  <span
                    className={`font-ui text-xs uppercase tracking-wide ${
                      booking.status === 'ACCEPTED' ? 'text-gold-deep' : 'text-red-700'
                    }`}
                  >
                    {booking.status === 'ACCEPTED' ? 'Aceite' : 'Recusada'}
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
