import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Link, useNavigate } from 'react-router-dom'
import { ActionButton } from '@/components/ui/action-button'
import { Button } from '@/components/ui/button'
import { MotionButton } from '@/components/ui/motion-button'
import { api, ApiError } from '@/lib/api'
import { downloadBookingIcs } from '@/lib/calendar'
import { fieldBorder, isCustomerApp } from '@/lib/app-mode'
import { useCustomerAuth } from '@/lib/customer-auth'
import { usePageTitle } from '@/lib/page-title'
import { useBusinessInfo } from '@/lib/site-config'
import { formatPrice, type AvailabilitySlot, type Booking } from '@/lib/types'

const LISBON_TZ = 'Europe/Lisbon'

function dateKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: LISBON_TZ })
}

function formatDateHeading(iso: string) {
  const label = new Date(iso).toLocaleDateString('pt-PT', {
    timeZone: LISBON_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-PT', { timeZone: LISBON_TZ, hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABEL: Record<Booking['status'], string> = {
  PENDING: 'Pendente',
  ACCEPTED: 'Confirmada',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
}

const STATUS_CLASS: Record<Booking['status'], string> = {
  PENDING: 'text-gold-ink',
  ACCEPTED: 'text-green-700',
  REJECTED: 'text-red-700',
  CANCELLED: 'text-onyx/40',
}

function ReschedulePicker({
  bookingId,
  onDone,
  onCancel,
}: {
  bookingId: string
  onDone: () => void
  onCancel: () => void
}) {
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<AvailabilitySlot[]>('/availability')
      .then(setSlots)
      .catch(() => setError('Não foi possível carregar horários.'))
  }, [])

  const slotsByDate = new Map<string, AvailabilitySlot[]>()
  for (const slot of slots ?? []) {
    const key = dateKey(slot.startsAt)
    const existing = slotsByDate.get(key) ?? []
    existing.push(slot)
    slotsByDate.set(key, existing)
  }
  const groups = [...slotsByDate.entries()].sort(([a], [b]) => a.localeCompare(b))

  async function handleConfirm() {
    if (!selectedSlotId) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post(`/account/bookings/${bookingId}/reschedule`, { slotId: selectedSlotId })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gold/20 bg-cream p-4">
      {slots === null ? (
        <p className="font-subtitle text-sm text-muted-dark">A carregar horários...</p>
      ) : groups.length === 0 ? (
        <p className="font-subtitle text-sm text-muted-dark">Sem horários disponíveis de momento.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([key, daySlots]) => (
            <div key={key}>
              <p className="font-subtitle text-xs uppercase tracking-wide text-muted-dark">
                {formatDateHeading(daySlots[0].startsAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {daySlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`inline-flex items-center justify-center rounded-full border px-4 py-1.5 font-subtitle text-sm transition-colors duration-300 ${
                      selectedSlotId === slot.id
                        ? 'border-gold-deep bg-gold-deep text-cream'
                        : 'border-gold/30 text-onyx hover:border-gold-deep'
                    }`}
                  >
                    {formatTime(slot.startsAt)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 font-subtitle text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex gap-2">
        <Button size="sm" disabled={!selectedSlotId || submitting} onClick={handleConfirm}>
          {submitting ? 'A confirmar...' : 'Confirmar novo horário'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
          Voltar
        </Button>
      </div>
    </div>
  )
}

function BookingCard({ booking, onChanged }: { booking: Booking; onChanged: () => void }) {
  const business = useBusinessInfo()
  const [rescheduling, setRescheduling] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canManage = booking.status === 'PENDING' || booking.status === 'ACCEPTED'

  async function handleCancel() {
    setBusy(true)
    setError(null)
    try {
      await api.post(`/account/bookings/${booking.id}/cancel`)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
      setBusy(false)
      setConfirmingCancel(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gold/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-subtitle text-base text-onyx">
            <span className="font-medium">{booking.service.name}</span> · {formatDateHeading(booking.slot.startsAt)} às{' '}
            {formatTime(booking.slot.startsAt)}
          </p>
          <p className="mt-1 font-logo text-lg text-gold-ink">{formatPrice(booking.service.priceCents)}</p>
        </div>
        <span className={`font-subtitle text-xs uppercase tracking-wide ${STATUS_CLASS[booking.status]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      {error && <p className="mt-3 font-subtitle text-sm text-red-700">{error}</p>}

      {canManage && !rescheduling && !confirmingCancel && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setRescheduling(true)}>
            Reagendar
          </Button>
          {!Capacitor.isNativePlatform() && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadBookingIcs({
                  serviceName: booking.service.name,
                  startsAtIso: booking.slot.startsAt,
                  durationLabel: booking.service.durationLabel,
                })
              }
            >
              Calendário
            </Button>
          )}
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmingCancel(true)}>
            Cancelar
          </Button>
        </div>
      )}

      {confirmingCancel && (
        <div className="mt-4 rounded-xl bg-cream p-4">
          <p className="font-subtitle text-sm text-onyx">
            Cancelar {booking.service.name} em {formatDateHeading(booking.slot.startsAt)} às{' '}
            {formatTime(booking.slot.startsAt)}? O horário fica livre para outra pessoa.
          </p>
          {business.cancellationPolicy && (
            <p className="mt-2 font-subtitle text-xs font-light text-muted-dark">{business.cancellationPolicy}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy} onClick={handleCancel}>
              {busy ? 'A cancelar...' : 'Sim, cancelar'}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmingCancel(false)}>
              Manter marcação
            </Button>
          </div>
        </div>
      )}

      {rescheduling && (
        <ReschedulePicker bookingId={booking.id} onDone={onChanged} onCancel={() => setRescheduling(false)} />
      )}
    </div>
  )
}

export function TestimonialForm() {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [showPhoto, setShowPhoto] = useState(true)

  // Offer to show the profile photo only when there is one.
  useEffect(() => {
    api
      .get<{ dataUrl: string | null }>('/account/avatar')
      .then((data) => setHasPhoto(!!data.dataUrl))
      .catch(() => {})
  }, [])

  async function handleSubmit() {
    if (content.trim().length < 10 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/account/testimonials', { content: content.trim(), showPhoto: hasPhoto && showPhoto })
      setSent(true)
      setContent('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tenta novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <p className="font-subtitle text-sm text-muted-dark">
        Obrigado! O teu testemunho foi enviado e vai aparecer na página assim que for revisto.
      </p>
    )
  }

  return (
    // Not a <form>: in the app this sits inside the sheet's own form, and a form inside a form is submitted by the
    // browser itself (a page reload) instead of reaching our handler.
    <div className="flex flex-col gap-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        maxLength={600}
        placeholder="Conta-nos como foi a tua experiência..."
        className={`rounded-xl ${fieldBorder} bg-white px-4 py-3 font-subtitle text-onyx outline-none transition-colors duration-300`}
      />
      {hasPhoto ? (
        <label className="flex items-start gap-3 font-subtitle text-sm text-onyx">
          <input
            type="checkbox"
            checked={showPhoto}
            onChange={(e) => setShowPhoto(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[#c9a84c]"
          />
          <span>
            Mostrar a minha foto de perfil junto ao testemunho
            <span className="block text-xs text-muted-dark">
              Só aparece depois de aprovado. Podes retirá-la quando quiseres.
            </span>
          </span>
        </label>
      ) : (
        <p className="font-subtitle text-xs text-muted-dark">
          Queres que a tua foto apareça no testemunho? Adiciona-a primeiro ao teu perfil.
        </p>
      )}
      {error && <p className="font-subtitle text-sm text-red-700">{error}</p>}
      <div>
        {isCustomerApp ? (
          <ActionButton
            label={submitting ? 'A enviar...' : 'Enviar testemunho'}
            disabled={content.trim().length < 10 || submitting}
            onClick={() => void handleSubmit()}
          />
        ) : (
          <MotionButton
            label={submitting ? 'A enviar...' : 'Enviar testemunho'}
            size="sm"
            type="button"
            disabled={content.trim().length < 10 || submitting}
            onClick={() => void handleSubmit()}
          />
        )}
      </div>
    </div>
  )
}

/**
 * `embedded`: rendered inside the customer app's tab shell. `section` then picks
 * which half of the page the tab shows — the bookings list or the account area.
 */
export default function AccountPage({
  embedded = false,
  section = 'all',
}: { embedded?: boolean; section?: 'all' | 'marcacoes' | 'conta' } = {}) {
  usePageTitle('A minha conta', { noindex: true })
  const { customer, loading, logout } = useCustomerAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[] | null>(null)

  useEffect(() => {
    if (!loading && !customer) {
      navigate('/entrar', { replace: true })
    }
  }, [loading, customer, navigate])

  const loadBookings = () => {
    api
      .get<Booking[]>('/account/bookings')
      .then(setBookings)
      .catch(() => setBookings([]))
  }

  useEffect(() => {
    if (customer) loadBookings()
  }, [customer])

  const pillClasses =
    'flex items-center rounded-full bg-white/95 shadow-lg shadow-black/10 backdrop-blur transition-shadow duration-500'

  if (loading || !customer) {
    return <div className="min-h-screen bg-white" />
  }

  const showBookings = !embedded || section !== 'conta'
  const showAccount = !embedded || section !== 'marcacoes'

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <motion.span
        aria-hidden="true"
        animate={{ opacity: [0.035, 0.07, 0.035], scale: [1, 1.04, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center whitespace-nowrap font-logo text-[20vw] leading-none tracking-tight text-onyx"
      >
        AFROGLOW
      </motion.span>

      {!embedded && (
        <div className="fixed inset-x-0 top-0 z-50 mt-[calc(1rem+env(safe-area-inset-top))] px-4 sm:mt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link to="/" className={`px-5 py-3 sm:px-6 ${pillClasses}`}>
              <span className="font-logo text-2xl leading-none tracking-wide text-gold-ink">AFROGLOW</span>
            </Link>

            <button
              type="button"
              onClick={() => void logout().then(() => navigate('/'))}
              className={`gap-2 px-5 py-3 text-sm text-onyx transition-colors duration-300 hover:text-gold-ink sm:px-6 ${pillClasses}`}
            >
              <span>Terminar sessão</span>
              <i className="bx bx-log-out text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <main
        className={`relative z-10 mx-auto max-w-3xl px-5 sm:px-8 ${
          embedded
            ? 'pb-36 pt-[calc(2.5rem+env(safe-area-inset-top))]'
            : 'pb-24 pt-[calc(7rem+env(safe-area-inset-top))] sm:pt-[calc(8rem+env(safe-area-inset-top))]'
        }`}
      >
        <h1 className="font-logo text-4xl text-onyx sm:text-5xl">
          {showBookings && embedded ? 'As minhas marcações' : `Olá, ${customer.name.split(' ')[0]}`}
        </h1>
        <p className="mt-4 font-subtitle text-lg font-light text-muted-dark">
          {showBookings && embedded ? 'Reagenda ou cancela as tuas sessões.' : 'A tua conta AFROGLOW.'}
        </p>

        {!embedded && (
          <div className="mt-6">
            <MotionButton
              label="Voltar ao início"
              size="sm"
              href="/"
              icon={<i className="bx bx-home-alt text-lg" aria-hidden="true" />}
            />
          </div>
        )}

        {showBookings && (
          <section className="mt-14">
            {!embedded && <h2 className="font-subtitle text-xl text-onyx sm:text-2xl">As minhas marcações</h2>}
            {bookings === null ? (
              <p className="mt-5 font-subtitle text-sm text-muted-dark">A carregar...</p>
            ) : bookings.length === 0 ? (
              <p className="mt-5 font-subtitle text-sm text-muted-dark">
                Ainda não tens marcações.{' '}
                <Link to={embedded ? '/marcar' : '/agendar'} className="text-gold-ink underline">
                  Marca a tua primeira sessão
                </Link>
                .
              </p>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                {bookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} onChanged={loadBookings} />
                ))}
              </div>
            )}
          </section>
        )}

        {showAccount && (
          <section className={embedded ? 'mt-10' : 'mt-16'}>
            <h2 className="font-subtitle text-xl text-onyx sm:text-2xl">Deixar um testemunho</h2>
            <p className="mt-2 font-subtitle text-sm font-light text-muted-dark">
              Conta como foi o teu atendimento. Depois de aprovado, aparece na página principal com o teu nome.
            </p>
            <div className="mt-6">
              <TestimonialForm />
            </div>
          </section>
        )}

        {embedded && showAccount && (
          <section className="mt-12 border-t border-gold/20 pt-8">
            <button
              type="button"
              onClick={() => void logout().then(() => navigate('/'))}
              className="flex items-center gap-2 font-subtitle text-sm text-muted-dark transition-colors hover:text-onyx"
            >
              <i className="bx bx-log-out text-lg" aria-hidden="true" />
              Terminar sessão
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
